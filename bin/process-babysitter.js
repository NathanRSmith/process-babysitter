#!/usr/bin/env node

var yargs = require('yargs');
var argv = yargs
  .help('h')
  .alias('h', 'help')
  .usage('process-babysitter <path to config directory>')
  .version(require('../package.json').version)
  .argv;

if(!argv._.length) {
  yargs.showHelp();
  process.exit(1);
}

// set config dir from cli
process.env.NODE_CONFIG_DIR = argv._[0];
require('../server');
