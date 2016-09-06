var Forever = require('forever-monitor');
var Paths = require('./paths');
var Open = require('opn');

exports.start = function(open) {
  var child = Forever.start(Paths.serverDir, { uid: 'framer' });
  process.on('SIGINT', function() { child.stop() });
  if (open) child.on('start', function() {
    Open('http://localhost:8000', { app: 'google chrome' });
  });
  return child;
};
