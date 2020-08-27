const https = require('https');
const fs = require('fs');
const url = require('url');
const { v3: uuidv3, v4: uuidv4, v5: uuidv5, validate: validateUuid } = require('/usr/local/lib/node_modules/uuid');
const { spawn, Thread, Worker } = require('/usr/local/lib/node_modules/threads');

const BASE_UUID = process.env.BASE_UUID || (() => { throw 'BASE_UUID not defined' })();
const LOG_PATH = (process.env.LOG_PATH || (() => { throw 'LOG_PATH not defined' })()) + '_' + new Date().toISOString();
const PORT = 443;
const counters = fs.readFileSync('counters.txt', 'utf8').split(' ');
uuidv3_counter = parseInt(counters[0]);
uuidv5_counter = parseInt(counters[1]);
http503_counter = parseInt(counters[2]);
http404_counter = parseInt(counters[3]);

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

function log(str) {
  str = `${new Date().toISOString()} - ${str}`;
  console.log(str);
  fs.writeFile(LOG_PATH, str + '\n', { flag: 'a' }, (err) => {
    if (err) {
      console.log('Error when attempted write to log file!\n');
    }
  });
}
log(`Log file is ${LOG_PATH}`);

shutting_down = false;
function shutdown() {
  shutting_down = true;
  log('Shutting down');
  fs.writeFileSync("counters.txt", `${uuidv3_counter} ${uuidv5_counter} ${http503_counter} ${http404_counter}\n`);
  process.exit(0);
}

process.on('exit', () => {
  if (!shutting_down) {
    log('APP STOPPED exit');
    shutdown();
  }
});
process.on('SIGINT', () => {
  log('APP STOPPED SIGINT');
  shutdown();
});
process.on('SIGUSR1', () => {
  log('APP STOPPED SIGUSR2');
  shutdown();
});
process.on('SIGUSR2', () => {
  log('APP STOPPED SIGUSR2');
  shutdown();
});
process.on('SIGTERM', () => {
  log('APP STOPPED SIGTERM');
  shutdown();
});

function v3_handler(value) {
  ++uuidv3_counter;
  return uuidv3(value, BASE_UUID);
}

function v5_handler(value) {
  ++uuidv5_counter;
  return uuidv5(value, BASE_UUID);
}

function health_handler() {
  if (validateUuid(BASE_UUID)) {
    return 'OK';
  } else {
    throw 'Bad BASE_UUID';
  }
}

function metrics_handler() {
  return `uuidv3_requests{count="${uuidv3_counter}"}\nuuidv5_requests{count="${uuidv5_counter}"}\nhttp503_responses{count="${http503_counter}"}\nhttp404_responses{count="${http404_counter}"}\n`;
}

function sendResponse(code, res, headers, data) {
  switch (code) {
    case 404:
      ++http404_counter;
      break;
    case 503:
      ++http503_counter;
  }
  res.writeHead(code, headers);
  res.end(data);
}

function chooseRequestHandler(req, headers, res) {
  log(`Request to ${req.url}`);
  parsedUrl = url.parse(req.url, true);
  value = parsedUrl.query.value || '';

  try {
    switch (parsedUrl.pathname) {
      case '/v3':
        sendResponse(200, res, headers, v3_handler(value))
        break;
      case '/v5':
        sendResponse(200, res, headers, v5_handler(value))
        break;
      case '/health':
        sendResponse(200, res, headers, health_handler());
        break;
      case '/metrics':
        sendResponse(200, res, headers, metrics_handler());
        break;
      default:
        sendResponse(404, res, headers, 'http 404');
    }
  } catch (err) {
    sendResponse(503, res, headers, 'http 503');
  }
}

function selectWorker(clientID) {
  return chooseRequestHandler; // TODO normal impl    and atomic counters. (or is it better to sum many instances in metrics_handler?)     разобраться как коммитить через терминал (в отдельной директории)
}

function requestListener(req, res) {
  headers = {};
  matchRes = (req.headers.cookie || '').match(/(?:^|; )clientID=(?<id>.+?)(?:;|$)/);
  if (matchRes) {
    clientID = matchRes.groups.id;
  } else {
    log('undefined cookie deteceted!');
    clientID = uuidv4();
    headers = { 'Set-Cookie': `clientID=${clientID}` };
  }

  selectWorker(clientID)(req, headers, res); // don't await, discard promise
}

https.createServer(options, requestListener).listen(PORT, () => {
  log('Server running...');
});

