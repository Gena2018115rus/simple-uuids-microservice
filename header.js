"use strict";

const fs = require('fs');

exports.log = function (str) {
  str = `${new Date().toISOString()} - ${str}`;
  console.log(str);
  fs.writeFileSync(process.env.g_LOG_PATH, str + '\n', { flag: 'a' });
}
