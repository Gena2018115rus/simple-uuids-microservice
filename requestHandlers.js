"use strict";

const { expose } = require('/usr/local/lib/node_modules/threads/worker');
const url = require('url');
const { v3: uuidv3, v5: uuidv5, validate: validateUuid } = require('/usr/local/lib/node_modules/uuid');
const { log } = require('./header');

const BASE_UUID = process.env.BASE_UUID || (() => { throw log('!!! BASE_UUID not defined !!!') })();
let counters; // [0] = v3, [1] = v5, [2] = http503, [3] = http404

function v3Handler(value) {
  let tmp = uuidv3(value, BASE_UUID); // can throw
  Atomics.add(counters, 0, 1n);
  return tmp;
}

function v5Handler(value) {
  let tmp = uuidv5(value, BASE_UUID) // can throw
  Atomics.add(counters, 1, 1n);
  return tmp;
}

function healthHandler() {
  if (validateUuid(BASE_UUID)) {
    return 'OK';
  } else {
    throw 'Bad BASE_UUID';
  }
}

function metricsHandler() {
  return `uuidv3_requests{count="${Atomics.load(counters, 0)}"}\nuuidv5_requests{count="${Atomics.load(counters, 1)}"}\nhttp503_responses{count="${Atomics.load(counters, 2)}"}\nhttp404_responses{count="${Atomics.load(counters, 3)}"}\n`;
}

function http404Handler() {
  Atomics.add(counters, 3, 1n);
  return 'http 404';
}

function http503Handler() {
  Atomics.add(counters, 2, 1n);
  return 'http 503';
}

function chooseRequestHandler(reqUrl, countersBuf) {
  counters = new BigUint64Array(countersBuf);
  log(`Request to ${reqUrl}`);
  let parsedUrl = url.parse(reqUrl, true);
  let value = parsedUrl.query.value || '';

  try {
    switch (parsedUrl.pathname) {
      case '/v3':
        return { code: 200, data: v3Handler(value) };
      case '/v5':
        return { code: 200, data: v5Handler(value) };
      case '/health':
        return { code: 200, data: healthHandler() };
      case '/metrics':
        return { code: 200, data: metricsHandler() };
      default:
        log(`${reqUrl} - 404`);
        return { code: 404, data: http404Handler() };
    }
  } catch (err) {
    log(err);
    return { code: 503, data: http503Handler() };
  }
}

expose(chooseRequestHandler);
