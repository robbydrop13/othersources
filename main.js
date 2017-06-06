const helpers = require('./helpers.js');
const setup = require('./config.js').setup();
const async = require('async');

// console.log("Starting PAP");
// helpers.getNewApparts('pap', setup.pap);

console.log("Starting Leboncoin");
helpers.getNewApparts('leboncoin', setup.leboncoin);

setTimeout(function() {
  console.log("Starting PAP");
  helpers.getNewApparts('pap', setup.pap);
}, 50 * 1000);