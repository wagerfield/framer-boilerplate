layer = new Layer
  backgroundColor: '#F00'

layer.center()

layer.states.add
  expanded:
    scale: 2

layer.states.animationOptions = curve: 'spring(500,12,0)'

layer.on 'click', () => layer.states.next()

