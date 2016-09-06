var Path = require('path');

exports.rootDir = Path.resolve(__dirname, '..');
exports.assetsDir = Path.join(exports.rootDir, 'assets');
exports.designDir = Path.join(exports.rootDir, 'design');
exports.framerDir = Path.join(exports.rootDir, 'framer');
exports.sourceDir = Path.join(exports.rootDir, 'source');
exports.outputDir = Path.join(exports.rootDir, 'output');
exports.serverDir = Path.join(exports.rootDir, 'server');
