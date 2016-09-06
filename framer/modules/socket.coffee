io = require 'socket.io-client'

socket = io.connect()

exports.on = (event, callback) =>
  socket.on event, callback

exports.send = (data) =>
  socket.send data

exports.emit = (event, data) =>
  socket.emit 'emit', event, data
