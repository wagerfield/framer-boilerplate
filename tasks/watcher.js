var Chokidar = require('chokidar');
var Webpack = require('webpack');
var Server = require('./server');
var Config = require('./config');
var Entry = require('./entry');
var Paths = require('./paths');
var Chalk = require('chalk');
var Delete = require('del');
var Path = require('path');
var Gulp = require('gulp');
var _ = require('lodash');

exports.watch = function(production, callback) {

  // Run server and compile source
  var child = Server.start(true);
  var watcher = compile(production, callback);
  watchSource(function(event, path) {
    // log(event, path);
    child.restart();
    watcher.close();
    watcher = compile(production, callback);
  }, null, ['add', 'unlink']);

  // Move framer project imported folder to output
  watchDesign(function(event, path) {
    // log(event, path);
    // path/to/project/design/app.framer/imported/app@1x/layers.json.js
    // 0: path/to/project/design/app.framer/imported/app@1x
    // 1: path/to/project/design/app.framer
    // 2: imported/app@1x
    var match = path.match(/^(.*\.framer)\/(imported\/.*@\d+\.?\d*?x)/);
    if (_.isArray(match)) {
      var remove = match[1];
      var source = Path.join(match[0], '**/*');
      var output = Path.join(Paths.outputDir, match[2]);
      Delete(output).then(function(paths) {
        // console.log('deleted:', paths);
        Gulp.src(source).pipe(Gulp.dest(output)).on('end', function() {
          // console.log(' copied:', source, 'to:', output);
          // Delete(remove).then(function(paths) {
          //   console.log('deleted:', paths);
          // });
        });
      });
    }
  }, 200, ['add', 'addDir', 'change']);

  // Reload browser
  watchOutput(function(event, path) {
    // log(event, path);
    child.restart();
  }, 200);
};

function watchSource(callback, wait, events) {
  watch(Entry.glob, callback, wait, events);
}

function watchDesign(callback, wait, events) {
  var matcher = '*.framer/imported/**/*';
  var glob = Path.join(Paths.designDir, matcher);
  watch(glob, callback, wait, events);
}

function watchOutput(callback, wait, events) {
  var matcher = '@(assets|framer|output)/**/*';
  var glob = Path.join(Paths.rootDir, matcher);
  watch(glob, callback, wait, events);
}

function watch(glob, callback, wait, events) {
  var cb = function(event, path) {
    if (_.isArray(events)) {
      if (_.includes(events, event)) callback(event, path);
    } else callback(event, path);
  }
  if (_.isNumber(wait)) cb = _.debounce(cb, wait);
  var watcher = Chokidar.watch(glob, {
    ignoreInitial: true,
    ignored: /[\/\\]\./
  }).on('all', cb);
  close(watcher);
  return watcher;
}

function compile(production, callback) {
  // console.log(Chalk.yellow('compile:'), 'production:', production);
  var compiler = Webpack(Config.build(production));
  var watcher = compiler.watch({}, callback);
  close(watcher);
  return watcher;
}

function close(watcher) {
  process.on('SIGINT', function() { watcher.close() });
}

function log(event, path) {
  console.log(Chalk.magenta(event), path);
}
