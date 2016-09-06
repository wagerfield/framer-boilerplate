## Getting Started

First install the project dependencies:

    npm install

To start the prototype server run:

    npm start

Your browser should automatically open and display the starter project at [localhost:8000][localhost].

## Framer Generator

Framer Generator is an application that generates assets from Sketch, Photoshop and Figma into a format that can be imported into Framer projects.

You will need Framer Generator installed to import your Sketch designs into your Framer prototype.

[Download][framer-generator] and add Framer Generator to your Applications folder.

To import your Sketch designs into your prototype you will need to:

1. Have the project server running: `npm start`
2. Open the Sketch file you want to generate assets from
3. Open Framer Generator and check that the name of you Sketch file appears under the Sketch label
4. Select the scale you want to export your assets at and click 'Import'

Framer Generator will generate a Framer project alongside your Sketch file. Since we are only interested in the 'imported' folder, the server will copy this folder to the `output` directory and then delete the generated Framer project from the design directory.

To import your designs into your prototype:

```coffee
app = Framer.Importer.load 'imported/app@1x'
```

## Project Overview

There are a number top level directories in the project.

Don't be overwhelmed, you only need to concern yourself with three of them:

- `source` All prototype source code lives in here
- `assets` Static assets such as images, audio and video files can be dropped in here
- `design` Design files used to generate imported assets live in here

In the majority of cases, **you shouldn't need to touch the other directories**.

More detail on each of the directories can be found below.

### `source`

The source directory contains your prototype source code.

Each `.coffee` file at the root of the source directory is treated as a prototype 'entry point' and awarded its own url.

If you have a single entry point, the server will display your prototype at [localhost:8000][localhost].

If you have multiple entry points, the server will display them at paths that match their file name.

Entry Points | URL
------------ | ---
source/app.coffee | [localhost:8000](http://localhost:8000/)
source/one.coffee<br>source/two.coffee | [localhost:8000/one](http://localhost:8000/one)<br>[localhost:8000/two](http://localhost:8000/two)

For larger, more complex prototypes you will likely want to break your code up into [modules](#project-modules).

### `assets`

The assets directory contains all your static files such as images, videos and audio files.

You can drop files directly into the assets folder and reference them like so:

```coffee
layer = new Layer
  image: 'pattern.jpg' # assets/pattern.png
```

Or you can organise your files into folders and reference them like so:

```coffee
layer = new Layer
  image: 'images/animals/cat.jpg' # assets/images/animals/cat.jpg
```

### `design`

The design directory contains all your prototype Sketch files.

Typically you would have one Sketch file per prototype entry point:

    source/app.coffee <---> design/app.sketch
    source/one.coffee <---> design/one.sketch
    source/two.coffee <---> design/two.sketch

### `framer`

**You shouldn't need to touch this directory.**

The framer directory contains Framer assets and included [modules](#framer-modules).

The only files that you might want to modify are the icons in the `framer/images` directory. If you want to create a custom icon for your prototype so that it is displayed when you [add your prototype to your smart device's home screen][homescreen], simply open `framer/images/assets.sketch`, modify the icons and export them.

### `server`

**You shouldn't need to touch this directory.**

The server directory contains the [express][express] server code.

### `output`

**You shouldn't need to touch this directory.**

The output directory contains the compiled prototype code and generated design assets.

### `views`

**You shouldn't need to touch this directory.**

The views directory contains the [pug][pug] templates used to generate the html pages.

### `tasks`

**You shouldn't need to touch this directory.**

The tasks directory contains various scripts and configuration files used to:

- Compile the prototype `.coffee` files into `output/scripts`
- Watch the `design` directory for `.framer` projects and move the `imported` folder to the `output` directory
- Reload the prototype pages when files in the `assets`, `framer` and `output` folders change

## Project Modules

For large, complex prototypes you might want to break up your code into smaller modules that can be shared across your entry points or used in other projects.

To create a module and import it into another file:

```coffee
# source/modules/shapes.coffee
exports.createCircle = (radius) =>
  new Layer
    width: radius * 2
    height: radius * 2
    borderRadius: radius

# source/app.coffee
shapes = require 'shapes'
circle = shapes.createCircle 50
circle.center()
```

## Framer Modules

To enhance your Framer prototypes, a collection of modules are included in the `framer/modules` directory:

Module | Description
------ | -----------
`firebase` | Realtime database for your prototypes
`socket` | Realtime communication between your prototypes
`audio` | Simple audio player
`video` | Simple video player

To use these modules, simply require them in your prototype source code:

```coffee
# source/app.coffee

socket = require 'socket'
socket.on 'message', (message) => console.log message

button = new Layer()
button.on 'click', () => socket.send 'hello'
```

## Useful Links

- [Framer Docs](https://framerjs.com/docs/)
- [Framer Resources](https://framerjs.com/getstarted/resources/)
- [Framer Group](http://framergroup.com/)
- [Importing Sketch](https://framerjs.com/getstarted/import/)
- [CoffeeScript Docs](http://coffeescript.org/)
- [CoffeeScript Cookbook](https://coffeescript-cookbook.github.io/)

## License

Licensed under MIT

## Author

Matthew Wagerfield [@wagerfield][twitter]



[localhost]:http://localhost:8000/
[mit]:https://github.com/pugjs/pug
[pug]:https://github.com/pugjs/pug
[express]:https://expressjs.com/
[framer-generator]: http://framerjs.com/static/downloads/Framer.zip
[homescreen]:http://www.howtogeek.com/196087/how-to-add-websites-to-the-home-screen-on-any-smartphone-or-tablet/
[twitter]:https://twitter.com/wagerfield
