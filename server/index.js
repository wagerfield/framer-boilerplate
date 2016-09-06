var Entry = require('../tasks/entry');
var Express = require('express');
var Reload = require('reload');
var Socket = require('./socket');
var Chalk = require('chalk');
var Path = require('path');
var Http = require('http');
var _ = require('lodash');

var ENTRIES = Entry.build().names;
var MULTIPLE_ENTRIES = ENTRIES.length > 1;
var HOST = process.env.HOST || 'localhost';
var PORT = process.env.PORT || 8000;

var app = Express();
var server = Http.Server(app);
var reloader = Reload(server, app);
var io = Socket(server);

app.set('view engine', 'pug');

app.use(Express.static('framer'));
app.use(Express.static('assets'));
app.use(Express.static('output'));

app.get('/', function(request, response) {
  if (MULTIPLE_ENTRIES) {
    response.render('index', {
      title: 'Prototypes',
      entries: ENTRIES.map(function(entry) {
        return { text: entry, href: '/' + entry };
      })
    });
  } else {
    var entry = ENTRIES[0];
    response.render('framer', {
      title: _.capitalize(entry),
      script: entry
    });
  }
});

if (MULTIPLE_ENTRIES) ENTRIES.forEach(function(entry) {
  app.get('/' + entry, function(request, response) {
    response.render('framer', {
      title: _.capitalize(entry),
      script: entry
    });
  });
});

server.listen(PORT, function() {
  var url = 'http://' + HOST + ':' + PORT;
  console.log(Chalk.blue('server:'), url);
});
