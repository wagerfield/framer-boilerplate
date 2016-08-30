//------------------------------
// Imports
//------------------------------

var pug = require('pug');
var del = require('del');
var path = require('path');
var pump = require('pump');
var gulp = require('gulp');
var through = require('through2');
var watchify = require('watchify');
var browserify = require('browserify');
var poststylus = require('poststylus');
var plugins = require('gulp-load-plugins')();
var vinylSource = require('vinyl-source-stream');
var browserSync = require('browser-sync').create();
var assign = require('lodash.assign');
var colors = plugins.util.colors;
var noop = plugins.util.noop;

//------------------------------
// Paths & Globs
//------------------------------

var framerDir = path.resolve(__dirname, 'framer');
var sourceDir = path.resolve(__dirname, 'source');
var publicDir = path.resolve(__dirname, 'public');

var nodeModules = path.resolve(__dirname, 'node_modules');
var framerModules = path.resolve(framerDir, 'modules');
var sourceModules = path.resolve(sourceDir, 'modules');

var framerStyles = path.resolve(framerDir, 'styles/*.styl');
var sourceEntries = path.resolve(sourceDir, '*.coffee');

var publicScripts = path.resolve(publicDir, 'scripts');
var publicStyles = path.resolve(publicDir, 'styles');

//------------------------------
// Task: Default
//------------------------------

gulp.task('default', function(callback) {
  var tasks = ['clean', ['copy', 'styles', 'scripts']];
  if (shouldWatch()) tasks.push('watch');
  plugins.sequence.apply(null, tasks.concat(callback));
});

//------------------------------
// Task: Watch
//------------------------------

gulp.task('watch', ['watch:assets']);

gulp.task('watch:assets', function() {
  var assetsGlob = path.resolve(sourceDir, '**/*.!(coffee|sketch)');
  plugins.watch(assetsGlob, function(file) {
    var fileParts = path.parse(file.path);
    switch(file.event) {
      case 'add':
      case 'change':
        var fileDir = fileParts.dir.replace(sourceDir, publicDir);
        gulp.src(file.path).pipe(gulp.dest(fileDir));
        break;
      case 'unlink':
        del(file.path.replace(sourceDir, publicDir));
        break;
    }
  });
});

gulp.task('watch:framer', function() {
  var framerGlob = path.resolve(sourceDir, '**/*.framer');
  plugins.watch(framerGlob, function(file) {
    console.log(file.path, file.event);
  });
});

gulp.task('watch:output', function() {
  browserSync.init({
    files: path.resolve(publicDir, '**/*'),
    minify: isProduction(),
    notify: false,
    server: {
      directory: true,
      baseDir: publicDir
    }
  });
});

//------------------------------
// Task: Clean
//------------------------------

gulp.task('clean', function(callback) {
  return del(publicDir);
});

//------------------------------
// Task: Copy
//------------------------------

gulp.task('copy', ['copy:framer', 'copy:source']);

gulp.task('copy:framer', function(callback) {
  var glob = path.resolve(framerDir, '**/*.+(png)');
  pump([ gulp.src(glob), gulp.dest(publicDir) ], callback);
});

gulp.task('copy:source', function(callback) {
  var glob = path.resolve(sourceDir, '**/*.!(coffee|sketch)');
  pump([ gulp.src(glob), gulp.dest(publicDir) ], callback);
});

//------------------------------
// Task: HTML
//------------------------------

gulp.task('html', function(callback) {
  var template = path.resolve(framerDir, 'templates/template.pug');
  var compiler = pug.compileFile(template, { pretty: isDevelopment() });
  pump([
    gulp.src(sourceEntries, { read: false }),
    plugins.tap(function(file) {
      var name = path.parse(file.path).name;
      var html = compiler({ name: name });
      file.contents = new Buffer(html);
    }),
    plugins.rename({ extname: '.html' }),
    gulp.dest(publicDir)
  ], callback);
});

//------------------------------
// Task: Styles
//------------------------------

gulp.task('styles', function(callback) {
  pump([
    gulp.src(framerStyles),
    whenDevelopment(plugins.sourcemaps.init()),
    plugins.stylus({
      compress: isProduction(),
      use: [ poststylus('autoprefixer') ]
    }),
    whenDevelopment(plugins.sourcemaps.write()),
    gulp.dest(publicStyles)
  ], callback);
});

//------------------------------
// Task: Scripts
//------------------------------

gulp.task('scripts', ['scripts:framer', 'scripts:source']);

gulp.task('scripts:framer', function(callback) {
  pump([
    gulp.src(path.resolve(framerDir, 'scripts/framer.js')),
    whenDevelopment(plugins.sourcemaps.init({ loadMaps: true })),
    whenProduction(plugins.uglify()),
    whenDevelopment(plugins.sourcemaps.write()),
    gulp.dest(publicScripts)
  ], callback);
});

gulp.task('scripts:source', function(callback) {
  pump([
    gulp.src(sourceEntries, { read: false }),
    plugins.tap(function(file) {
      var watch = shouldWatch();
      var bundleName = path.parse(file.path).name;
      var bundler = makeBundler(file.path, watch);
      var bundle = makeBundle(bundler, bundleName, publicScripts);
      if (watch) bundler.on('update', bundle);
      bundle();
    })
  ], callback);
});

//------------------------------
// Helpers
//------------------------------

function makeBundler(entries, watch) {
  var bundler = browserify(assign({}, watchify.args, {
    paths: [nodeModules, framerModules, sourceModules],
    transform: ['coffeeify'],
    extensions: ['.coffee'],
    debug: isDevelopment(),
    entries: entries
  }));
  bundler.on('log', plugins.util.log);
  bundler.on('error', plugins.util.log);
  return watch ? watchify(bundler) : bundler;
}

function makeBundle(bundler, name, dest) {
  return function(a, b, c) {
    return bundler.bundle()
      .pipe(vinylSource(name + '.js'))
      .pipe(plugins.buffer())
      .pipe(whenProduction(plugins.sourcemaps.init({ loadMaps: true })))
      .pipe(whenProduction(plugins.uglify()))
      .pipe(whenProduction(plugins.sourcemaps.write()))
      .pipe(gulp.dest(dest));
  }
}

function shouldWatch() {
  return !!plugins.util.env.watch;
}

function isProduction() {
  return !!plugins.util.env.production;
}

function isDevelopment() {
  return !isProduction();
}

function whenProduction(transform) {
  return isProduction() ? transform : noop();
}

function whenDevelopment(transform) {
  return isDevelopment() ? transform : noop();
}
