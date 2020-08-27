const { expose } = require('/usr/local/lib/node_modules/threads/worker');
const url = require('url');
const fs = require('fs');
const { v3: uuidv3, v4: uuidv4, v5: uuidv5, validate: validateUuid } = require('/usr/local/lib/node_modules/uuid');

// function f(countersBuf) {
//   try {
//     view = new BigUint64Array(countersBuf);
//     Atomics.add(view, 1, 1n);
//     console.log(`Hi! I\'m worker!\n`);
//   } catch (err) {
//     console.log(err);
//   }
// }

const BASE_UUID = process.env.BASE_UUID || (() => { throw 'BASE_UUID not defined' })();
const LOG_PATH = (process.env.LOG_PATH || (() => { throw 'LOG_PATH not defined' })()) + '_' + new Date().toISOString(); // вести лог в каталоге хоста
var counters; // [0] = v3, [1] = v5, [2] = http503, [3] = http404
function log(str) {
  str = `${new Date().toISOString()} - ${str}`;
  console.log(str);
  fs.writeFile(LOG_PATH, str + '\n', { flag: 'a' }, (err) => {
    if (err) {
      console.log('Error when attempted write to log file!\n');
    }
  });
}

function v3_handler(value) {
  Atomics.add(counters, 0, 1n); // не увеличивать при ошибке
  return uuidv3(value, BASE_UUID);
}

function v5_handler(value) {
  Atomics.add(counters, 1, 1n);
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
  return `uuidv3_requests{count="${Atomics.load(counters, 0)}"}\nuuidv5_requests{count="${Atomics.load(counters, 1)}"}\nhttp503_responses{count="${Atomics.load(counters, 2)}"}\nhttp404_responses{count="${Atomics.load(counters, 3)}"}\n`;
}

// function sendResponse(code, res, headers, data) {
//   switch (code) {
//     case 404:
//       Atomics.add(counters, 3, 1n);
//       break;
//     case 503:
//       Atomics.add(counters, 2, 1n);
//   }
//   res.writeHead(code, headers);
//   res.end(data);
// }

function chooseRequestHandler(reqUrl, countersBuf) {
  counters = new BigUint64Array(countersBuf);
  log(`Request to ${reqUrl}`);
  parsedUrl = url.parse(reqUrl, true);
  value = parsedUrl.query.value || '';

  try {
    switch (parsedUrl.pathname) {
      case '/v3':
        return {code: 200, data: v3_handler(value)};
        // sendResponse(200, res, headers, v3_handler(value))
        // break;
      case '/v5':
        return {code: 200, data: v5_handler(value)};
        // sendResponse(200, res, headers, v5_handler(value))
        // break;
      case '/health':
        return {code: 200, data: health_handler()};
        // sendResponse(200, res, headers, health_handler());
        // break;
      case '/metrics':
        return {code: 200, data: metrics_handler()};
        // sendResponse(200, res, headers, metrics_handler());
        // break;
      default:
        Atomics.add(counters, 3, 1n); // TODO: http404_handler which inc 404counter
        return {code: 404, data: 'http 404'};
        // sendResponse(404, res, headers, 'http 404');
    }
  } catch (err) {
    log(err); // логировать все исключения
    Atomics.add(counters, 2, 1n); // TODO: http503_handler which inc 503counter
    return {code: 503, data: 'http 503'};
    // sendResponse(503, res, headers, 'http 503');
  }
}

expose(chooseRequestHandler);
