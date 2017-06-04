const helpers = require('./helpers.js');
const setup = require('./config.js').setup();

helpers.getNewApparts('leboncoin', setup.leboncoin);
helpers.getNewApparts('pap', setup.pap);




