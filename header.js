"use strict";

const fs = require('fs');

const LOG_PATH = (process.env.LOG_PATH || (() => { throw console.log('!!! LOG_PATH not defined !!!') })()) + '_' + new Date().toISOString();

exports.LOG_PATH = LOG_PATH;

exports.log = function (str) {
  str = `${new Date().toISOString()} - ${str}`;
  console.log(str);
  fs.writeFile(LOG_PATH, str + '\n', { flag: 'a' }, (err) => {
    if (err) {
      console.log('Error when attempted write to log file!\n');
    }
  });
}
