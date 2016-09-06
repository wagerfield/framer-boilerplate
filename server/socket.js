module.exports = function(server) {

  var io = require('socket.io')(server);

  io.on('connection', function(socket) {

    var id = socket.id.replace(/^\/#/, '');

    socket.emit('connected', id);
    socket.broadcast.emit('connection', id);

    socket.on('message', function(data) {
      socket.broadcast.send(data, id);
    });

    socket.on('emit', function(event, data) {
      socket.broadcast.emit(event, data, id);
    });

    socket.on('disconnect', function() {
      socket.broadcast.emit('disconnection', id);
    });
  });

  return io;
};
