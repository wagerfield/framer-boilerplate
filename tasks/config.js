var ProgressBarPlugin = require('progress-bar-webpack-plugin');
var CleanWebpackPlugin = require('clean-webpack-plugin');
var webpack = require('webpack');
var entry = require('./entry');
var paths = require('./paths');
var path = require('path');
var _ = require('lodash');

exports.build = function(production) {
  var entryMap = entry.build().map;
  var plugins = _.compact([
    new CleanWebpackPlugin(['scripts'], {
      root: paths.outputDir,
      verbose: false
    }),
    production && new ProgressBarPlugin(),
    production && new webpack.optimize.UglifyJsPlugin({
      compress: { warnings: false }
    })
  ]);
  return {
    entry: entryMap,
    output: {
      path: path.resolve(paths.outputDir, 'scripts'),
      filename: '[name].js'
    },
    resolve: {
      root: [
        path.resolve(paths.sourceDir, 'modules'),
        path.resolve(paths.framerDir, 'modules')
      ],
      extensions: [ '', '.js', '.coffee' ]
    },
    module: {
      loaders: [{
        test: /\.coffee$/,
        include: [ paths.sourceDir, paths.framerDir ],
        loader: 'coffee'
      }]
    },
    devtool: production ? 'source-map' : 'source-map',
    plugins: plugins
  };
};
