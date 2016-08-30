socket = require 'socket'

socket.on 'connect', () => console.log 'connect'
socket.on 'connection', (id) => console.log 'connection', id
socket.on 'disconnection', (id) => console.log 'disconnection', id

layer = new Layer
  image: 'images/monster.png'
  backgroundColor: '#00F'

layer.center()

layer.states.add
  expanded:
    scale: 2

layer.states.animationOptions = curve: 'spring(500,12,0)'

layer.on 'click', () =>
  layer.states.next()
  socket.send 'hello'
