var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.set('view engine', 'pug');
app.use(express.static('public'));

app.get('/', function(req, res) {
  res.render('index', { name: 'index' });
});

app.get('/:name', function(req, res) {
  res.render('index', { name: req.params.name });
});

io.on('connection', function(socket) {
  var id = socket.id.replace(/^\/#/, '');
  console.log('connected:', id);
  socket.broadcast.emit('connection', id);
  // socket.on('emit', io.emit);
  // socket.on('broadcast', io.emit);
  // socket.on('message', socket.broadcast.emit);
  socket.on('disconnect', function() {
    console.log('disconnected:', id);
    socket.broadcast.emit('disconnection', id);
  });
});

server.listen(8000, function() {
  console.log('listening on http://localhost:8000');
});
