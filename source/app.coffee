sketch = Framer.Importer.load 'imported/app@1x'

# shapes = require 'shapes'
# socket = require 'socket'

# socket.on 'connected', (id) =>
#   console.log 'connected:', id
# socket.on 'message', (message, id) =>
#   console.log "#{id}:", message

# circle = shapes.createCircle 100
# circle.center()

# layer = new Layer
#   width: 200
#   height: 200
#   image: 'images/city.jpg'

# layer.center()

# layer.states.add
#   expanded:
#     scale: 2

# layer.states.animationOptions =
#   curve: 'spring(500,12,0)'

# layer.on 'click', () =>
#   layer.states.next()
#   socket.send 'hello'
