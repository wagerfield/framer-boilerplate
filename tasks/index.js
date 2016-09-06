var Delete = require('del');
var Webpack = require('webpack');
var Watcher = require('./watcher');
var Server = require('./server');
var Config = require('./config');
var Paths = require('./paths');

function runTask(task) {
  switch(task) {
    case 'start':
      Watcher.watch(false, compiled);
      break;
    case 'build':
      Webpack(Config.build(true), compiled);
      break;
    case 'serve':
      Server.start(true);
      break;
  }
}

function compiled(error, stats) {
  if (error) console.log(error);
  else console.log(stats.toString({
    chunks: false,
    colors: true
  }));
}

runTask(process.env.npm_lifecycle_event);
