const https = require('https');
const fs = require('fs');
const url = require('url');
const { v3: uuidv3 } = require('/usr/local/lib/node_modules/uuid');
const { v5: uuidv5 } = require('/usr/local/lib/node_modules/uuid');

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

server = https.createServer(options, (req, res) => {
  log(`Request to ${req.url}`);
  parsedUrl = url.parse(req.url, true);
  value = parsedUrl.query.value || '';
  // log(`Value for uuid generator is '${value}'`);

  if (parsedUrl.pathname == '/v3') {
    res.writeHead(200);
    res.write(uuidv3(value, BASE_UUID));
    ++uuidv3_counter;
  } else if (parsedUrl.pathname == '/v5') {
    res.writeHead(200);
    res.write(uuidv5(value, BASE_UUID));
    ++uuidv5_counter;
  } else if (parsedUrl.pathname == '/health') {
    if (true /* TODO */) {
      res.writeHead(200);
      res.write('OK\n');
    } else {
      res.write('http 503\n');
      ++http503_counter;
    }
  } else if (parsedUrl.pathname == '/metrics') {
    res.writeHead(200);
    res.write(`uuidv3_requests{count="${uuidv3_counter}"}\nuuidv5_requests{count="${uuidv5_counter}"}\nhttp503_responses{count="${http503_counter}"}\nhttp404_responses{count="${http404_counter}"}\n`);
  } else {
    res.writeHead(404);
    res.write('http 404\n');
    ++http404_counter;
  }

  res.end();
});

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

server.listen(PORT, () => {
  log('Server running...');
});

