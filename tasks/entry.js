var _ = require('lodash');
var Glob = require('glob');
var Path = require('path');
var Paths = require('./paths');

exports.glob = Path.join(Paths.sourceDir, '*.coffee');
exports.build = function() {
  var paths = Glob.sync(exports.glob);
  return {
    paths: paths,
    names: _.map(paths, parseFileName),
    map: _.keyBy(paths, parseFileName)
  };
};

function parseFileName(item) {
  return Path.parse(item).name;
}
