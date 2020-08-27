// про kurernetes yaml не забыть
// имена переменных вылизать

const https = require('https');
const fs = require('fs');
const { v3: uuidv3, v4: uuidv4, v5: uuidv5, validate: validateUuid } = require('/usr/local/lib/node_modules/uuid');
const { spawn, Thread, Worker } = require('/usr/local/lib/node_modules/threads');

// const BASE_UUID = process.env.BASE_UUID || (() => { throw 'BASE_UUID not defined' })(); // вынести общее в отдельный файл
const LOG_PATH = (process.env.LOG_PATH || (() => { throw 'LOG_PATH not defined' })()) + '_' + new Date().toISOString(); // вести лог в каталоге хоста
const PORT = 443;
const counters = fs.readFileSync('counters.txt', 'utf8').split(' '); // TODO: load to countersBuf
// uuidv3_counter = parseInt(counters[0]);
// uuidv5_counter = parseInt(counters[1]);
// http503_counter = parseInt(counters[2]);
// http404_counter = parseInt(counters[3]);
countersBuf = new SharedArrayBuffer(4 * 8); // 4 x BigUint64Array

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
  // fs.writeFileSync("counters.txt", `${uuidv3_counter} ${uuidv5_counter} ${http503_counter} ${http404_counter}\n`); // TODO: save from countersBuf
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


workers = new Map();
async function selectWorker(clientID) {
  if (!workers.has(clientID)) {
    workers.set(clientID, await spawn(new Worker('./requestHandlers')));
  }
  
  return workers.get(clientID);
}

async function requestListenerImpl(req, res) {
  headers = {};
  matchRes = (req.headers.cookie || '').match(/(?:^|; )clientID=(?<id>.+?)(?:;|$)/);
  if (matchRes) {
    clientID = matchRes.groups.id;
  } else {
    log('undefined cookie deteceted!');
    clientID = uuidv4();
    headers = { 'Set-Cookie': `clientID=${clientID}` };
  }

  // ждём 1) создание воркера 2) завершение работы воркера
  const {code, data} = await (await selectWorker(clientID))(req.url, countersBuf);
  res.writeHead(code, headers);
  res.end(data);
}

function requestListener(req, res) {
  requestListenerImpl(req, res); // don't await, discard promise
}

https.createServer(options, requestListener).listen(PORT, () => {
  log('Server running...');
});

