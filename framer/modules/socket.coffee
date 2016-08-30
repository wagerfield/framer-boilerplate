io = require 'socket.io-client'

socket = io.connect()

console.log socket

exports.on = (event, callback) =>
  socket.on event, callback

exports.emit = (event, data) =>
  socket.emit event, data

exports.send = (message) =>
  socket.send message

exports.broadcast = (event, data) =>
  socket.emit event, data
