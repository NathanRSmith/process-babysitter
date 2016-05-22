var CONFIG = require('config');
var server = require('./index.js');

// start server with config
module.exports = server(CONFIG);
