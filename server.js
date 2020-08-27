"use strict";

const https = require('https');
const fs = require('fs');
const { v4: uuidv4 } = require('/usr/local/lib/node_modules/uuid');
const { spawn, Thread, Worker } = require('/usr/local/lib/node_modules/threads');
const { LOG_PATH, log } = require('./header');

const PORT = 443;
let countersBuf = new SharedArrayBuffer(4 * 8); // 4 x BigUint64Array
let countersView = new BigUint64Array(countersBuf);
const counters = fs.readFileSync('counters.txt', 'utf8').split(' ');
countersView[0] = BigInt(counters[0]);
countersView[1] = BigInt(counters[1]);
countersView[2] = BigInt(counters[2]);
countersView[3] = BigInt(counters[3]);

log(`Log file is ${LOG_PATH}`);
log(`CountersView contains ${countersView[0]} ${countersView[1]} ${countersView[2]} ${countersView[3]}`);

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

let server = https.createServer(options, requestListener);

let workers = new Map();
async function selectWorker(clientID) {
  if (!workers.has(clientID)) {
    workers.set(clientID, await spawn(new Worker('./requestHandlers')));
  }

  return workers.get(clientID);
}

// different signals working in different threads. TODO: atomic access to shuttingDown
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) {
    return false; // didn't stopped
  }
  shuttingDown = true;
  log('Shutting down');
  server.close();

  workers.forEach(async function (worker, key, map) {
    await Thread.terminate(worker);
  });

  fs.writeFileSync("counters.txt", `${countersView[0]} ${countersView[1]} ${countersView[2]} ${countersView[3]}\n`);
  log(`counters.txt now contains ${countersView[0]} ${countersView[1]} ${countersView[2]} ${countersView[3]}`);
  return true; // stopped
}

process.on('exit', async function () {
  if (await shutdown())
    log('APP STOPPED exit');
});
process.on('SIGINT', async function () {
  if (await shutdown())
    log('APP STOPPED SIGINT');
});
process.on('SIGUSR1', async function () {
  if (await shutdown())
    log('APP STOPPED SIGUSR2');
});
process.on('SIGUSR2', async function () {
  if (await shutdown())
    log('APP STOPPED SIGUSR2');
});
process.on('SIGTERM', async function () {
  if (await shutdown())
    log('APP STOPPED SIGTERM');
});

async function requestListenerImpl(req, res) {
  let clientID, headers = {};
  let matchRes = (req.headers.cookie || '').match(/(?:^|; )clientID=(?<id>.+?)(?:;|$)/);
  if (matchRes) {
    clientID = matchRes.groups.id;
  } else {
    log('New client detected!');
    clientID = uuidv4();
    headers = { 'Set-Cookie': `clientID=${clientID}` };
  }

  // await until 1) the worker is created 2) while the worker is running
  const { code, data } = await (await selectWorker(clientID))(req.url, countersBuf);
  res.writeHead(code, headers);
  res.end(data);
}

function requestListener(req, res) {
  requestListenerImpl(req, res); // don't await, discard promise
}

server.listen(PORT, () => {
  log('Server running...');
});
