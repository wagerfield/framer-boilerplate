;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AnimatorClasses, BezierCurveAnimator, Config, Defaults, EventEmitter, Frame, LinearAnimator, SpringDHOAnimator, SpringRK4Animator, Utils, evaluateRelativeProperty, isRelativeProperty, numberRE, relativePropertyRE, _, _runningAnimations,
  __slice = [].slice,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require("./Underscore")._;

Utils = require("./Utils");

Config = require("./Config").Config;

Defaults = require("./Defaults").Defaults;

EventEmitter = require("./EventEmitter").EventEmitter;

Frame = require("./Frame").Frame;

LinearAnimator = require("./Animators/LinearAnimator").LinearAnimator;

BezierCurveAnimator = require("./Animators/BezierCurveAnimator").BezierCurveAnimator;

SpringRK4Animator = require("./Animators/SpringRK4Animator").SpringRK4Animator;

SpringDHOAnimator = require("./Animators/SpringDHOAnimator").SpringDHOAnimator;

AnimatorClasses = {
  "linear": LinearAnimator,
  "bezier-curve": BezierCurveAnimator,
  "spring-rk4": SpringRK4Animator,
  "spring-dho": SpringDHOAnimator
};

AnimatorClasses["spring"] = AnimatorClasses["spring-rk4"];

AnimatorClasses["cubic-bezier"] = AnimatorClasses["bezier-curve"];

numberRE = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/;

relativePropertyRE = new RegExp('^(?:([+-])=|)(' + numberRE.source + ')([a-z%]*)$', 'i');

isRelativeProperty = function(v) {
  return _.isString(v) && relativePropertyRE.test(v);
};

evaluateRelativeProperty = function(target, k, v) {
  var match, number, rest, sign, unit, _ref;
  _ref = relativePropertyRE.exec(v), match = _ref[0], sign = _ref[1], number = _ref[2], unit = _ref[3], rest = 5 <= _ref.length ? __slice.call(_ref, 4) : [];
  if (sign) {
    return target[k] + (sign + 1) * number;
  } else {
    return +number;
  }
};

_runningAnimations = [];

exports.Animation = (function(_super) {
  __extends(Animation, _super);

  Animation.runningAnimations = function() {
    return _runningAnimations;
  };

  function Animation(options) {
    if (options == null) {
      options = {};
    }
    this.start = __bind(this.start, this);
    options = Defaults.getDefaults("Animation", options);
    Animation.__super__.constructor.call(this, options);
    this.options = Utils.setDefaultProperties(options, {
      layer: null,
      properties: {},
      curve: "linear",
      curveOptions: {},
      time: 1,
      repeat: 0,
      delay: 0,
      debug: false
    });
    if (options.origin) {
      console.warn("Animation.origin: please use layer.originX and layer.originY");
    }
    if (options.properties instanceof Frame) {
      option.properties = option.properties.properties;
    }
    this.options.properties = this._filterAnimatableProperties(this.options.properties);
    this._parseAnimatorOptions();
    this._originalState = this._currentState();
    this._repeatCounter = this.options.repeat;
  }

  Animation.prototype._filterAnimatableProperties = function(properties) {
    var animatableProperties, k, v;
    animatableProperties = {};
    for (k in properties) {
      v = properties[k];
      if (_.isNumber(v) || isRelativeProperty(v)) {
        animatableProperties[k] = v;
      }
    }
    return animatableProperties;
  };

  Animation.prototype._currentState = function() {
    return _.pick(this.options.layer, _.keys(this.options.properties));
  };

  Animation.prototype._animatorClass = function() {
    var animatorClassName, parsedCurve;
    parsedCurve = Utils.parseFunction(this.options.curve);
    animatorClassName = parsedCurve.name.toLowerCase();
    if (AnimatorClasses.hasOwnProperty(animatorClassName)) {
      return AnimatorClasses[animatorClassName];
    }
    return LinearAnimator;
  };

  Animation.prototype._parseAnimatorOptions = function() {
    var animatorClass, i, k, parsedCurve, value, _base, _i, _j, _len, _len1, _ref, _ref1, _results;
    animatorClass = this._animatorClass();
    parsedCurve = Utils.parseFunction(this.options.curve);
    if (animatorClass === LinearAnimator || animatorClass === BezierCurveAnimator) {
      if (_.isString(this.options.curveOptions) || _.isArray(this.options.curveOptions)) {
        this.options.curveOptions = {
          values: this.options.curveOptions
        };
      }
      if ((_base = this.options.curveOptions).time == null) {
        _base.time = this.options.time;
      }
    }
    if (parsedCurve.args.length) {
      if (animatorClass === BezierCurveAnimator) {
        this.options.curveOptions.values = parsedCurve.args.map(function(v) {
          return parseFloat(v) || 0;
        });
      }
      if (animatorClass === SpringRK4Animator) {
        _ref = ["tension", "friction", "velocity"];
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          k = _ref[i];
          value = parseFloat(parsedCurve.args[i]);
          if (value) {
            this.options.curveOptions[k] = value;
          }
        }
      }
      if (animatorClass === SpringDHOAnimator) {
        _ref1 = ["stiffness", "damping", "mass", "tolerance"];
        _results = [];
        for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
          k = _ref1[i];
          value = parseFloat(parsedCurve.args[i]);
          if (value) {
            _results.push(this.options.curveOptions[k] = value);
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    }
  };

  Animation.prototype.start = function() {
    var AnimatorClass, k, start, stateA, stateB, target, v, _ref,
      _this = this;
    if (this.options.layer === null) {
      console.error("Animation: missing layer");
    }
    AnimatorClass = this._animatorClass();
    if (this.options.debug) {
      console.log("Animation.start " + AnimatorClass.name, this.options.curveOptions);
    }
    this._animator = new AnimatorClass(this.options.curveOptions);
    target = this.options.layer;
    stateA = this._currentState();
    stateB = {};
    _ref = this.options.properties;
    for (k in _ref) {
      v = _ref[k];
      if (isRelativeProperty(v)) {
        v = evaluateRelativeProperty(target, k, v);
      }
      if (stateA[k] !== v) {
        stateB[k] = v;
      }
    }
    if (_.isEqual(stateA, stateB)) {
      console.warn("Nothing to animate");
    }
    if (this.options.debug) {
      console.log("Animation.start");
      for (k in stateB) {
        v = stateB[k];
        console.log("\t" + k + ": " + stateA[k] + " -> " + stateB[k]);
      }
    }
    this._animator.on("start", function() {
      return _this.emit("start");
    });
    this._animator.on("stop", function() {
      return _this.emit("stop");
    });
    this._animator.on("end", function() {
      return _this.emit("end");
    });
    if (this._repeatCounter > 0) {
      this._animator.on("end", function() {
        for (k in stateA) {
          v = stateA[k];
          target[k] = v;
        }
        _this._repeatCounter--;
        return _this.start();
      });
    }
    this._animator.on("tick", function(value) {
      for (k in stateB) {
        v = stateB[k];
        target[k] = Utils.mapRange(value, 0, 1, stateA[k], stateB[k]);
      }
    });
    start = function() {
      _runningAnimations.push(_this);
      return _this._animator.start();
    };
    if (this.options.delay) {
      return Utils.delay(this.options.delay, start);
    } else {
      return start();
    }
  };

  Animation.prototype.stop = function() {
    var _ref;
    if ((_ref = this._animator) != null) {
      _ref.stop();
    }
    return _runningAnimations = _.without(_runningAnimations, this);
  };

  Animation.prototype.reverse = function() {
    var animation, options;
    options = _.clone(this.options);
    options.properties = this._originalState;
    animation = new Animation(options);
    return animation;
  };

  Animation.prototype.revert = function() {
    return this.reverse();
  };

  Animation.prototype.inverse = function() {
    return this.reverse();
  };

  Animation.prototype.invert = function() {
    return this.reverse();
  };

  Animation.prototype.emit = function(event) {
    Animation.__super__.emit.apply(this, arguments);
    return this.options.layer.emit(event, this);
  };

  return Animation;

})(EventEmitter);


},{"./Animators/BezierCurveAnimator":4,"./Animators/LinearAnimator":5,"./Animators/SpringDHOAnimator":6,"./Animators/SpringRK4Animator":7,"./Config":11,"./Defaults":13,"./EventEmitter":14,"./Frame":19,"./Underscore":29,"./Utils":30}],2:[function(require,module,exports){
var AnimationLoop, AnimationLoopIndexKey, Config, EventEmitter, Utils, _;

_ = require("./Underscore")._;

Utils = require("./Utils");

Config = require("./Config").Config;

EventEmitter = require("./EventEmitter").EventEmitter;

AnimationLoopIndexKey = "_animationLoopIndex";

AnimationLoop = {
  debug: false,
  _animators: [],
  _running: false,
  _frameCounter: 0,
  _sessionTime: 0,
  _start: function() {
    if (AnimationLoop._running) {
      return;
    }
    if (!AnimationLoop._animators.length) {
      return;
    }
    AnimationLoop._running = true;
    AnimationLoop._time = Utils.getTime();
    AnimationLoop._sessionTime = 0;
    return window.requestAnimationFrame(AnimationLoop._tick);
  },
  _stop: function() {
    return AnimationLoop._running = false;
  },
  _tick: function() {
    var animator, delta, removeAnimators, time, _i, _j, _len, _len1, _ref;
    if (!AnimationLoop._animators.length) {
      return AnimationLoop._stop();
    }
    AnimationLoop._frameCounter++;
    time = Utils.getTime();
    delta = time - AnimationLoop._time;
    AnimationLoop._sessionTime += delta;
    removeAnimators = [];
    _ref = AnimationLoop._animators;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      animator = _ref[_i];
      animator.emit("tick", animator.next(delta));
      if (animator.finished()) {
        animator.emit("tick", 1);
        removeAnimators.push(animator);
      }
    }
    AnimationLoop._time = time;
    for (_j = 0, _len1 = removeAnimators.length; _j < _len1; _j++) {
      animator = removeAnimators[_j];
      AnimationLoop.remove(animator);
      animator.emit("end");
    }
    window.requestAnimationFrame(AnimationLoop._tick);
  },
  add: function(animator) {
    if (animator.hasOwnProperty(AnimationLoopIndexKey)) {
      return;
    }
    animator[AnimationLoopIndexKey] = AnimationLoop._animators.push(animator);
    animator.emit("start");
    return AnimationLoop._start();
  },
  remove: function(animator) {
    AnimationLoop._animators = _.without(AnimationLoop._animators, animator);
    return animator.emit("stop");
  }
};

exports.AnimationLoop = AnimationLoop;


},{"./Config":11,"./EventEmitter":14,"./Underscore":29,"./Utils":30}],3:[function(require,module,exports){
var AnimationLoop, Config, EventEmitter, Utils,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Utils = require("./Utils");

Config = require("./Config").Config;

EventEmitter = require("./EventEmitter").EventEmitter;

AnimationLoop = require("./AnimationLoop").AnimationLoop;

exports.Animator = (function(_super) {
  __extends(Animator, _super);

  "The animator class is a very simple class that\n	- Takes a set of input values at setup({input values})\n	- Emits an output value for progress (0 -> 1) in value(progress)";

  function Animator(options) {
    if (options == null) {
      options = {};
    }
    this.setup(options);
  }

  Animator.prototype.setup = function(options) {
    throw Error("Not implemented");
  };

  Animator.prototype.next = function(delta) {
    throw Error("Not implemented");
  };

  Animator.prototype.finished = function() {
    throw Error("Not implemented");
  };

  Animator.prototype.start = function() {
    return AnimationLoop.add(this);
  };

  Animator.prototype.stop = function() {
    return AnimationLoop.remove(this);
  };

  return Animator;

})(EventEmitter);


},{"./AnimationLoop":2,"./Config":11,"./EventEmitter":14,"./Utils":30}],4:[function(require,module,exports){
var Animator, BezierCurveDefaults, UnitBezier, Utils, _, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require("../Underscore")._;

Utils = require("../Utils");

Animator = require("../Animator").Animator;

BezierCurveDefaults = {
  "linear": [0, 0, 1, 1],
  "ease": [.25, .1, .25, 1],
  "ease-in": [.42, 0, 1, 1],
  "ease-out": [0, 0, .58, 1],
  "ease-in-out": [.42, 0, .58, 1]
};

exports.BezierCurveAnimator = (function(_super) {
  __extends(BezierCurveAnimator, _super);

  function BezierCurveAnimator() {
    _ref = BezierCurveAnimator.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  BezierCurveAnimator.prototype.setup = function(options) {
    if (_.isString(options) && BezierCurveDefaults.hasOwnProperty(options.toLowerCase())) {
      options = {
        values: BezierCurveDefaults[options.toLowerCase()]
      };
    }
    if (options.values && _.isString(options.values) && BezierCurveDefaults.hasOwnProperty(options.values.toLowerCase())) {
      options = {
        values: BezierCurveDefaults[options.values.toLowerCase()],
        time: options.time
      };
    }
    if (_.isArray(options) && options.length === 4) {
      options = {
        values: options
      };
    }
    this.options = Utils.setDefaultProperties(options, {
      values: BezierCurveDefaults["ease-in-out"],
      time: 1
    });
    return this._unitBezier = new UnitBezier(this.options.values[0], this.options.values[1], this.options.values[2], this.options.values[3], this._time = 0);
  };

  BezierCurveAnimator.prototype.next = function(delta) {
    this._time += delta;
    if (this.finished()) {
      return 1;
    }
    return this._unitBezier.solve(this._time / this.options.time);
  };

  BezierCurveAnimator.prototype.finished = function() {
    return this._time >= this.options.time;
  };

  return BezierCurveAnimator;

})(Animator);

UnitBezier = (function() {
  UnitBezier.prototype.epsilon = 1e-6;

  function UnitBezier(p1x, p1y, p2x, p2y) {
    this.cx = 3.0 * p1x;
    this.bx = 3.0 * (p2x - p1x) - this.cx;
    this.ax = 1.0 - this.cx - this.bx;
    this.cy = 3.0 * p1y;
    this.by = 3.0 * (p2y - p1y) - this.cy;
    this.ay = 1.0 - this.cy - this.by;
  }

  UnitBezier.prototype.sampleCurveX = function(t) {
    return ((this.ax * t + this.bx) * t + this.cx) * t;
  };

  UnitBezier.prototype.sampleCurveY = function(t) {
    return ((this.ay * t + this.by) * t + this.cy) * t;
  };

  UnitBezier.prototype.sampleCurveDerivativeX = function(t) {
    return (3.0 * this.ax * t + 2.0 * this.bx) * t + this.cx;
  };

  UnitBezier.prototype.solveCurveX = function(x) {
    var d2, i, t0, t1, t2, x2;
    t2 = x;
    i = 0;
    while (i < 8) {
      x2 = this.sampleCurveX(t2) - x;
      if (Math.abs(x2) < this.epsilon) {
        return t2;
      }
      d2 = this.sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < this.epsilon) {
        break;
      }
      t2 = t2 - x2 / d2;
      i++;
    }
    t0 = 0.0;
    t1 = 1.0;
    t2 = x;
    if (t2 < t0) {
      return t0;
    }
    if (t2 > t1) {
      return t1;
    }
    while (t0 < t1) {
      x2 = this.sampleCurveX(t2);
      if (Math.abs(x2 - x) < this.epsilon) {
        return t2;
      }
      if (x > x2) {
        t0 = t2;
      } else {
        t1 = t2;
      }
      t2 = (t1 - t0) * .5 + t0;
    }
    return t2;
  };

  UnitBezier.prototype.solve = function(x) {
    return this.sampleCurveY(this.solveCurveX(x));
  };

  return UnitBezier;

})();


},{"../Animator":3,"../Underscore":29,"../Utils":30}],5:[function(require,module,exports){
var Animator, Utils, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Utils = require("../Utils");

Animator = require("../Animator").Animator;

exports.LinearAnimator = (function(_super) {
  __extends(LinearAnimator, _super);

  function LinearAnimator() {
    _ref = LinearAnimator.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  LinearAnimator.prototype.setup = function(options) {
    this.options = Utils.setDefaultProperties(options, {
      time: 1
    });
    return this._time = 0;
  };

  LinearAnimator.prototype.next = function(delta) {
    if (this.finished()) {
      return 1;
    }
    this._time += delta;
    return this._time / this.options.time;
  };

  LinearAnimator.prototype.finished = function() {
    return this._time >= this.options.time;
  };

  return LinearAnimator;

})(Animator);


},{"../Animator":3,"../Utils":30}],6:[function(require,module,exports){
var Animator, Utils, _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Utils = require("../Utils");

Animator = require("../Animator").Animator;

exports.SpringDHOAnimator = (function(_super) {
  __extends(SpringDHOAnimator, _super);

  function SpringDHOAnimator() {
    this.finished = __bind(this.finished, this);
    _ref = SpringDHOAnimator.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  SpringDHOAnimator.prototype.setup = function(options) {
    this.options = Utils.setDefaultProperties(options, {
      velocity: 0,
      tolerance: 1 / 10000,
      stiffness: 50,
      damping: 2,
      mass: 0.2,
      time: null
    });
    console.log("SpringDHOAnimator.options", this.options, options);
    this._time = 0;
    this._value = 0;
    return this._velocity = this.options.velocity;
  };

  SpringDHOAnimator.prototype.next = function(delta) {
    var F_damper, F_spring, b, k;
    if (this.finished()) {
      return 1;
    }
    this._time += delta;
    k = 0 - this.options.stiffness;
    b = 0 - this.options.damping;
    F_spring = k * (this._value - 1);
    F_damper = b * this._velocity;
    this._velocity += ((F_spring + F_damper) / this.options.mass) * delta;
    this._value += this._velocity * delta;
    return this._value;
  };

  SpringDHOAnimator.prototype.finished = function() {
    return this._time > 0 && Math.abs(this._velocity) < this.options.tolerance;
  };

  return SpringDHOAnimator;

})(Animator);


},{"../Animator":3,"../Utils":30}],7:[function(require,module,exports){
var Animator, Utils, springAccelerationForState, springEvaluateState, springEvaluateStateWithDerivative, springIntegrateState, _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Utils = require("../Utils");

Animator = require("../Animator").Animator;

exports.SpringRK4Animator = (function(_super) {
  __extends(SpringRK4Animator, _super);

  function SpringRK4Animator() {
    this.finished = __bind(this.finished, this);
    _ref = SpringRK4Animator.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  SpringRK4Animator.prototype.setup = function(options) {
    this.options = Utils.setDefaultProperties(options, {
      tension: 500,
      friction: 10,
      velocity: 0,
      tolerance: 1 / 10000,
      time: null
    });
    this._time = 0;
    this._value = 0;
    this._velocity = this.options.velocity;
    return this._stopSpring = false;
  };

  SpringRK4Animator.prototype.next = function(delta) {
    var finalVelocity, net1DVelocity, netFloat, netValueIsLow, netVelocityIsLow, stateAfter, stateBefore;
    if (this.finished()) {
      return 1;
    }
    this._time += delta;
    stateBefore = {};
    stateAfter = {};
    stateBefore.x = this._value - 1;
    stateBefore.v = this._velocity;
    stateBefore.tension = this.options.tension;
    stateBefore.friction = this.options.friction;
    stateAfter = springIntegrateState(stateBefore, delta);
    this._value = 1 + stateAfter.x;
    finalVelocity = stateAfter.v;
    netFloat = stateAfter.x;
    net1DVelocity = stateAfter.v;
    netValueIsLow = Math.abs(netFloat) < this.options.tolerance;
    netVelocityIsLow = Math.abs(net1DVelocity) < this.options.tolerance;
    this._stopSpring = netValueIsLow && netVelocityIsLow;
    this._velocity = finalVelocity;
    return this._value;
  };

  SpringRK4Animator.prototype.finished = function() {
    return this._stopSpring;
  };

  return SpringRK4Animator;

})(Animator);

springAccelerationForState = function(state) {
  return -state.tension * state.x - state.friction * state.v;
};

springEvaluateState = function(initialState) {
  var output;
  output = {};
  output.dx = initialState.v;
  output.dv = springAccelerationForState(initialState);
  return output;
};

springEvaluateStateWithDerivative = function(initialState, dt, derivative) {
  var output, state;
  state = {};
  state.x = initialState.x + derivative.dx * dt;
  state.v = initialState.v + derivative.dv * dt;
  state.tension = initialState.tension;
  state.friction = initialState.friction;
  output = {};
  output.dx = state.v;
  output.dv = springAccelerationForState(state);
  return output;
};

springIntegrateState = function(state, speed) {
  var a, b, c, d, dvdt, dxdt;
  a = springEvaluateState(state);
  b = springEvaluateStateWithDerivative(state, speed * 0.5, a);
  c = springEvaluateStateWithDerivative(state, speed * 0.5, b);
  d = springEvaluateStateWithDerivative(state, speed, c);
  dxdt = 1.0 / 6.0 * (a.dx + 2.0 * (b.dx + c.dx) + d.dx);
  dvdt = 1.0 / 6.0 * (a.dv + 2.0 * (b.dv + c.dv) + d.dv);
  state.x = state.x + dxdt * speed;
  state.v = state.v + dvdt * speed;
  return state;
};


},{"../Animator":3,"../Utils":30}],8:[function(require,module,exports){
var Layer,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Layer = require("./Layer").Layer;

"Todo: make it work in a parent layer";

exports.BackgroundLayer = (function(_super) {
  __extends(BackgroundLayer, _super);

  function BackgroundLayer(options) {
    if (options == null) {
      options = {};
    }
    this.layout = __bind(this.layout, this);
    if (options.backgroundColor == null) {
      options.backgroundColor = "#fff";
    }
    options.name = "Background";
    BackgroundLayer.__super__.constructor.call(this, options);
    this.sendToBack();
    this.layout();
    Screen.on("resize", this.layout);
  }

  BackgroundLayer.prototype.layout = function() {
    this.width = Screen.width;
    return this.height = Screen.height;
  };

  return BackgroundLayer;

})(Layer);


},{"./Layer":22}],9:[function(require,module,exports){
var CounterKey, DefinedPropertiesKey, DefinedPropertiesValuesKey, EventEmitter, Utils, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require("./Underscore")._;

Utils = require("./Utils");

EventEmitter = require("./EventEmitter").EventEmitter;

CounterKey = "_ObjectCounter";

DefinedPropertiesKey = "_DefinedPropertiesKey";

DefinedPropertiesValuesKey = "_DefinedPropertiesValuesKey";

exports.BaseClass = (function(_super) {
  __extends(BaseClass, _super);

  BaseClass.define = function(propertyName, descriptor) {
    if (this !== BaseClass && descriptor.exportable === true) {
      descriptor.propertyName = propertyName;
      if (this[DefinedPropertiesKey] == null) {
        this[DefinedPropertiesKey] = {};
      }
      this[DefinedPropertiesKey][propertyName] = descriptor;
    }
    Object.defineProperty(this.prototype, propertyName, descriptor);
    return Object.__;
  };

  BaseClass.simpleProperty = function(name, fallback, exportable) {
    if (exportable == null) {
      exportable = true;
    }
    return {
      exportable: exportable,
      "default": fallback,
      get: function() {
        return this._getPropertyValue(name);
      },
      set: function(value) {
        return this._setPropertyValue(name, value);
      }
    };
  };

  BaseClass.prototype._setPropertyValue = function(k, v) {
    return this[DefinedPropertiesValuesKey][k] = v;
  };

  BaseClass.prototype._getPropertyValue = function(k) {
    return Utils.valueOrDefault(this[DefinedPropertiesValuesKey][k], this._getPropertyDefaultValue(k));
  };

  BaseClass.prototype._getPropertyDefaultValue = function(k) {
    return this.constructor[DefinedPropertiesKey][k]["default"];
  };

  BaseClass.prototype._propertyList = function() {
    return this.constructor[DefinedPropertiesKey];
  };

  BaseClass.prototype.keys = function() {
    return _.keys(this.properties);
  };

  BaseClass.define("properties", {
    get: function() {
      var k, properties, v, _ref;
      properties = {};
      _ref = this.constructor[DefinedPropertiesKey];
      for (k in _ref) {
        v = _ref[k];
        if (v.exportable !== false) {
          properties[k] = this[k];
        }
      }
      return properties;
    },
    set: function(value) {
      var k, v, _results;
      _results = [];
      for (k in value) {
        v = value[k];
        if (this.constructor[DefinedPropertiesKey].hasOwnProperty(k)) {
          if (this.constructor[DefinedPropertiesKey].exportable !== false) {
            _results.push(this[k] = v);
          } else {
            _results.push(void 0);
          }
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }
  });

  BaseClass.define("id", {
    get: function() {
      return this._id;
    }
  });

  BaseClass.prototype.toString = function() {
    var properties;
    properties = _.map(this.properties, (function(v, k) {
      return "" + k + ":" + v;
    }), 4);
    return "[" + this.constructor.name + " id:" + this.id + " " + (properties.join(" ")) + "]";
  };

  function BaseClass(options) {
    var _base,
      _this = this;
    if (options == null) {
      options = {};
    }
    this.toString = __bind(this.toString, this);
    this._getPropertyValue = __bind(this._getPropertyValue, this);
    this._setPropertyValue = __bind(this._setPropertyValue, this);
    BaseClass.__super__.constructor.apply(this, arguments);
    this[DefinedPropertiesValuesKey] = {};
    if ((_base = this.constructor)[CounterKey] == null) {
      _base[CounterKey] = 0;
    }
    this.constructor[CounterKey] += 1;
    this._id = this.constructor[CounterKey];
    _.map(this.constructor[DefinedPropertiesKey], function(descriptor, name) {
      return _this[name] = Utils.valueOrDefault(options[name], _this._getPropertyDefaultValue(name));
    });
  }

  return BaseClass;

})(EventEmitter);


},{"./EventEmitter":14,"./Underscore":29,"./Utils":30}],10:[function(require,module,exports){
var CompatImageView, CompatLayer, CompatScrollView, CompatView, Layer, compatProperty, compatWarning, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Layer = require("./Layer").Layer;

compatWarning = function(msg) {
  return console.warn(msg);
};

compatProperty = function(name, originalName) {
  return {
    exportable: false,
    get: function() {
      compatWarning("" + originalName + " is a deprecated property");
      return this[name];
    },
    set: function(value) {
      compatWarning("" + originalName + " is a deprecated property");
      return this[name] = value;
    }
  };
};

CompatLayer = (function(_super) {
  var addSubView, removeSubView;

  __extends(CompatLayer, _super);

  function CompatLayer(options) {
    if (options == null) {
      options = {};
    }
    if (options.hasOwnProperty("superView")) {
      options.superLayer = options.superView;
    }
    CompatLayer.__super__.constructor.call(this, options);
  }

  CompatLayer.define("superView", compatProperty("superLayer", "superView"));

  CompatLayer.define("subViews", compatProperty("subLayers", "subViews"));

  CompatLayer.define("siblingViews", compatProperty("siblingLayers", "siblingViews"));

  addSubView = function(layer) {
    return this.addSubLayer(layer);
  };

  removeSubView = function(layer) {
    return this.removeSubLayer(layer);
  };

  return CompatLayer;

})(Layer);

CompatView = (function(_super) {
  __extends(CompatView, _super);

  function CompatView(options) {
    if (options == null) {
      options = {};
    }
    compatWarning("Views are now called Layers");
    CompatView.__super__.constructor.call(this, options);
  }

  return CompatView;

})(CompatLayer);

CompatImageView = (function(_super) {
  __extends(CompatImageView, _super);

  function CompatImageView() {
    _ref = CompatImageView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  return CompatImageView;

})(CompatView);

CompatScrollView = (function(_super) {
  __extends(CompatScrollView, _super);

  function CompatScrollView() {
    CompatScrollView.__super__.constructor.apply(this, arguments);
    this.scroll = true;
  }

  return CompatScrollView;

})(CompatView);

window.Layer = CompatLayer;

window.Framer.Layer = CompatLayer;

window.View = CompatView;

window.ImageView = CompatImageView;

window.ScrollView = CompatScrollView;

window.utils = window.Utils;


},{"./Layer":22}],11:[function(require,module,exports){
var Utils;

Utils = require("./Utils");

exports.Config = {
  targetFPS: 60,
  rootBaseCSS: {
    "-webkit-perspective": 1000,
    "position": "absolute",
    "left": 0,
    "top": 0,
    "right": 0,
    "bottom": 0
  },
  layerBaseCSS: {
    "display": "block",
    "position": "absolute",
    "-webkit-box-sizing": "border-box",
    "-webkit-user-select": "none",
    "background-repeat": "no-repeat",
    "background-size": "cover",
    "-webkit-overflow-scrolling": "touch"
  }
};


},{"./Utils":30}],12:[function(require,module,exports){
var EventKeys, Utils, createDebugLayer, errorWarning, hideDebug, showDebug, toggleDebug, _debugLayers, _errorWarningLayer;

Utils = require("./Utils");

_debugLayers = null;

createDebugLayer = function(layer) {
  var overLayer;
  overLayer = new Layer({
    frame: layer.screenFrame,
    backgroundColor: "rgba(50,150,200,.35)"
  });
  overLayer.style = {
    textAlign: "center",
    color: "white",
    font: "10px/1em Monaco",
    lineHeight: "" + (overLayer.height + 1) + "px",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,.5)"
  };
  overLayer.html = layer.name || layer.id;
  overLayer.on(Events.Click, function(event, layer) {
    layer.scale = 0.8;
    return layer.animate({
      properties: {
        scale: 1
      },
      curve: "spring(1000,10,0)"
    });
  });
  return overLayer;
};

showDebug = function() {
  return _debugLayers = Layer.Layers().map(createDebugLayer);
};

hideDebug = function() {
  return _debugLayers.map(function(layer) {
    return layer.destroy();
  });
};

toggleDebug = Utils.toggle(showDebug, hideDebug);

EventKeys = {
  Shift: 16,
  Escape: 27
};

window.document.onkeyup = function(event) {
  if (event.keyCode === EventKeys.Escape) {
    return toggleDebug()();
  }
};

_errorWarningLayer = null;

errorWarning = function() {
  var layer;
  if (_errorWarningLayer) {
    return;
  }
  layer = new Layer({
    x: 20,
    y: -50,
    width: 300,
    height: 40
  });
  layer.states.add({
    visible: {
      x: 20,
      y: 20,
      width: 300,
      height: 40
    }
  });
  layer.html = "Javascript Error, see the console";
  layer.style = {
    font: "12px/1.35em Menlo",
    color: "white",
    textAlign: "center",
    lineHeight: "" + layer.height + "px",
    borderRadius: "5px",
    backgroundColor: "rgba(255,0,0,.8)"
  };
  layer.states.animationOptions = {
    curve: "spring",
    curveOptions: {
      tension: 1000,
      friction: 30
    }
  };
  layer.states["switch"]("visible");
  layer.on(Events.Click, function() {
    return this.states["switch"]("default");
  });
  return _errorWarningLayer = layer;
};

window.onerror = errorWarning;


},{"./Utils":30}],13:[function(require,module,exports){
var Originals, Utils, _;

_ = require("./Underscore")._;

Utils = require("./Utils");

Originals = {
  Layer: {
    backgroundColor: "rgba(0,124,255,.5)",
    width: 100,
    height: 100
  },
  Animation: {
    curve: "linear",
    time: 1
  }
};

exports.Defaults = {
  getDefaults: function(className, options) {
    var defaults, k, v, _ref;
    defaults = _.clone(Originals[className]);
    _ref = Framer.Defaults[className];
    for (k in _ref) {
      v = _ref[k];
      defaults[k] = _.isFunction(v) ? v() : v;
    }
    for (k in defaults) {
      v = defaults[k];
      if (!options.hasOwnProperty(k)) {
        options[k] = v;
      }
    }
    return options;
  },
  reset: function() {
    return window.Framer.Defaults = _.clone(Originals);
  }
};


},{"./Underscore":29,"./Utils":30}],14:[function(require,module,exports){
var EventEmitterEventsKey, _,
  __slice = [].slice;

_ = require("./Underscore")._;

EventEmitterEventsKey = "_events";

exports.EventEmitter = (function() {
  function EventEmitter() {
    this[EventEmitterEventsKey] = {};
  }

  EventEmitter.prototype._eventCheck = function(event, method) {
    if (!event) {
      return console.warn("" + this.constructor.name + "." + method + " missing event (like 'click')");
    }
  };

  EventEmitter.prototype.emit = function() {
    var args, event, listener, _i, _len, _ref, _ref1;
    event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (!((_ref = this[EventEmitterEventsKey]) != null ? _ref[event] : void 0)) {
      return;
    }
    _ref1 = this[EventEmitterEventsKey][event];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      listener = _ref1[_i];
      listener.apply(null, args);
    }
  };

  EventEmitter.prototype.addListener = function(event, listener) {
    var _base;
    this._eventCheck(event, "addListener");
    if (this[EventEmitterEventsKey] == null) {
      this[EventEmitterEventsKey] = {};
    }
    if ((_base = this[EventEmitterEventsKey])[event] == null) {
      _base[event] = [];
    }
    return this[EventEmitterEventsKey][event].push(listener);
  };

  EventEmitter.prototype.removeListener = function(event, listener) {
    this._eventCheck(event, "removeListener");
    if (!this[EventEmitterEventsKey]) {
      return;
    }
    if (!this[EventEmitterEventsKey][event]) {
      return;
    }
    this[EventEmitterEventsKey][event] = _.without(this[EventEmitterEventsKey][event], listener);
  };

  EventEmitter.prototype.once = function(event, listener) {
    var fn,
      _this = this;
    fn = function() {
      _this.removeListener(event, fn);
      return listener.apply(null, arguments);
    };
    return this.on(event, fn);
  };

  EventEmitter.prototype.removeAllListeners = function(event) {
    var listener, _i, _len, _ref;
    if (!this[EventEmitterEventsKey]) {
      return;
    }
    if (!this[EventEmitterEventsKey][event]) {
      return;
    }
    _ref = this[EventEmitterEventsKey][event];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      listener = _ref[_i];
      this.removeListener(event, listener);
    }
  };

  EventEmitter.prototype.on = EventEmitter.prototype.addListener;

  EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

  return EventEmitter;

})();


},{"./Underscore":29}],15:[function(require,module,exports){
var Events, Utils, _;

_ = require("./Underscore")._;

Utils = require("./Utils");

Events = {};

if (Utils.isTouch()) {
  Events.TouchStart = "touchstart";
  Events.TouchEnd = "touchend";
  Events.TouchMove = "touchmove";
} else {
  Events.TouchStart = "mousedown";
  Events.TouchEnd = "mouseup";
  Events.TouchMove = "mousemove";
}

Events.Click = Events.TouchEnd;

Events.MouseOver = "mouseover";

Events.MouseOut = "mouseout";

Events.AnimationStart = "start";

Events.AnimationStop = "stop";

Events.AnimationEnd = "end";

Events.Scroll = "scroll";

Events.touchEvent = function(event) {
  var touchEvent, _ref, _ref1;
  touchEvent = (_ref = event.touches) != null ? _ref[0] : void 0;
  if (touchEvent == null) {
    touchEvent = (_ref1 = event.changedTouches) != null ? _ref1[0] : void 0;
  }
  if (touchEvent == null) {
    touchEvent = event;
  }
  return touchEvent;
};

exports.Events = Events;


},{"./Underscore":29,"./Utils":30}],16:[function(require,module,exports){
exports.MobileScrollFix = require("./MobileScrollFix");

exports.OmitNew = require("./OmitNew");


},{"./MobileScrollFix":17,"./OmitNew":18}],17:[function(require,module,exports){
var Utils,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Utils = require("../Utils");

exports.enable = function() {
  var MobileScrollFixLayer, handleScrollingLayerTouchMove, handleScrollingLayerTouchStart;
  handleScrollingLayerTouchMove = function(event) {
    return event.stopPropagation();
  };
  handleScrollingLayerTouchStart = function(event) {
    var element, startTopScroll;
    element = this._element;
    startTopScroll = element.scrollTop;
    if (startTopScroll <= 0) {
      element.scrollTop = 1;
    }
    if (startTopScroll + element.offsetHeight >= element.scrollHeight) {
      return element.scrollTop = element.scrollHeight - element.offsetHeight - 1;
    }
  };
  MobileScrollFixLayer = (function(_super) {
    __extends(MobileScrollFixLayer, _super);

    function MobileScrollFixLayer(options) {
      this.__createRootElement = __bind(this.__createRootElement, this);
      this._updateScrollListeners = __bind(this._updateScrollListeners, this);
      MobileScrollFixLayer.__super__.constructor.call(this, options);
      this.on("change:scrollVertical", this._updateScrollListeners);
      this._updateScrollListeners();
    }

    MobileScrollFixLayer.prototype._updateScrollListeners = function() {
      if (this.scrollVertical === true) {
        this.on("touchmove", handleScrollingLayerTouchMove);
        return this.on("touchstart", handleScrollingLayerTouchStart);
      } else {
        this.off("touchmove", handleScrollingLayerTouchMove);
        return this.off("touchstart", handleScrollingLayerTouchStart);
      }
    };

    MobileScrollFixLayer.prototype.__createRootElement = function() {
      var rootElement;
      rootElement = MobileScrollFixLayer.__super__.__createRootElement.apply(this, arguments);
      rootElement.addEventListener("touchmove", function(event) {
        return event.preventDefault();
      });
      return rootElement;
    };

    return MobileScrollFixLayer;

  })(Framer.Layer);
  return window.Layer = window.Framer.Layer = MobileScrollFixLayer;
};


},{"../Utils":30}],18:[function(require,module,exports){
var __slice = [].slice;

exports.enable = function(module) {
  var ClassWrapper;
  if (module == null) {
    module = window;
  }
  ClassWrapper = function(Klass) {
    return function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.prototype = (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(Klass, args, function(){});
    };
  };
  module.Frame = ClassWrapper(Framer.Frame);
  module.Layer = ClassWrapper(Framer.Layer);
  module.BackgroundLayer = ClassWrapper(Framer.BackgroundLayer);
  module.VideoLayer = ClassWrapper(Framer.VideoLayer);
  return module.Animation = ClassWrapper(Framer.Animation);
};


},{}],19:[function(require,module,exports){
var BaseClass,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseClass = require("./BaseClass").BaseClass;

exports.Frame = (function(_super) {
  __extends(Frame, _super);

  Frame.define("x", Frame.simpleProperty("x", 0));

  Frame.define("y", Frame.simpleProperty("y", 0));

  Frame.define("width", Frame.simpleProperty("width", 0));

  Frame.define("height", Frame.simpleProperty("height", 0));

  Frame.define("minX", Frame.simpleProperty("x", 0, false));

  Frame.define("minY", Frame.simpleProperty("y", 0, false));

  function Frame(options) {
    var k, _i, _len, _ref;
    if (options == null) {
      options = {};
    }
    Frame.__super__.constructor.call(this, options);
    _ref = ["minX", "midX", "maxX", "minY", "midY", "maxY"];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      k = _ref[_i];
      if (options.hasOwnProperty(k)) {
        this[k] = options[k];
      }
    }
  }

  Frame.define("midX", {
    get: function() {
      return Utils.frameGetMidX(this);
    },
    set: function(value) {
      return Utils.frameSetMidX(this, value);
    }
  });

  Frame.define("maxX", {
    get: function() {
      return Utils.frameGetMaxX(this);
    },
    set: function(value) {
      return Utils.frameSetMaxX(this, value);
    }
  });

  Frame.define("midY", {
    get: function() {
      return Utils.frameGetMidY(this);
    },
    set: function(value) {
      return Utils.frameSetMidY(this, value);
    }
  });

  Frame.define("maxY", {
    get: function() {
      return Utils.frameGetMaxY(this);
    },
    set: function(value) {
      return Utils.frameSetMaxY(this, value);
    }
  });

  return Frame;

})(BaseClass);


},{"./BaseClass":9}],20:[function(require,module,exports){
var Defaults, Framer, _;

_ = require("./Underscore")._;

Framer = {};

Framer._ = _;

Framer.Utils = require("./Utils");

Framer.Frame = (require("./Frame")).Frame;

Framer.Layer = (require("./Layer")).Layer;

Framer.BackgroundLayer = (require("./BackgroundLayer")).BackgroundLayer;

Framer.VideoLayer = (require("./VideoLayer")).VideoLayer;

Framer.Events = (require("./Events")).Events;

Framer.Animation = (require("./Animation")).Animation;

Framer.Screen = (require("./Screen")).Screen;

Framer.print = (require("./Print")).print;

if (window) {
  _.extend(window, Framer);
}

Framer.Config = (require("./Config")).Config;

Framer.EventEmitter = (require("./EventEmitter")).EventEmitter;

Framer.BaseClass = (require("./BaseClass")).BaseClass;

Framer.LayerStyle = (require("./LayerStyle")).LayerStyle;

Framer.AnimationLoop = (require("./AnimationLoop")).AnimationLoop;

Framer.LinearAnimator = (require("./Animators/LinearAnimator")).LinearAnimator;

Framer.BezierCurveAnimator = (require("./Animators/BezierCurveAnimator")).BezierCurveAnimator;

Framer.SpringDHOAnimator = (require("./Animators/SpringDHOAnimator")).SpringDHOAnimator;

Framer.SpringRK4Animator = (require("./Animators/SpringRK4Animator")).SpringRK4Animator;

Framer.Importer = (require("./Importer")).Importer;

Framer.Debug = (require("./Debug")).Debug;

Framer.Session = (require("./Session")).Session;

Framer.Extras = require("./Extras/Extras");

if (window) {
  window.Framer = Framer;
}

require("./Compat");

if (Utils.isMobile()) {
  Framer.Extras.MobileScrollFix.enable();
}

Defaults = (require("./Defaults")).Defaults;

Framer.resetDefaults = Defaults.reset;

Framer.resetDefaults();


},{"./Animation":1,"./AnimationLoop":2,"./Animators/BezierCurveAnimator":4,"./Animators/LinearAnimator":5,"./Animators/SpringDHOAnimator":6,"./Animators/SpringRK4Animator":7,"./BackgroundLayer":8,"./BaseClass":9,"./Compat":10,"./Config":11,"./Debug":12,"./Defaults":13,"./EventEmitter":14,"./Events":15,"./Extras/Extras":16,"./Frame":19,"./Importer":21,"./Layer":22,"./LayerStyle":25,"./Print":26,"./Screen":27,"./Session":28,"./Underscore":29,"./Utils":30,"./VideoLayer":31}],21:[function(require,module,exports){
var ChromeAlert, Utils, _;

_ = require("./Underscore")._;

Utils = require("./Utils");

ChromeAlert = "Importing layers is currently only supported on Safari. If you really want it to work with Chrome quit it, open a terminal and run:\nopen -a Google\ Chrome -–allow-file-access-from-files";

exports.Importer = (function() {
  function Importer(path, extraLayerProperties) {
    this.path = path;
    this.extraLayerProperties = extraLayerProperties != null ? extraLayerProperties : {};
    this.paths = {
      layerInfo: Utils.pathJoin(this.path, "layers.json"),
      images: Utils.pathJoin(this.path, "images"),
      documentName: this.path.split("/").pop()
    };
    this._createdLayers = [];
    this._createdLayersByName = {};
  }

  Importer.prototype.load = function() {
    var layer, layerInfo, layersByName, _i, _j, _len, _len1, _ref, _ref1,
      _this = this;
    layersByName = {};
    layerInfo = this._loadlayerInfo();
    layerInfo.map(function(layerItemInfo) {
      return _this._createLayer(layerItemInfo);
    });
    _ref = this._createdLayers;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      layer = _ref[_i];
      this._correctLayer(layer);
    }
    _ref1 = this._createdLayers;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      layer = _ref1[_j];
      if (!layer.superLayer) {
        layer.superLayer = null;
      }
    }
    return this._createdLayersByName;
  };

  Importer.prototype._loadlayerInfo = function() {
    var importedKey, _ref;
    importedKey = "" + this.paths.documentName + "/layers.json.js";
    if ((_ref = window.__imported__) != null ? _ref.hasOwnProperty(importedKey) : void 0) {
      return window.__imported__[importedKey];
    }
    return Framer.Utils.domLoadJSONSync(this.paths.layerInfo);
  };

  Importer.prototype._createLayer = function(info, superLayer) {
    var LayerClass, layer, layerInfo, _ref,
      _this = this;
    LayerClass = Layer;
    layerInfo = {
      shadow: true,
      name: info.name,
      frame: info.layerFrame,
      clip: false,
      backgroundColor: null,
      visible: (_ref = info.visible) != null ? _ref : true
    };
    _.extend(layerInfo, this.extraLayerProperties);
    if (info.image) {
      layerInfo.frame = info.image.frame;
      layerInfo.image = Utils.pathJoin(this.path, info.image.path);
    }
    if (info.maskFrame) {
      layerInfo.frame = info.maskFrame;
      layerInfo.clip = true;
    }
    if (superLayer != null ? superLayer.contentLayer : void 0) {
      layerInfo.superLayer = superLayer.contentLayer;
    } else if (superLayer) {
      layerInfo.superLayer = superLayer;
    }
    layer = new LayerClass(layerInfo);
    layer.name = layerInfo.name;
    if (!layer.image && !info.children.length && !info.maskFrame) {
      layer.frame = new Frame;
    }
    info.children.reverse().map(function(info) {
      return _this._createLayer(info, layer);
    });
    if (!layer.image && !info.maskFrame) {
      layer.frame = layer.contentFrame();
    }
    layer._info = info;
    this._createdLayers.push(layer);
    return this._createdLayersByName[layer.name] = layer;
  };

  Importer.prototype._correctLayer = function(layer) {
    var traverse;
    traverse = function(layer) {
      var subLayer, _i, _len, _ref, _results;
      if (layer.superLayer) {
        layer.frame = Utils.convertPoint(layer.frame, null, layer.superLayer);
      }
      _ref = layer.subLayers;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        subLayer = _ref[_i];
        _results.push(traverse(subLayer));
      }
      return _results;
    };
    if (!layer.superLayer) {
      return traverse(layer);
    }
  };

  return Importer;

})();

exports.Importer.load = function(path) {
  var importer;
  importer = new exports.Importer(path);
  return importer.load();
};


},{"./Underscore":29,"./Utils":30}],22:[function(require,module,exports){
var Animation, BaseClass, Config, Defaults, EventEmitter, Frame, LayerDraggable, LayerStates, LayerStyle, Session, Utils, layerProperty, layerStyleProperty, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
  __slice = [].slice;

_ = require("./Underscore")._;

Utils = require("./Utils");

Config = require("./Config").Config;

Defaults = require("./Defaults").Defaults;

Session = require("./Session").Session;

BaseClass = require("./BaseClass").BaseClass;

EventEmitter = require("./EventEmitter").EventEmitter;

Animation = require("./Animation").Animation;

Frame = require("./Frame").Frame;

LayerStyle = require("./LayerStyle").LayerStyle;

LayerStates = require("./LayerStates").LayerStates;

LayerDraggable = require("./LayerDraggable").LayerDraggable;

Session._RootElement = null;

Session._LayerList = [];

layerProperty = function(name, cssProperty, fallback, validator, set) {
  return {
    exportable: true,
    "default": fallback,
    get: function() {
      return this._getPropertyValue(name);
    },
    set: function(value) {
      if ((typeof validator === "function" ? validator(value) : void 0) === false) {
        throw Error("value '" + value + "' of type " + (typeof value) + " is not valid for a Layer." + name + " property");
      }
      this._setPropertyValue(name, value);
      this.style[cssProperty] = LayerStyle[cssProperty](this);
      this.emit("change:" + name, value);
      if (set) {
        return set(this, value);
      }
    }
  };
};

layerStyleProperty = function(cssProperty) {
  return {
    exportable: true,
    get: function() {
      return this.style[cssProperty];
    },
    set: function(value) {
      this.style[cssProperty] = value;
      return this.emit("change:" + cssProperty, value);
    }
  };
};

exports.Layer = (function(_super) {
  __extends(Layer, _super);

  function Layer(options) {
    var k, _i, _len, _ref;
    if (options == null) {
      options = {};
    }
    this.addListener = __bind(this.addListener, this);
    this.__insertElement = __bind(this.__insertElement, this);
    this.__createRootElement = __bind(this.__createRootElement, this);
    Session._LayerList.push(this);
    this._prefer2d = false;
    this._createElement();
    this._setDefaultCSS();
    if (options.hasOwnProperty("frame")) {
      options = _.extend(options, options.frame);
    }
    options = Defaults.getDefaults("Layer", options);
    Layer.__super__.constructor.call(this, options);
    this._element.id = "FramerLayer-" + this.id;
    _ref = ["minX", "midX", "maxX", "minY", "midY", "maxY"];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      k = _ref[_i];
      if (options.hasOwnProperty(k)) {
        this[k] = options[k];
      }
    }
    if (!options.superLayer) {
      this.bringToFront();
      if (!options.shadow) {
        this._insertElement();
      }
    } else {
      this.superLayer = options.superLayer;
    }
    this._subLayers = [];
  }

  Layer.define("width", layerProperty("width", "width", 100, _.isNumber));

  Layer.define("height", layerProperty("height", "height", 100, _.isNumber));

  Layer.define("visible", layerProperty("visible", "display", true, _.isBool));

  Layer.define("opacity", layerProperty("opacity", "opacity", 1, _.isNumber));

  Layer.define("index", layerProperty("index", "zIndex", 0, _.isNumber));

  Layer.define("clip", layerProperty("clip", "overflow", true, _.isBool));

  Layer.define("scrollHorizontal", layerProperty("scrollHorizontal", "overflowX", false, _.isBool, function(layer, value) {
    if (value === true) {
      return layer.ignoreEvents = false;
    }
  }));

  Layer.define("scrollVertical", layerProperty("scrollVertical", "overflowY", false, _.isBool, function(layer, value) {
    if (value === true) {
      return layer.ignoreEvents = false;
    }
  }));

  Layer.define("scroll", {
    get: function() {
      return this.scrollHorizontal === true || this.scrollVertical === true;
    },
    set: function(value) {
      return this.scrollHorizontal = this.scrollVertical = true;
    }
  });

  Layer.define("ignoreEvents", layerProperty("ignoreEvents", "pointerEvents", true, _.isBool));

  Layer.define("x", layerProperty("x", "webkitTransform", 0, _.isNumber));

  Layer.define("y", layerProperty("y", "webkitTransform", 0, _.isNumber));

  Layer.define("z", layerProperty("z", "webkitTransform", 0, _.isNumber));

  Layer.define("scaleX", layerProperty("scaleX", "webkitTransform", 1, _.isNumber));

  Layer.define("scaleY", layerProperty("scaleY", "webkitTransform", 1, _.isNumber));

  Layer.define("scaleZ", layerProperty("scaleZ", "webkitTransform", 1, _.isNumber));

  Layer.define("scale", layerProperty("scale", "webkitTransform", 1, _.isNumber));

  Layer.define("skewX", layerProperty("skewX", "webkitTransform", 0, _.isNumber));

  Layer.define("skewY", layerProperty("skewY", "webkitTransform", 0, _.isNumber));

  Layer.define("skew", layerProperty("skew", "webkitTransform", 0, _.isNumber));

  Layer.define("originX", layerProperty("originX", "webkitTransformOrigin", 0.5, _.isNumber));

  Layer.define("originY", layerProperty("originY", "webkitTransformOrigin", 0.5, _.isNumber));

  Layer.define("rotationX", layerProperty("rotationX", "webkitTransform", 0, _.isNumber));

  Layer.define("rotationY", layerProperty("rotationY", "webkitTransform", 0, _.isNumber));

  Layer.define("rotationZ", layerProperty("rotationZ", "webkitTransform", 0, _.isNumber));

  Layer.define("rotation", layerProperty("rotationZ", "webkitTransform", 0, _.isNumber));

  Layer.define("blur", layerProperty("blur", "webkitFilter", 0, _.isNumber));

  Layer.define("brightness", layerProperty("brightness", "webkitFilter", 100, _.isNumber));

  Layer.define("saturate", layerProperty("saturate", "webkitFilter", 100, _.isNumber));

  Layer.define("hueRotate", layerProperty("hueRotate", "webkitFilter", 0, _.isNumber));

  Layer.define("contrast", layerProperty("contrast", "webkitFilter", 100, _.isNumber));

  Layer.define("invert", layerProperty("invert", "webkitFilter", 0, _.isNumber));

  Layer.define("grayscale", layerProperty("grayscale", "webkitFilter", 0, _.isNumber));

  Layer.define("sepia", layerProperty("sepia", "webkitFilter", 0, _.isNumber));

  Layer.define("shadowX", layerProperty("shadowX", "boxShadow", 0, _.isNumber));

  Layer.define("shadowY", layerProperty("shadowY", "boxShadow", 0, _.isNumber));

  Layer.define("shadowBlur", layerProperty("shadowBlur", "boxShadow", 0, _.isNumber));

  Layer.define("shadowSpread", layerProperty("shadowSpread", "boxShadow", 0, _.isNumber));

  Layer.define("shadowColor", layerProperty("shadowColor", "boxShadow", ""));

  Layer.define("backgroundColor", layerStyleProperty("backgroundColor"));

  Layer.define("color", layerStyleProperty("color"));

  Layer.define("borderRadius", layerStyleProperty("borderRadius"));

  Layer.define("borderColor", layerStyleProperty("borderColor"));

  Layer.define("borderWidth", layerStyleProperty("borderWidth"));

  Layer.define("name", {
    exportable: true,
    "default": "",
    get: function() {
      return this._getPropertyValue("name");
    },
    set: function(value) {
      this._setPropertyValue("name", value);
      return this._element.setAttribute("name", value);
    }
  });

  Layer.define("frame", {
    get: function() {
      return _.pick(this, ["x", "y", "width", "height"]);
    },
    set: function(frame) {
      var k, _i, _len, _ref, _results;
      if (!frame) {
        return;
      }
      _ref = ["x", "y", "width", "height"];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        k = _ref[_i];
        if (frame.hasOwnProperty(k)) {
          _results.push(this[k] = frame[k]);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }
  });

  Layer.define("minX", {
    get: function() {
      return this.x;
    },
    set: function(value) {
      return this.x = value;
    }
  });

  Layer.define("midX", {
    get: function() {
      return Utils.frameGetMidX(this);
    },
    set: function(value) {
      return Utils.frameSetMidX(this, value);
    }
  });

  Layer.define("maxX", {
    get: function() {
      return Utils.frameGetMaxX(this);
    },
    set: function(value) {
      return Utils.frameSetMaxX(this, value);
    }
  });

  Layer.define("minY", {
    get: function() {
      return this.y;
    },
    set: function(value) {
      return this.y = value;
    }
  });

  Layer.define("midY", {
    get: function() {
      return Utils.frameGetMidY(this);
    },
    set: function(value) {
      return Utils.frameSetMidY(this, value);
    }
  });

  Layer.define("maxY", {
    get: function() {
      return Utils.frameGetMaxY(this);
    },
    set: function(value) {
      return Utils.frameSetMaxY(this, value);
    }
  });

  Layer.prototype.convertPoint = function(point) {
    return Utils.convertPoint(point, null, this);
  };

  Layer.define("screenFrame", {
    get: function() {
      return Utils.convertPoint(this.frame, this, null);
    },
    set: function(frame) {
      if (!this.superLayer) {
        return this.frame = frame;
      } else {
        return this.frame = Utils.convertPoint(frame, null, this.superLayer);
      }
    }
  });

  Layer.prototype.contentFrame = function() {
    return Utils.frameMerge(_.pluck(this.subLayers, "frame"));
  };

  Layer.prototype.centerFrame = function() {
    var frame;
    if (this.superLayer) {
      frame = this.frame;
      Utils.frameSetMidX(frame, parseInt(this.superLayer.width / 2.0));
      Utils.frameSetMidY(frame, parseInt(this.superLayer.height / 2.0));
      return frame;
    } else {
      frame = this.frame;
      Utils.frameSetMidX(frame, parseInt(window.innerWidth / 2.0));
      Utils.frameSetMidY(frame, parseInt(window.innerHeight / 2.0));
      return frame;
    }
  };

  Layer.prototype.center = function() {
    this.frame = this.centerFrame();
    return this;
  };

  Layer.prototype.centerX = function(offset) {
    if (offset == null) {
      offset = 0;
    }
    this.x = this.centerFrame().x + offset;
    return this;
  };

  Layer.prototype.centerY = function(offset) {
    if (offset == null) {
      offset = 0;
    }
    this.y = this.centerFrame().y + offset;
    return this;
  };

  Layer.prototype.pixelAlign = function() {
    this.x = parseInt(this.x);
    return this.y = parseInt(this.y);
  };

  Layer.define("style", {
    get: function() {
      return this._element.style;
    },
    set: function(value) {
      _.extend(this._element.style, value);
      return this.emit("change:style");
    }
  });

  Layer.define("html", {
    get: function() {
      var _ref;
      return (_ref = this._elementHTML) != null ? _ref.innerHTML : void 0;
    },
    set: function(value) {
      if (!this._elementHTML) {
        this._elementHTML = document.createElement("div");
        this._element.appendChild(this._elementHTML);
      }
      this._elementHTML.innerHTML = value;
      if (!(this._elementHTML.childNodes.length === 1 && this._elementHTML.childNodes[0].nodeName === "#text")) {
        this.ignoreEvents = false;
      }
      return this.emit("change:html");
    }
  });

  Layer.prototype.computedStyle = function() {
    return document.defaultView.getComputedStyle(this._element);
  };

  Layer.prototype._setDefaultCSS = function() {
    return this.style = Config.layerBaseCSS;
  };

  Layer.define("classList", {
    get: function() {
      return this._element.classList;
    }
  });

  Layer.prototype._createElement = function() {
    if (this._element != null) {
      return;
    }
    return this._element = document.createElement("div");
  };

  Layer.prototype._insertElement = function() {
    return Utils.domComplete(this.__insertElement);
  };

  Layer.prototype.__createRootElement = function() {
    var element;
    element = document.createElement("div");
    element.id = "FramerRoot";
    _.extend(element.style, Config.rootBaseCSS);
    document.body.appendChild(element);
    return element;
  };

  Layer.prototype.__insertElement = function() {
    if (Session._RootElement == null) {
      Session._RootElement = this.__createRootElement();
    }
    return Session._RootElement.appendChild(this._element);
  };

  Layer.prototype.destroy = function() {
    var _ref;
    if (this.superLayer) {
      this.superLayer._subLayers = _.without(this.superLayer._subLayers, this);
    }
    if ((_ref = this._element.parentNode) != null) {
      _ref.removeChild(this._element);
    }
    this.removeAllListeners();
    return Session._LayerList = _.without(Session._LayerList, this);
  };

  Layer.prototype.copy = function() {
    var copiedSublayer, layer, subLayer, _i, _len, _ref;
    layer = this.copySingle();
    _ref = this.subLayers;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      subLayer = _ref[_i];
      copiedSublayer = subLayer.copy();
      copiedSublayer.superLayer = layer;
    }
    return layer;
  };

  Layer.prototype.copySingle = function() {
    return new Layer(this.properties);
  };

  Layer.prototype.animate = function(options) {
    var animation;
    options.layer = this;
    options.curveOptions = options;
    animation = new Animation(options);
    animation.start();
    return animation;
  };

  Layer.define("image", {
    exportable: true,
    "default": "",
    get: function() {
      return this._getPropertyValue("image");
    },
    set: function(value) {
      var currentValue, imageUrl, loader, _ref, _ref1,
        _this = this;
      currentValue = this._getPropertyValue("image");
      if (currentValue === value) {
        return this.emit("load");
      }
      this.backgroundColor = null;
      this._setPropertyValue("image", value);
      imageUrl = value;
      if (Utils.isLocal() && !imageUrl.match(/^https?:\/\//)) {
        imageUrl += "?nocache=" + (Date.now());
      }
      if ((_ref = this.events) != null ? _ref.hasOwnProperty("load" || ((_ref1 = this.events) != null ? _ref1.hasOwnProperty("error") : void 0)) : void 0) {
        loader = new Image();
        loader.name = imageUrl;
        loader.src = imageUrl;
        loader.onload = function() {
          _this.style["background-image"] = "url('" + imageUrl + "')";
          return _this.emit("load", loader);
        };
        return loader.onerror = function() {
          return _this.emit("error", loader);
        };
      } else {
        return this.style["background-image"] = "url('" + imageUrl + "')";
      }
    }
  });

  Layer.define("superLayer", {
    exportable: false,
    get: function() {
      return this._superLayer || null;
    },
    set: function(layer) {
      if (layer === this._superLayer) {
        return;
      }
      if (!layer instanceof Layer) {
        throw Error("Layer.superLayer needs to be a Layer object");
      }
      Utils.domCompleteCancel(this.__insertElement);
      if (this._superLayer) {
        this._superLayer._subLayers = _.without(this._superLayer._subLayers, this);
        this._superLayer._element.removeChild(this._element);
        this._superLayer.emit("change:subLayers", {
          added: [],
          removed: [this]
        });
      }
      if (layer) {
        layer._element.appendChild(this._element);
        layer._subLayers.push(this);
        layer.emit("change:subLayers", {
          added: [this],
          removed: []
        });
      } else {
        this._insertElement();
      }
      this._superLayer = layer;
      this.bringToFront();
      return this.emit("change:superLayer");
    }
  });

  Layer.prototype.superLayers = function() {
    var recurse, superLayers;
    superLayers = [];
    recurse = function(layer) {
      if (!layer.superLayer) {
        return;
      }
      superLayers.push(layer.superLayer);
      return recurse(layer.superLayer);
    };
    recurse(this);
    return superLayers;
  };

  Layer.define("subLayers", {
    exportable: false,
    get: function() {
      return _.clone(this._subLayers);
    }
  });

  Layer.define("siblingLayers", {
    exportable: false,
    get: function() {
      var _this = this;
      if (this.superLayer === null) {
        return _.filter(Session._LayerList, function(layer) {
          return layer !== _this && layer.superLayer === null;
        });
      }
      return _.without(this.superLayer.subLayers, this);
    }
  });

  Layer.prototype.addSubLayer = function(layer) {
    return layer.superLayer = this;
  };

  Layer.prototype.removeSubLayer = function(layer) {
    if (__indexOf.call(this.subLayers, layer) < 0) {
      return;
    }
    return layer.superLayer = null;
  };

  Layer.prototype.subLayersByName = function(name) {
    return _.filter(this.subLayers, function(layer) {
      return layer.name === name;
    });
  };

  Layer.prototype.animate = function(options) {
    var animation, start;
    start = options.start;
    if (start == null) {
      start = true;
    }
    delete options.start;
    options.layer = this;
    animation = new Animation(options);
    if (start) {
      animation.start();
    }
    return animation;
  };

  Layer.prototype.animations = function() {
    var _this = this;
    return _.filter(Animation.runningAnimations(), function(a) {
      return a.options.layer === _this;
    });
  };

  Layer.prototype.animateStop = function() {
    return _.invoke(this.animations(), "stop");
  };

  Layer.prototype.bringToFront = function() {
    return this.index = _.max(_.union([0], this.siblingLayers.map(function(layer) {
      return layer.index;
    }))) + 1;
  };

  Layer.prototype.sendToBack = function() {
    return this.index = _.min(_.union([0], this.siblingLayers.map(function(layer) {
      return layer.index;
    }))) - 1;
  };

  Layer.prototype.placeBefore = function(layer) {
    var l, _i, _len, _ref;
    if (__indexOf.call(this.siblingLayers, layer) < 0) {
      return;
    }
    _ref = this.siblingLayers;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      l = _ref[_i];
      if (l.index <= layer.index) {
        l.index -= 1;
      }
    }
    return this.index = layer.index + 1;
  };

  Layer.prototype.placeBehind = function(layer) {
    var l, _i, _len, _ref;
    if (__indexOf.call(this.siblingLayers, layer) < 0) {
      return;
    }
    _ref = this.siblingLayers;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      l = _ref[_i];
      if (l.index >= layer.index) {
        l.index += 1;
      }
    }
    return this.index = layer.index - 1;
  };

  Layer.define("states", {
    get: function() {
      return this._states != null ? this._states : this._states = new LayerStates(this);
    }
  });

  Layer.define("draggable", {
    get: function() {
      if (this._draggable == null) {
        this._draggable = new LayerDraggable(this);
      }
      return this._draggable;
    }
  });

  Layer.define("scrollFrame", {
    get: function() {
      return new Frame({
        x: this.scrollX,
        y: this.scrollY,
        width: this.width,
        height: this.height
      });
    },
    set: function(frame) {
      this.scrollX = frame.x;
      return this.scrollY = frame.y;
    }
  });

  Layer.define("scrollX", {
    get: function() {
      return this._element.scrollLeft;
    },
    set: function(value) {
      return this._element.scrollLeft = value;
    }
  });

  Layer.define("scrollY", {
    get: function() {
      return this._element.scrollTop;
    },
    set: function(value) {
      return this._element.scrollTop = value;
    }
  });

  Layer.prototype.addListener = function(eventName, originalListener) {
    var listener, _base,
      _this = this;
    listener = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return originalListener.call.apply(originalListener, [_this].concat(__slice.call(args), [_this]));
    };
    originalListener.modifiedListener = listener;
    Layer.__super__.addListener.call(this, eventName, listener);
    this._element.addEventListener(eventName, listener);
    if (this._eventListeners == null) {
      this._eventListeners = {};
    }
    if ((_base = this._eventListeners)[eventName] == null) {
      _base[eventName] = [];
    }
    this._eventListeners[eventName].push(listener);
    if (!_.startsWith(eventName, "change:")) {
      return this.ignoreEvents = false;
    }
  };

  Layer.prototype.removeListener = function(eventName, listener) {
    if (listener.modifiedListener) {
      listener = listener.modifiedListener;
    }
    Layer.__super__.removeListener.call(this, eventName, listener);
    this._element.removeEventListener(eventName, listener);
    if (this._eventListeners) {
      return this._eventListeners[eventName] = _.without(this._eventListeners[eventName], listener);
    }
  };

  Layer.prototype.removeAllListeners = function() {
    var eventName, listener, listeners, _ref, _results;
    if (!this._eventListeners) {
      return;
    }
    _ref = this._eventListeners;
    _results = [];
    for (eventName in _ref) {
      listeners = _ref[eventName];
      _results.push((function() {
        var _i, _len, _results1;
        _results1 = [];
        for (_i = 0, _len = listeners.length; _i < _len; _i++) {
          listener = listeners[_i];
          _results1.push(this.removeListener(eventName, listener));
        }
        return _results1;
      }).call(this));
    }
    return _results;
  };

  Layer.prototype.on = Layer.prototype.addListener;

  Layer.prototype.off = Layer.prototype.removeListener;

  return Layer;

})(BaseClass);

exports.Layer.Layers = function() {
  return _.clone(Session._LayerList);
};


},{"./Animation":1,"./BaseClass":9,"./Config":11,"./Defaults":13,"./EventEmitter":14,"./Frame":19,"./LayerDraggable":23,"./LayerStates":24,"./LayerStyle":25,"./Session":28,"./Underscore":29,"./Utils":30}],23:[function(require,module,exports){
var EventEmitter, Events, Utils, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require("./Underscore")._;

Utils = require("./Utils");

EventEmitter = require("./EventEmitter").EventEmitter;

Events = require("./Events").Events;

Events.DragStart = "dragstart";

Events.DragMove = "dragmove";

Events.DragEnd = "dragend";

"This takes any layer and makes it draggable by the user on mobile or desktop.\n\nSome interesting things are:\n\n- The draggable.calculateVelocity().x|y contains the current average speed \n  in the last 100ms (defined with VelocityTimeOut).\n- You can enable/disable or slowdown/speedup scrolling with\n  draggable.speed.x|y\n";

exports.LayerDraggable = (function(_super) {
  __extends(LayerDraggable, _super);

  LayerDraggable.VelocityTimeOut = 100;

  function LayerDraggable(layer) {
    this.layer = layer;
    this._touchEnd = __bind(this._touchEnd, this);
    this._touchStart = __bind(this._touchStart, this);
    this._updatePosition = __bind(this._updatePosition, this);
    this._deltas = [];
    this._isDragging = false;
    this.enabled = true;
    this.speedX = 1.0;
    this.speedY = 1.0;
    this.maxDragFrame = null;
    this.attach();
  }

  LayerDraggable.prototype.attach = function() {
    return this.layer.on(Events.TouchStart, this._touchStart);
  };

  LayerDraggable.prototype.remove = function() {
    return this.layer.off(Events.TouchStart, this._touchStart);
  };

  LayerDraggable.prototype.emit = function(eventName, event) {
    this.layer.emit(eventName, event);
    return LayerDraggable.__super__.emit.call(this, eventName, event);
  };

  LayerDraggable.prototype.calculateVelocity = function() {
    var curr, prev, time, timeSinceLastMove, velocity;
    if (this._deltas.length < 2) {
      return {
        x: 0,
        y: 0
      };
    }
    curr = this._deltas.slice(-1)[0];
    prev = this._deltas.slice(-2, -1)[0];
    time = curr.t - prev.t;
    timeSinceLastMove = new Date().getTime() - prev.t;
    if (timeSinceLastMove > this.VelocityTimeOut) {
      return {
        x: 0,
        y: 0
      };
    }
    velocity = {
      x: (curr.x - prev.x) / time,
      y: (curr.y - prev.y) / time
    };
    if (velocity.x === Infinity) {
      velocity.x = 0;
    }
    if (velocity.y === Infinity) {
      velocity.y = 0;
    }
    return velocity;
  };

  LayerDraggable.prototype._updatePosition = function(event) {
    var correctedDelta, delta, maxDragFrame, maxX, maxY, minX, minY, newX, newY, touchEvent,
      _this = this;
    if (this.enabled === false) {
      return;
    }
    this.emit(Events.DragMove, event);
    touchEvent = Events.touchEvent(event);
    delta = {
      x: touchEvent.clientX - this._start.x,
      y: touchEvent.clientY - this._start.y
    };
    correctedDelta = {
      x: delta.x * this.speedX,
      y: delta.y * this.speedY,
      t: event.timeStamp
    };
    newX = this._start.x + correctedDelta.x - this._offset.x;
    newY = this._start.y + correctedDelta.y - this._offset.y;
    if (this.maxDragFrame) {
      maxDragFrame = this.maxDragFrame;
      if (_.isFunction(maxDragFrame)) {
        maxDragFrame = maxDragFrame();
      }
      minX = Utils.frameGetMinX(this.maxDragFrame);
      maxX = Utils.frameGetMaxX(this.maxDragFrame) - this.layer.width;
      minY = Utils.frameGetMinY(this.maxDragFrame);
      maxY = Utils.frameGetMaxY(this.maxDragFrame) - this.layer.height;
      if (newX < minX) {
        newX = minX;
      }
      if (newX > maxX) {
        newX = maxX;
      }
      if (newY < minY) {
        newY = minY;
      }
      if (newY > maxY) {
        newY = maxY;
      }
    }
    window.requestAnimationFrame(function() {
      _this.layer.x = newX;
      return _this.layer.y = newY;
    });
    this._deltas.push(correctedDelta);
    return this.emit(Events.DragMove, event);
  };

  LayerDraggable.prototype._touchStart = function(event) {
    var touchEvent;
    this.layer.animateStop();
    this._isDragging = true;
    touchEvent = Events.touchEvent(event);
    this._start = {
      x: touchEvent.clientX,
      y: touchEvent.clientY
    };
    this._offset = {
      x: touchEvent.clientX - this.layer.x,
      y: touchEvent.clientY - this.layer.y
    };
    document.addEventListener(Events.TouchMove, this._updatePosition);
    document.addEventListener(Events.TouchEnd, this._touchEnd);
    return this.emit(Events.DragStart, event);
  };

  LayerDraggable.prototype._touchEnd = function(event) {
    this._isDragging = false;
    document.removeEventListener(Events.TouchMove, this._updatePosition);
    document.removeEventListener(Events.TouchEnd, this._touchEnd);
    this.emit(Events.DragEnd, event);
    return this._deltas = [];
  };

  return LayerDraggable;

})(EventEmitter);


},{"./EventEmitter":14,"./Events":15,"./Underscore":29,"./Utils":30}],24:[function(require,module,exports){
var BaseClass, Defaults, Events, LayerStatesIgnoredKeys, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
  __slice = [].slice;

_ = require("./Underscore")._;

Events = require("./Events").Events;

BaseClass = require("./BaseClass").BaseClass;

Defaults = require("./Defaults").Defaults;

LayerStatesIgnoredKeys = ["ignoreEvents"];

Events.StateWillSwitch = "willSwitch";

Events.StateDidSwitch = "didSwitch";

exports.LayerStates = (function(_super) {
  __extends(LayerStates, _super);

  function LayerStates(layer) {
    this.layer = layer;
    this._states = {};
    this._orderedStates = [];
    this.animationOptions = {};
    this.add("default", this.layer.properties);
    this._currentState = "default";
    this._previousStates = [];
    LayerStates.__super__.constructor.apply(this, arguments);
  }

  LayerStates.prototype.add = function(stateName, properties) {
    var error, k, v;
    if (_.isObject(stateName)) {
      for (k in stateName) {
        v = stateName[k];
        this.add(k, v);
      }
      return;
    }
    error = function() {
      throw Error("Usage example: layer.states.add(\"someName\", {x:500})");
    };
    if (!_.isString(stateName)) {
      error();
    }
    if (!_.isObject(properties)) {
      error();
    }
    this._orderedStates.push(stateName);
    return this._states[stateName] = properties;
  };

  LayerStates.prototype.remove = function(stateName) {
    if (!this._states.hasOwnProperty(stateName)) {
      return;
    }
    delete this._states[stateName];
    return this._orderedStates = _.without(this._orderedStates, stateName);
  };

  LayerStates.prototype["switch"] = function(stateName, animationOptions, instant) {
    var animatingKeys, properties, propertyName, value, _ref,
      _this = this;
    if (instant == null) {
      instant = false;
    }
    if (!this._states.hasOwnProperty(stateName)) {
      throw Error("No such state: '" + stateName + "'");
    }
    this.emit(Events.StateWillSwitch, this._currentState, stateName, this);
    this._previousStates.push(this._currentState);
    this._currentState = stateName;
    properties = {};
    animatingKeys = this.animatingKeys();
    _ref = this._states[stateName];
    for (propertyName in _ref) {
      value = _ref[propertyName];
      if (__indexOf.call(LayerStatesIgnoredKeys, propertyName) >= 0) {
        continue;
      }
      if (__indexOf.call(animatingKeys, propertyName) < 0) {
        continue;
      }
      if (_.isFunction(value)) {
        value = value.call(this.layer, this.layer, stateName);
      }
      properties[propertyName] = value;
    }
    if (instant === true) {
      this.layer.properties = properties;
      return this.emit(Events.StateDidSwitch, _.last(this._previousStates), stateName, this);
    } else {
      if (animationOptions == null) {
        animationOptions = this.animationOptions;
      }
      animationOptions.properties = properties;
      this._animation = this.layer.animate(animationOptions);
      return this._animation.on("stop", function() {
        return _this.emit(Events.StateDidSwitch, _.last(_this._previousStates), stateName, _this);
      });
    }
  };

  LayerStates.prototype.switchInstant = function(stateName) {
    return this["switch"](stateName, null, true);
  };

  LayerStates.define("state", {
    get: function() {
      return this._currentState;
    }
  });

  LayerStates.define("current", {
    get: function() {
      return this._currentState;
    }
  });

  LayerStates.prototype.states = function() {
    return _.clone(this._orderedStates);
  };

  LayerStates.prototype.animatingKeys = function() {
    var keys, state, stateName, _ref;
    keys = [];
    _ref = this._states;
    for (stateName in _ref) {
      state = _ref[stateName];
      if (stateName === "default") {
        continue;
      }
      keys = _.union(keys, _.keys(state));
    }
    return keys;
  };

  LayerStates.prototype.previous = function(states, animationOptions) {
    if (states == null) {
      states = this.states();
    }
    return this["switch"](Utils.arrayPrev(states, this._currentState), animationOptions);
  };

  LayerStates.prototype.next = function() {
    var states;
    states = Utils.arrayFromArguments(arguments);
    if (!states.length) {
      states = this.states();
    }
    return this["switch"](Utils.arrayNext(states, this._currentState));
  };

  LayerStates.prototype.last = function(animationOptions) {
    return this["switch"](_.last(this._previousStates), animationOptions);
  };

  LayerStates.prototype.emit = function() {
    var args, _ref;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    LayerStates.__super__.emit.apply(this, arguments);
    return (_ref = this.layer).emit.apply(_ref, args);
  };

  return LayerStates;

})(BaseClass);


},{"./BaseClass":9,"./Defaults":13,"./Events":15,"./Underscore":29}],25:[function(require,module,exports){
var filterFormat, _WebkitProperties;

filterFormat = function(value, unit) {
  return "" + (Utils.round(value, 2)) + unit;
};

_WebkitProperties = [["blur", "blur", 0, "px"], ["brightness", "brightness", 100, "%"], ["saturate", "saturate", 100, "%"], ["hue-rotate", "hueRotate", 0, "deg"], ["contrast", "contrast", 100, "%"], ["invert", "invert", 0, "%"], ["grayscale", "grayscale", 0, "%"], ["sepia", "sepia", 0, "%"]];

exports.LayerStyle = {
  width: function(layer) {
    return layer.width + "px";
  },
  height: function(layer) {
    return layer.height + "px";
  },
  display: function(layer) {
    if (layer.visible === true) {
      return "block";
    }
    return "none";
  },
  opacity: function(layer) {
    return layer.opacity;
  },
  overflow: function(layer) {
    if (layer.scrollHorizontal === true || layer.scrollVertical === true) {
      return "auto";
    }
    if (layer.clip === true) {
      return "hidden";
    }
    return "visible";
  },
  overflowX: function(layer) {
    if (layer.scrollHorizontal === true) {
      return "scroll";
    }
    if (layer.clip === true) {
      return "hidden";
    }
    return "visible";
  },
  overflowY: function(layer) {
    if (layer.scrollVertical === true) {
      return "scroll";
    }
    if (layer.clip === true) {
      return "hidden";
    }
    return "visible";
  },
  zIndex: function(layer) {
    return layer.index;
  },
  webkitFilter: function(layer) {
    var css, cssName, fallback, layerName, unit, _i, _len, _ref;
    css = [];
    for (_i = 0, _len = _WebkitProperties.length; _i < _len; _i++) {
      _ref = _WebkitProperties[_i], cssName = _ref[0], layerName = _ref[1], fallback = _ref[2], unit = _ref[3];
      if (layer[layerName] !== fallback) {
        css.push("" + cssName + "(" + (filterFormat(layer[layerName], unit)) + ")");
      }
    }
    return css.join(" ");
  },
  webkitTransform: function(layer) {
    if (layer._prefer2d) {
      return exports.LayerStyle.webkitTransformPrefer2d(layer);
    }
    return "		translate3d(" + layer.x + "px," + layer.y + "px," + layer.z + "px) 		scale(" + layer.scale + ")		scale3d(" + layer.scaleX + "," + layer.scaleY + "," + layer.scaleZ + ")		skew(" + layer.skew + "deg," + layer.skew + "deg) 		skewX(" + layer.skewX + "deg)  		skewY(" + layer.skewY + "deg) 		rotateX(" + layer.rotationX + "deg) 		rotateY(" + layer.rotationY + "deg) 		rotateZ(" + layer.rotationZ + "deg) 		";
  },
  webkitTransformPrefer2d: function(layer) {
    var css;
    css = [];
    if (layer.z !== 0) {
      css.push("translate3d(" + layer.x + "px," + layer.y + "px," + layer.z + "px)");
    } else {
      css.push("translate(" + layer.x + "px," + layer.y + "px)");
    }
    if (layer.scale !== 1) {
      css.push("scale(" + layer.scale + ")");
    }
    if (layer.scaleX !== 1 || layer.scaleY !== 1 || layer.scaleZ !== 1) {
      css.push("scale3d(" + layer.scaleX + "," + layer.scaleY + "," + layer.scaleZ + ")");
    }
    if (layer.skew) {
      css.push("skew(" + layer.skew + "deg," + layer.skew + "deg)");
    }
    if (layer.skewX) {
      css.push("skewX(" + layer.skewX + "deg)");
    }
    if (layer.skewY) {
      css.push("skewY(" + layer.skewY + "deg)");
    }
    if (layer.rotationX) {
      css.push("rotateX(" + layer.rotationX + "deg)");
    }
    if (layer.rotationY) {
      css.push("rotateY(" + layer.rotationY + "deg)");
    }
    if (layer.rotationZ) {
      css.push("rotateZ(" + layer.rotationZ + "deg)");
    }
    return css.join(" ");
  },
  webkitTransformOrigin: function(layer) {
    return "" + (layer.originX * 100) + "% " + (layer.originY * 100) + "%";
  },
  pointerEvents: function(layer) {
    if (layer.ignoreEvents) {
      return "none";
    } else {
      return "auto";
    }
  },
  boxShadow: function(layer) {
    if (!layer.shadowColor) {
      return "";
    }
    return "" + layer.shadowX + "px " + layer.shadowY + "px " + layer.shadowBlur + "px " + layer.shadowSpread + "px " + layer.shadowColor;
  }
};


},{}],26:[function(require,module,exports){
var Session, Utils,
  __slice = [].slice;

Utils = require("./Utils");

Session = require("./Session").Session;

"\nTodo:\n- Better looks\n- Resizable\n- Live in own space on top of all Framer stuff\n";

exports.print = function() {
  var args, printLayer, printNode;
  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  printLayer = Framer.Session.printLayer;
  if (!printLayer) {
    printLayer = new Layer;
    printLayer.scrollVertical = true;
    printLayer.ignoreEvents = false;
    printLayer.html = "";
    printLayer.style = {
      "font": "12px/1.35em Menlo",
      "color": "rgba(0,0,0,.7)",
      "padding": "8px",
      "padding-bottom": "30px",
      "border-top": "1px solid #d9d9d9"
    };
    printLayer.opacity = 0.9;
    printLayer.style.zIndex = 999;
    printLayer.visible = true;
    printLayer.backgroundColor = "white";
    printLayer.width = window.innerWidth;
    printLayer.height = 160;
    printLayer.maxY = window.innerHeight;
  }
  printNode = document.createElement("div");
  printNode.innerHTML = "&raquo; " + args.map(Utils.stringify).join(", ") + "<br>";
  printNode.style["-webkit-user-select"] = "text";
  printNode.style["cursor"] = "auto";
  printLayer._element.appendChild(printNode);
  Framer.Session.printLayer = printLayer;
  return Utils.delay(0, function() {
    return printLayer._element.scrollTop = printLayer._element.scrollHeight;
  });
};


},{"./Session":28,"./Utils":30}],27:[function(require,module,exports){
var BaseClass, ScreenClass,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseClass = require("./BaseClass").BaseClass;

ScreenClass = (function(_super) {
  __extends(ScreenClass, _super);

  function ScreenClass(options) {
    ScreenClass.__super__.constructor.call(this, options);
    this._setupResizeListener();
  }

  ScreenClass.define("width", {
    get: function() {
      return window.innerWidth;
    }
  });

  ScreenClass.define("height", {
    get: function() {
      return window.innerHeight;
    }
  });

  ScreenClass.prototype._setupResizeListener = function() {
    var oldResizeFunction,
      _this = this;
    oldResizeFunction = window.onresize;
    return window.onresize = function() {
      _this.emit("resize", _this);
      return typeof oldResizeFunction === "function" ? oldResizeFunction() : void 0;
    };
  };

  return ScreenClass;

})(BaseClass);

exports.Screen = new ScreenClass;


},{"./BaseClass":9}],28:[function(require,module,exports){
exports.Session = {};


},{}],29:[function(require,module,exports){
var _;

_ = require("lodash");

_.str = require('underscore.string');

_.mixin(_.str.exports());

_.isBool = function(v) {
  return typeof v === 'boolean';
};

exports._ = _;


},{"lodash":32,"underscore.string":33}],30:[function(require,module,exports){
var Screen, Session, Utils, _, __domComplete, __domReady,
  __slice = [].slice,
  _this = this;

_ = require("./Underscore")._;

Session = require("./Session").Session;

Screen = require("./Screen").Screen;

Utils = {};

Utils.reset = function() {
  var delayInterval, delayTimer, layer, __domComplete, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3;
  if (__domReady === false) {
    return;
  }
  __domComplete = [];
  Session.printLayer = null;
  if (Session._LayerList) {
    _ref = Session._LayerList;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      layer = _ref[_i];
      layer.removeAllListeners();
    }
  }
  Session._LayerList = [];
  if ((_ref1 = Session._RootElement) != null) {
    _ref1.innerHTML = "";
  }
  if (Session._delayTimers) {
    _ref2 = Session._delayTimers;
    for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
      delayTimer = _ref2[_j];
      clearTimeout(delayTimer);
    }
    Session._delayTimers = [];
  }
  if (Session._delayIntervals) {
    _ref3 = Session._delayIntervals;
    for (_k = 0, _len2 = _ref3.length; _k < _len2; _k++) {
      delayInterval = _ref3[_k];
      clearInterval(delayInterval);
    }
    return Session._delayIntervals = [];
  }
};

Utils.getValue = function(value) {
  if (_.isFunction(value)) {
    return value();
  }
  return value;
};

Utils.setDefaultProperties = function(obj, defaults, warn) {
  var k, result, v;
  if (warn == null) {
    warn = true;
  }
  result = {};
  for (k in defaults) {
    v = defaults[k];
    if (obj.hasOwnProperty(k)) {
      result[k] = obj[k];
    } else {
      result[k] = defaults[k];
    }
  }
  if (warn) {
    for (k in obj) {
      v = obj[k];
      if (!defaults.hasOwnProperty(k)) {
        console.warn("Utils.setDefaultProperties: got unexpected option: '" + k + " -> " + v + "'", obj);
      }
    }
  }
  return result;
};

Utils.valueOrDefault = function(value, defaultValue) {
  if (value === (void 0) || value === null) {
    value = defaultValue;
  }
  return value;
};

Utils.arrayToObject = function(arr) {
  var item, obj, _i, _len;
  obj = {};
  for (_i = 0, _len = arr.length; _i < _len; _i++) {
    item = arr[_i];
    obj[item[0]] = item[1];
  }
  return obj;
};

Utils.arrayNext = function(arr, item) {
  return arr[arr.indexOf(item) + 1] || _.first(arr);
};

Utils.arrayPrev = function(arr, item) {
  return arr[arr.indexOf(item) - 1] || _.last(arr);
};

if (window.requestAnimationFrame == null) {
  window.requestAnimationFrame = window.webkitRequestAnimationFrame;
}

if (window.requestAnimationFrame == null) {
  window.requestAnimationFrame = function(f) {
    return Utils.delay(1 / 60, f);
  };
}

Utils.getTime = function() {
  return Date.now() / 1000;
};

Utils.delay = function(time, f) {
  var timer;
  timer = setTimeout(f, time * 1000);
  if (Session._delayTimers == null) {
    Session._delayTimers = [];
  }
  Session._delayTimers.push(timer);
  return timer;
};

Utils.interval = function(time, f) {
  var timer;
  timer = setInterval(f, time * 1000);
  if (Session._delayIntervals == null) {
    Session._delayIntervals = [];
  }
  Session._delayIntervals.push(timer);
  return timer;
};

Utils.debounce = function(threshold, fn, immediate) {
  var timeout;
  if (threshold == null) {
    threshold = 0.1;
  }
  timeout = null;
  threshold *= 1000;
  return function() {
    var args, delayed, obj;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    obj = this;
    delayed = function() {
      if (!immediate) {
        fn.apply(obj, args);
      }
      return timeout = null;
    };
    if (timeout) {
      clearTimeout(timeout);
    } else if (immediate) {
      fn.apply(obj, args);
    }
    return timeout = setTimeout(delayed, threshold);
  };
};

Utils.throttle = function(delay, fn) {
  var timer;
  if (delay === 0) {
    return fn;
  }
  delay *= 1000;
  timer = false;
  return function() {
    if (timer) {
      return;
    }
    timer = true;
    if (delay !== -1) {
      setTimeout((function() {
        return timer = false;
      }), delay);
    }
    return fn.apply(null, arguments);
  };
};

Utils.randomColor = function(alpha) {
  var c;
  if (alpha == null) {
    alpha = 1.0;
  }
  c = function() {
    return parseInt(Math.random() * 255);
  };
  return "rgba(" + (c()) + ", " + (c()) + ", " + (c()) + ", " + alpha + ")";
};

Utils.randomChoice = function(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
};

Utils.randomNumber = function(a, b) {
  if (a == null) {
    a = 0;
  }
  if (b == null) {
    b = 1;
  }
  return Utils.mapRange(Math.random(), 0, 1, a, b);
};

Utils.labelLayer = function(layer, text, style) {
  if (style == null) {
    style = {};
  }
  style = _.extend({
    font: "10px/1em Menlo",
    lineHeight: "" + layer.height + "px",
    textAlign: "center",
    color: "#fff"
  }, style);
  layer.style = style;
  return layer.html = text;
};

Utils.stringify = function(obj) {
  try {
    if (_.isObject(obj)) {
      return JSON.stringify(obj);
    }
  } catch (_error) {
    "";
  }
  if (obj === void 0) {
    return "undefined";
  }
  if (obj.toString) {
    return obj.toString();
  }
  return obj;
};

Utils.uuid = function() {
  var chars, digit, output, r, random, _i;
  chars = "0123456789abcdefghijklmnopqrstuvwxyz".split("");
  output = new Array(36);
  random = 0;
  for (digit = _i = 1; _i <= 32; digit = ++_i) {
    if (random <= 0x02) {
      random = 0x2000000 + (Math.random() * 0x1000000) | 0;
    }
    r = random & 0xf;
    random = random >> 4;
    output[digit] = chars[digit === 19 ? (r & 0x3) | 0x8 : r];
  }
  return output.join("");
};

Utils.arrayFromArguments = function(args) {
  if (_.isArray(args[0])) {
    return args[0];
  }
  return Array.prototype.slice.call(args);
};

Utils.cycle = function() {
  var args, curr;
  args = Utils.arrayFromArguments(arguments);
  curr = -1;
  return function() {
    curr++;
    if (curr >= args.length) {
      curr = 0;
    }
    return args[curr];
  };
};

Utils.toggle = Utils.cycle;

Utils.isWebKit = function() {
  return window.WebKitCSSMatrix !== null;
};

Utils.isTouch = function() {
  return window.ontouchstart === null;
};

Utils.isMobile = function() {
  return /iphone|ipod|ipad|android|ie|blackberry|fennec/.test(navigator.userAgent.toLowerCase());
};

Utils.isChrome = function() {
  return /chrome/.test(navigator.userAgent.toLowerCase());
};

Utils.isLocal = function() {
  return Utils.isLocalUrl(window.location.href);
};

Utils.isLocalUrl = function(url) {
  return url.slice(0, 7) === "file://";
};

Utils.devicePixelRatio = function() {
  return window.devicePixelRatio;
};

Utils.pathJoin = function() {
  return Utils.arrayFromArguments(arguments).join("/");
};

Utils.round = function(value, decimals) {
  var d;
  d = Math.pow(10, decimals);
  return Math.round(value * d) / d;
};

Utils.mapRange = function(value, fromLow, fromHigh, toLow, toHigh) {
  return toLow + (((value - fromLow) / (fromHigh - fromLow)) * (toHigh - toLow));
};

Utils.modulate = function(value, rangeA, rangeB, limit) {
  var fromHigh, fromLow, result, toHigh, toLow;
  if (limit == null) {
    limit = false;
  }
  fromLow = rangeA[0], fromHigh = rangeA[1];
  toLow = rangeB[0], toHigh = rangeB[1];
  result = toLow + (((value - fromLow) / (fromHigh - fromLow)) * (toHigh - toLow));
  if (limit === true) {
    if (result < toLow) {
      return toLow;
    }
    if (result > toHigh) {
      return toHigh;
    }
  }
  return result;
};

Utils.parseFunction = function(str) {
  var result;
  result = {
    name: "",
    args: []
  };
  if (_.endsWith(str, ")")) {
    result.name = str.split("(")[0];
    result.args = str.split("(")[1].split(",").map(function(a) {
      return _.trim(_.rtrim(a, ")"));
    });
  } else {
    result.name = str;
  }
  return result;
};

__domComplete = [];

__domReady = false;

if (typeof document !== "undefined" && document !== null) {
  document.onreadystatechange = function(event) {
    var f, _results;
    if (document.readyState === "complete") {
      __domReady = true;
      _results = [];
      while (__domComplete.length) {
        _results.push(f = __domComplete.shift()());
      }
      return _results;
    }
  };
}

Utils.domComplete = function(f) {
  if (document.readyState === "complete") {
    return f();
  } else {
    return __domComplete.push(f);
  }
};

Utils.domCompleteCancel = function(f) {
  return __domComplete = _.without(__domComplete, f);
};

Utils.domLoadScript = function(url, callback) {
  var head, script;
  script = document.createElement("script");
  script.type = "text/javascript";
  script.src = url;
  script.onload = callback;
  head = document.getElementsByTagName("head")[0];
  head.appendChild(script);
  return script;
};

Utils.domLoadData = function(path, callback) {
  var request;
  request = new XMLHttpRequest();
  request.addEventListener("load", function() {
    return callback(null, request.responseText);
  }, false);
  request.addEventListener("error", function() {
    return callback(true, null);
  }, false);
  request.open("GET", path, true);
  return request.send(null);
};

Utils.domLoadJSON = function(path, callback) {
  return Utils.domLoadData(path, function(err, data) {
    return callback(err, JSON.parse(data));
  });
};

Utils.domLoadDataSync = function(path) {
  var data, e, request;
  request = new XMLHttpRequest();
  request.open("GET", path, false);
  try {
    request.send(null);
  } catch (_error) {
    e = _error;
    console.debug("XMLHttpRequest.error", e);
  }
  data = request.responseText;
  if (!data) {
    throw Error("Utils.domLoadDataSync: no data was loaded (url not found?)");
  }
  return request.responseText;
};

Utils.domLoadJSONSync = function(path) {
  return JSON.parse(Utils.domLoadDataSync(path));
};

Utils.domLoadScriptSync = function(path) {
  var scriptData;
  scriptData = Utils.domLoadDataSync(path);
  eval(scriptData);
  return scriptData;
};

Utils.pointMin = function() {
  var point, points;
  points = Utils.arrayFromArguments(arguments);
  return point = {
    x: _.min(point.map(function(size) {
      return size.x;
    })),
    y: _.min(point.map(function(size) {
      return size.y;
    }))
  };
};

Utils.pointMax = function() {
  var point, points;
  points = Utils.arrayFromArguments(arguments);
  return point = {
    x: _.max(point.map(function(size) {
      return size.x;
    })),
    y: _.max(point.map(function(size) {
      return size.y;
    }))
  };
};

Utils.pointDistance = function(pointA, pointB) {
  var distance;
  return distance = {
    x: Math.abs(pointB.x - pointA.x),
    y: Math.abs(pointB.y - pointA.y)
  };
};

Utils.pointInvert = function(point) {
  return point = {
    x: 0 - point.x,
    y: 0 - point.y
  };
};

Utils.pointTotal = function(point) {
  return point.x + point.y;
};

Utils.pointAbs = function(point) {
  return point = {
    x: Math.abs(point.x),
    y: Math.abs(point.y)
  };
};

Utils.pointInFrame = function(point, frame) {
  if (point.x < frame.minX || point.x > frame.maxX) {
    return false;
  }
  if (point.y < frame.minY || point.y > frame.maxY) {
    return false;
  }
  return true;
};

Utils.sizeMin = function() {
  var size, sizes;
  sizes = Utils.arrayFromArguments(arguments);
  return size = {
    width: _.min(sizes.map(function(size) {
      return size.width;
    })),
    height: _.min(sizes.map(function(size) {
      return size.height;
    }))
  };
};

Utils.sizeMax = function() {
  var size, sizes;
  sizes = Utils.arrayFromArguments(arguments);
  return size = {
    width: _.max(sizes.map(function(size) {
      return size.width;
    })),
    height: _.max(sizes.map(function(size) {
      return size.height;
    }))
  };
};

Utils.frameGetMinX = function(frame) {
  return frame.x;
};

Utils.frameSetMinX = function(frame, value) {
  return frame.x = value;
};

Utils.frameGetMidX = function(frame) {
  if (frame.width === 0) {
    return 0;
  } else {
    return frame.x + (frame.width / 2.0);
  }
};

Utils.frameSetMidX = function(frame, value) {
  return frame.x = frame.width === 0 ? 0 : value - (frame.width / 2.0);
};

Utils.frameGetMaxX = function(frame) {
  if (frame.width === 0) {
    return 0;
  } else {
    return frame.x + frame.width;
  }
};

Utils.frameSetMaxX = function(frame, value) {
  return frame.x = frame.width === 0 ? 0 : value - frame.width;
};

Utils.frameGetMinY = function(frame) {
  return frame.y;
};

Utils.frameSetMinY = function(frame, value) {
  return frame.y = value;
};

Utils.frameGetMidY = function(frame) {
  if (frame.height === 0) {
    return 0;
  } else {
    return frame.y + (frame.height / 2.0);
  }
};

Utils.frameSetMidY = function(frame, value) {
  return frame.y = frame.height === 0 ? 0 : value - (frame.height / 2.0);
};

Utils.frameGetMaxY = function(frame) {
  if (frame.height === 0) {
    return 0;
  } else {
    return frame.y + frame.height;
  }
};

Utils.frameSetMaxY = function(frame, value) {
  return frame.y = frame.height === 0 ? 0 : value - frame.height;
};

Utils.frameSize = function(frame) {
  var size;
  return size = {
    width: frame.width,
    height: frame.height
  };
};

Utils.framePoint = function(frame) {
  var point;
  return point = {
    x: frame.x,
    y: frame.y
  };
};

Utils.frameMerge = function() {
  var frame, frames;
  frames = Utils.arrayFromArguments(arguments);
  frame = {
    x: _.min(frames.map(Utils.frameGetMinX)),
    y: _.min(frames.map(Utils.frameGetMinY))
  };
  frame.width = _.max(frames.map(Utils.frameGetMaxX)) - frame.x;
  frame.height = _.max(frames.map(Utils.frameGetMaxY)) - frame.y;
  return frame;
};

Utils.convertPoint = function(input, layerA, layerB) {
  var layer, point, superLayersA, superLayersB, _i, _j, _len, _len1;
  point = _.defaults(input, {
    x: 0,
    y: 0
  });
  superLayersA = (layerA != null ? layerA.superLayers() : void 0) || [];
  superLayersB = (layerB != null ? layerB.superLayers() : void 0) || [];
  if (layerB) {
    superLayersB.push(layerB);
  }
  for (_i = 0, _len = superLayersA.length; _i < _len; _i++) {
    layer = superLayersA[_i];
    point.x += layer.x - layer.scrollFrame.x;
    point.y += layer.y - layer.scrollFrame.y;
  }
  for (_j = 0, _len1 = superLayersB.length; _j < _len1; _j++) {
    layer = superLayersB[_j];
    point.x -= layer.x + layer.scrollFrame.x;
    point.y -= layer.y + layer.scrollFrame.y;
  }
  return point;
};

_.extend(exports, Utils);


},{"./Screen":27,"./Session":28,"./Underscore":29}],31:[function(require,module,exports){
var Layer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Layer = require("./Layer").Layer;

exports.VideoLayer = (function(_super) {
  __extends(VideoLayer, _super);

  function VideoLayer(options) {
    if (options == null) {
      options = {};
    }
    VideoLayer.__super__.constructor.call(this, options);
    this.player = document.createElement("video");
    this.player.style.width = "100%";
    this.player.style.height = "100%";
    this.player.on = this.player.addEventListener;
    this.player.off = this.player.removeEventListener;
    this.video = options.video;
    this._element.appendChild(this.player);
  }

  VideoLayer.define("video", {
    get: function() {
      return this.player.src;
    },
    set: function(video) {
      return this.player.src = video;
    }
  });

  return VideoLayer;

})(Layer);


},{"./Layer":22}],32:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/**
 * @license
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modern -o ./dist/lodash.js`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
;(function() {

  /** Used as a safe reference for `undefined` in pre ES5 environments */
  var undefined;

  /** Used to pool arrays and objects used internally */
  var arrayPool = [],
      objectPool = [];

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used to prefix keys to avoid issues with `__proto__` and properties on `Object.prototype` */
  var keyPrefix = +new Date + '';

  /** Used as the size when optimizations are enabled for large arrays */
  var largeArraySize = 75;

  /** Used as the max size of the `arrayPool` and `objectPool` */
  var maxPoolSize = 40;

  /** Used to detect and test whitespace */
  var whitespace = (
    // whitespace
    ' \t\x0B\f\xA0\ufeff' +

    // line terminators
    '\n\r\u2028\u2029' +

    // unicode category "Zs" space separators
    '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000'
  );

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /**
   * Used to match ES6 template delimiters
   * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-literals-string-literals
   */
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

  /** Used to match regexp flags from their coerced string values */
  var reFlags = /\w*$/;

  /** Used to detected named functions */
  var reFuncName = /^\s*function[ \n\r\t]+\w/;

  /** Used to match "interpolate" template delimiters */
  var reInterpolate = /<%=([\s\S]+?)%>/g;

  /** Used to match leading whitespace and zeros to be removed */
  var reLeadingSpacesAndZeros = RegExp('^[' + whitespace + ']*0+(?=.$)');

  /** Used to ensure capturing order of template delimiters */
  var reNoMatch = /($^)/;

  /** Used to detect functions containing a `this` reference */
  var reThis = /\bthis\b/;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to assign default `context` object properties */
  var contextProps = [
    'Array', 'Boolean', 'Date', 'Function', 'Math', 'Number', 'Object',
    'RegExp', 'String', '_', 'attachEvent', 'clearTimeout', 'isFinite', 'isNaN',
    'parseInt', 'setTimeout'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Used to identify object classifications that `_.clone` supports */
  var cloneableClasses = {};
  cloneableClasses[funcClass] = false;
  cloneableClasses[argsClass] = cloneableClasses[arrayClass] =
  cloneableClasses[boolClass] = cloneableClasses[dateClass] =
  cloneableClasses[numberClass] = cloneableClasses[objectClass] =
  cloneableClasses[regexpClass] = cloneableClasses[stringClass] = true;

  /** Used as an internal `_.debounce` options object */
  var debounceOptions = {
    'leading': false,
    'maxWait': 0,
    'trailing': false
  };

  /** Used as the property descriptor for `__bindData__` */
  var descriptor = {
    'configurable': false,
    'enumerable': false,
    'value': null,
    'writable': false
  };

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /** Used as a reference to the global object */
  var root = (objectTypes[typeof window] && window) || this;

  /** Detect free variable `exports` */
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  /** Detect free variable `module` */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect the popular CommonJS extension `module.exports` */
  var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root` */
  var freeGlobal = objectTypes[typeof global] && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
    root = freeGlobal;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * The base implementation of `_.indexOf` without support for binary searches
   * or `fromIndex` constraints.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {*} value The value to search for.
   * @param {number} [fromIndex=0] The index to search from.
   * @returns {number} Returns the index of the matched value or `-1`.
   */
  function baseIndexOf(array, value, fromIndex) {
    var index = (fromIndex || 0) - 1,
        length = array ? array.length : 0;

    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * An implementation of `_.contains` for cache objects that mimics the return
   * signature of `_.indexOf` by returning `0` if the value is found, else `-1`.
   *
   * @private
   * @param {Object} cache The cache object to inspect.
   * @param {*} value The value to search for.
   * @returns {number} Returns `0` if `value` is found, else `-1`.
   */
  function cacheIndexOf(cache, value) {
    var type = typeof value;
    cache = cache.cache;

    if (type == 'boolean' || value == null) {
      return cache[value] ? 0 : -1;
    }
    if (type != 'number' && type != 'string') {
      type = 'object';
    }
    var key = type == 'number' ? value : keyPrefix + value;
    cache = (cache = cache[type]) && cache[key];

    return type == 'object'
      ? (cache && baseIndexOf(cache, value) > -1 ? 0 : -1)
      : (cache ? 0 : -1);
  }

  /**
   * Adds a given value to the corresponding cache object.
   *
   * @private
   * @param {*} value The value to add to the cache.
   */
  function cachePush(value) {
    var cache = this.cache,
        type = typeof value;

    if (type == 'boolean' || value == null) {
      cache[value] = true;
    } else {
      if (type != 'number' && type != 'string') {
        type = 'object';
      }
      var key = type == 'number' ? value : keyPrefix + value,
          typeCache = cache[type] || (cache[type] = {});

      if (type == 'object') {
        (typeCache[key] || (typeCache[key] = [])).push(value);
      } else {
        typeCache[key] = true;
      }
    }
  }

  /**
   * Used by `_.max` and `_.min` as the default callback when a given
   * collection is a string value.
   *
   * @private
   * @param {string} value The character to inspect.
   * @returns {number} Returns the code unit of given character.
   */
  function charAtCallback(value) {
    return value.charCodeAt(0);
  }

  /**
   * Used by `sortBy` to compare transformed `collection` elements, stable sorting
   * them in ascending order.
   *
   * @private
   * @param {Object} a The object to compare to `b`.
   * @param {Object} b The object to compare to `a`.
   * @returns {number} Returns the sort order indicator of `1` or `-1`.
   */
  function compareAscending(a, b) {
    var ac = a.criteria,
        bc = b.criteria,
        index = -1,
        length = ac.length;

    while (++index < length) {
      var value = ac[index],
          other = bc[index];

      if (value !== other) {
        if (value > other || typeof value == 'undefined') {
          return 1;
        }
        if (value < other || typeof other == 'undefined') {
          return -1;
        }
      }
    }
    // Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
    // that causes it, under certain circumstances, to return the same value for
    // `a` and `b`. See https://github.com/jashkenas/underscore/pull/1247
    //
    // This also ensures a stable sort in V8 and other engines.
    // See http://code.google.com/p/v8/issues/detail?id=90
    return a.index - b.index;
  }

  /**
   * Creates a cache object to optimize linear searches of large arrays.
   *
   * @private
   * @param {Array} [array=[]] The array to search.
   * @returns {null|Object} Returns the cache object or `null` if caching should not be used.
   */
  function createCache(array) {
    var index = -1,
        length = array.length,
        first = array[0],
        mid = array[(length / 2) | 0],
        last = array[length - 1];

    if (first && typeof first == 'object' &&
        mid && typeof mid == 'object' && last && typeof last == 'object') {
      return false;
    }
    var cache = getObject();
    cache['false'] = cache['null'] = cache['true'] = cache['undefined'] = false;

    var result = getObject();
    result.array = array;
    result.cache = cache;
    result.push = cachePush;

    while (++index < length) {
      result.push(array[index]);
    }
    return result;
  }

  /**
   * Used by `template` to escape characters for inclusion in compiled
   * string literals.
   *
   * @private
   * @param {string} match The matched character to escape.
   * @returns {string} Returns the escaped character.
   */
  function escapeStringChar(match) {
    return '\\' + stringEscapes[match];
  }

  /**
   * Gets an array from the array pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Array} The array from the pool.
   */
  function getArray() {
    return arrayPool.pop() || [];
  }

  /**
   * Gets an object from the object pool or creates a new one if the pool is empty.
   *
   * @private
   * @returns {Object} The object from the pool.
   */
  function getObject() {
    return objectPool.pop() || {
      'array': null,
      'cache': null,
      'criteria': null,
      'false': false,
      'index': 0,
      'null': false,
      'number': null,
      'object': null,
      'push': null,
      'string': null,
      'true': false,
      'undefined': false,
      'value': null
    };
  }

  /**
   * Releases the given array back to the array pool.
   *
   * @private
   * @param {Array} [array] The array to release.
   */
  function releaseArray(array) {
    array.length = 0;
    if (arrayPool.length < maxPoolSize) {
      arrayPool.push(array);
    }
  }

  /**
   * Releases the given object back to the object pool.
   *
   * @private
   * @param {Object} [object] The object to release.
   */
  function releaseObject(object) {
    var cache = object.cache;
    if (cache) {
      releaseObject(cache);
    }
    object.array = object.cache = object.criteria = object.object = object.number = object.string = object.value = null;
    if (objectPool.length < maxPoolSize) {
      objectPool.push(object);
    }
  }

  /**
   * Slices the `collection` from the `start` index up to, but not including,
   * the `end` index.
   *
   * Note: This function is used instead of `Array#slice` to support node lists
   * in IE < 9 and to ensure dense arrays are returned.
   *
   * @private
   * @param {Array|Object|string} collection The collection to slice.
   * @param {number} start The start index.
   * @param {number} end The end index.
   * @returns {Array} Returns the new array.
   */
  function slice(array, start, end) {
    start || (start = 0);
    if (typeof end == 'undefined') {
      end = array ? array.length : 0;
    }
    var index = -1,
        length = end - start || 0,
        result = Array(length < 0 ? 0 : length);

    while (++index < length) {
      result[index] = array[start + index];
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Create a new `lodash` function using the given context object.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} [context=root] The context object.
   * @returns {Function} Returns the `lodash` function.
   */
  function runInContext(context) {
    // Avoid issues with some ES3 environments that attempt to use values, named
    // after built-in constructors like `Object`, for the creation of literals.
    // ES5 clears this up by stating that literals must use built-in constructors.
    // See http://es5.github.io/#x11.1.5.
    context = context ? _.defaults(root.Object(), context, _.pick(root, contextProps)) : root;

    /** Native constructor references */
    var Array = context.Array,
        Boolean = context.Boolean,
        Date = context.Date,
        Function = context.Function,
        Math = context.Math,
        Number = context.Number,
        Object = context.Object,
        RegExp = context.RegExp,
        String = context.String,
        TypeError = context.TypeError;

    /**
     * Used for `Array` method references.
     *
     * Normally `Array.prototype` would suffice, however, using an array literal
     * avoids issues in Narwhal.
     */
    var arrayRef = [];

    /** Used for native method references */
    var objectProto = Object.prototype;

    /** Used to restore the original `_` reference in `noConflict` */
    var oldDash = context._;

    /** Used to resolve the internal [[Class]] of values */
    var toString = objectProto.toString;

    /** Used to detect if a method is native */
    var reNative = RegExp('^' +
      String(toString)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/toString| for [^\]]+/g, '.*?') + '$'
    );

    /** Native method shortcuts */
    var ceil = Math.ceil,
        clearTimeout = context.clearTimeout,
        floor = Math.floor,
        fnToString = Function.prototype.toString,
        getPrototypeOf = isNative(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf,
        hasOwnProperty = objectProto.hasOwnProperty,
        push = arrayRef.push,
        setTimeout = context.setTimeout,
        splice = arrayRef.splice,
        unshift = arrayRef.unshift;

    /** Used to set meta data on functions */
    var defineProperty = (function() {
      // IE 8 only accepts DOM elements
      try {
        var o = {},
            func = isNative(func = Object.defineProperty) && func,
            result = func(o, o, o) && func;
      } catch(e) { }
      return result;
    }());

    /* Native method shortcuts for methods with the same name as other `lodash` methods */
    var nativeCreate = isNative(nativeCreate = Object.create) && nativeCreate,
        nativeIsArray = isNative(nativeIsArray = Array.isArray) && nativeIsArray,
        nativeIsFinite = context.isFinite,
        nativeIsNaN = context.isNaN,
        nativeKeys = isNative(nativeKeys = Object.keys) && nativeKeys,
        nativeMax = Math.max,
        nativeMin = Math.min,
        nativeParseInt = context.parseInt,
        nativeRandom = Math.random;

    /** Used to lookup a built-in constructor by [[Class]] */
    var ctorByClass = {};
    ctorByClass[arrayClass] = Array;
    ctorByClass[boolClass] = Boolean;
    ctorByClass[dateClass] = Date;
    ctorByClass[funcClass] = Function;
    ctorByClass[objectClass] = Object;
    ctorByClass[numberClass] = Number;
    ctorByClass[regexpClass] = RegExp;
    ctorByClass[stringClass] = String;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object which wraps the given value to enable intuitive
     * method chaining.
     *
     * In addition to Lo-Dash methods, wrappers also have the following `Array` methods:
     * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`, `splice`,
     * and `unshift`
     *
     * Chaining is supported in custom builds as long as the `value` method is
     * implicitly or explicitly included in the build.
     *
     * The chainable wrapper functions are:
     * `after`, `assign`, `bind`, `bindAll`, `bindKey`, `chain`, `compact`,
     * `compose`, `concat`, `countBy`, `create`, `createCallback`, `curry`,
     * `debounce`, `defaults`, `defer`, `delay`, `difference`, `filter`, `flatten`,
     * `forEach`, `forEachRight`, `forIn`, `forInRight`, `forOwn`, `forOwnRight`,
     * `functions`, `groupBy`, `indexBy`, `initial`, `intersection`, `invert`,
     * `invoke`, `keys`, `map`, `max`, `memoize`, `merge`, `min`, `object`, `omit`,
     * `once`, `pairs`, `partial`, `partialRight`, `pick`, `pluck`, `pull`, `push`,
     * `range`, `reject`, `remove`, `rest`, `reverse`, `shuffle`, `slice`, `sort`,
     * `sortBy`, `splice`, `tap`, `throttle`, `times`, `toArray`, `transform`,
     * `union`, `uniq`, `unshift`, `unzip`, `values`, `where`, `without`, `wrap`,
     * and `zip`
     *
     * The non-chainable wrapper functions are:
     * `clone`, `cloneDeep`, `contains`, `escape`, `every`, `find`, `findIndex`,
     * `findKey`, `findLast`, `findLastIndex`, `findLastKey`, `has`, `identity`,
     * `indexOf`, `isArguments`, `isArray`, `isBoolean`, `isDate`, `isElement`,
     * `isEmpty`, `isEqual`, `isFinite`, `isFunction`, `isNaN`, `isNull`, `isNumber`,
     * `isObject`, `isPlainObject`, `isRegExp`, `isString`, `isUndefined`, `join`,
     * `lastIndexOf`, `mixin`, `noConflict`, `parseInt`, `pop`, `random`, `reduce`,
     * `reduceRight`, `result`, `shift`, `size`, `some`, `sortedIndex`, `runInContext`,
     * `template`, `unescape`, `uniqueId`, and `value`
     *
     * The wrapper functions `first` and `last` return wrapped values when `n` is
     * provided, otherwise they return unwrapped values.
     *
     * Explicit chaining can be enabled by using the `_.chain` method.
     *
     * @name _
     * @constructor
     * @category Chaining
     * @param {*} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns a `lodash` instance.
     * @example
     *
     * var wrapped = _([1, 2, 3]);
     *
     * // returns an unwrapped value
     * wrapped.reduce(function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * // returns a wrapped value
     * var squares = wrapped.map(function(num) {
     *   return num * num;
     * });
     *
     * _.isArray(squares);
     * // => false
     *
     * _.isArray(squares.value());
     * // => true
     */
    function lodash(value) {
      // don't wrap if already wrapped, even if wrapped by a different `lodash` constructor
      return (value && typeof value == 'object' && !isArray(value) && hasOwnProperty.call(value, '__wrapped__'))
       ? value
       : new lodashWrapper(value);
    }

    /**
     * A fast path for creating `lodash` wrapper objects.
     *
     * @private
     * @param {*} value The value to wrap in a `lodash` instance.
     * @param {boolean} chainAll A flag to enable chaining for all methods
     * @returns {Object} Returns a `lodash` instance.
     */
    function lodashWrapper(value, chainAll) {
      this.__chain__ = !!chainAll;
      this.__wrapped__ = value;
    }
    // ensure `new lodashWrapper` is an instance of `lodash`
    lodashWrapper.prototype = lodash.prototype;

    /**
     * An object used to flag environments features.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    var support = lodash.support = {};

    /**
     * Detect if functions can be decompiled by `Function#toString`
     * (all but PS3 and older Opera mobile browsers & avoided in Windows 8 apps).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.funcDecomp = !isNative(context.WinRTError) && reThis.test(runInContext);

    /**
     * Detect if `Function#name` is supported (all but IE).
     *
     * @memberOf _.support
     * @type boolean
     */
    support.funcNames = typeof Function.name == 'string';

    /**
     * By default, the template delimiters used by Lo-Dash are similar to those in
     * embedded Ruby (ERB). Change the following template settings to use alternative
     * delimiters.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    lodash.templateSettings = {

      /**
       * Used to detect `data` property values to be HTML-escaped.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'escape': /<%-([\s\S]+?)%>/g,

      /**
       * Used to detect code to be evaluated.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'evaluate': /<%([\s\S]+?)%>/g,

      /**
       * Used to detect `data` property values to inject.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'interpolate': reInterpolate,

      /**
       * Used to reference the data object in the template text.
       *
       * @memberOf _.templateSettings
       * @type string
       */
      'variable': '',

      /**
       * Used to import variables into the compiled template.
       *
       * @memberOf _.templateSettings
       * @type Object
       */
      'imports': {

        /**
         * A reference to the `lodash` function.
         *
         * @memberOf _.templateSettings.imports
         * @type Function
         */
        '_': lodash
      }
    };

    /*--------------------------------------------------------------------------*/

    /**
     * The base implementation of `_.bind` that creates the bound function and
     * sets its meta data.
     *
     * @private
     * @param {Array} bindData The bind data array.
     * @returns {Function} Returns the new bound function.
     */
    function baseBind(bindData) {
      var func = bindData[0],
          partialArgs = bindData[2],
          thisArg = bindData[4];

      function bound() {
        // `Function#bind` spec
        // http://es5.github.io/#x15.3.4.5
        if (partialArgs) {
          // avoid `arguments` object deoptimizations by using `slice` instead
          // of `Array.prototype.slice.call` and not assigning `arguments` to a
          // variable as a ternary expression
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        // mimic the constructor's `return` behavior
        // http://es5.github.io/#x13.2.2
        if (this instanceof bound) {
          // ensure `new bound` is an instance of `func`
          var thisBinding = baseCreate(func.prototype),
              result = func.apply(thisBinding, args || arguments);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisArg, args || arguments);
      }
      setBindData(bound, bindData);
      return bound;
    }

    /**
     * The base implementation of `_.clone` without argument juggling or support
     * for `thisArg` binding.
     *
     * @private
     * @param {*} value The value to clone.
     * @param {boolean} [isDeep=false] Specify a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {Array} [stackA=[]] Tracks traversed source objects.
     * @param {Array} [stackB=[]] Associates clones with source counterparts.
     * @returns {*} Returns the cloned value.
     */
    function baseClone(value, isDeep, callback, stackA, stackB) {
      if (callback) {
        var result = callback(value);
        if (typeof result != 'undefined') {
          return result;
        }
      }
      // inspect [[Class]]
      var isObj = isObject(value);
      if (isObj) {
        var className = toString.call(value);
        if (!cloneableClasses[className]) {
          return value;
        }
        var ctor = ctorByClass[className];
        switch (className) {
          case boolClass:
          case dateClass:
            return new ctor(+value);

          case numberClass:
          case stringClass:
            return new ctor(value);

          case regexpClass:
            result = ctor(value.source, reFlags.exec(value));
            result.lastIndex = value.lastIndex;
            return result;
        }
      } else {
        return value;
      }
      var isArr = isArray(value);
      if (isDeep) {
        // check for circular references and return corresponding clone
        var initedStack = !stackA;
        stackA || (stackA = getArray());
        stackB || (stackB = getArray());

        var length = stackA.length;
        while (length--) {
          if (stackA[length] == value) {
            return stackB[length];
          }
        }
        result = isArr ? ctor(value.length) : {};
      }
      else {
        result = isArr ? slice(value) : assign({}, value);
      }
      // add array properties assigned by `RegExp#exec`
      if (isArr) {
        if (hasOwnProperty.call(value, 'index')) {
          result.index = value.index;
        }
        if (hasOwnProperty.call(value, 'input')) {
          result.input = value.input;
        }
      }
      // exit for shallow clone
      if (!isDeep) {
        return result;
      }
      // add the source value to the stack of traversed objects
      // and associate it with its clone
      stackA.push(value);
      stackB.push(result);

      // recursively populate clone (susceptible to call stack limits)
      (isArr ? forEach : forOwn)(value, function(objValue, key) {
        result[key] = baseClone(objValue, isDeep, callback, stackA, stackB);
      });

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * The base implementation of `_.create` without support for assigning
     * properties to the created object.
     *
     * @private
     * @param {Object} prototype The object to inherit from.
     * @returns {Object} Returns the new object.
     */
    function baseCreate(prototype, properties) {
      return isObject(prototype) ? nativeCreate(prototype) : {};
    }
    // fallback for browsers without `Object.create`
    if (!nativeCreate) {
      baseCreate = (function() {
        function Object() {}
        return function(prototype) {
          if (isObject(prototype)) {
            Object.prototype = prototype;
            var result = new Object;
            Object.prototype = null;
          }
          return result || context.Object();
        };
      }());
    }

    /**
     * The base implementation of `_.createCallback` without support for creating
     * "_.pluck" or "_.where" style callbacks.
     *
     * @private
     * @param {*} [func=identity] The value to convert to a callback.
     * @param {*} [thisArg] The `this` binding of the created callback.
     * @param {number} [argCount] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     */
    function baseCreateCallback(func, thisArg, argCount) {
      if (typeof func != 'function') {
        return identity;
      }
      // exit early for no `thisArg` or already bound by `Function#bind`
      if (typeof thisArg == 'undefined' || !('prototype' in func)) {
        return func;
      }
      var bindData = func.__bindData__;
      if (typeof bindData == 'undefined') {
        if (support.funcNames) {
          bindData = !func.name;
        }
        bindData = bindData || !support.funcDecomp;
        if (!bindData) {
          var source = fnToString.call(func);
          if (!support.funcNames) {
            bindData = !reFuncName.test(source);
          }
          if (!bindData) {
            // checks if `func` references the `this` keyword and stores the result
            bindData = reThis.test(source);
            setBindData(func, bindData);
          }
        }
      }
      // exit early if there are no `this` references or `func` is bound
      if (bindData === false || (bindData !== true && bindData[1] & 1)) {
        return func;
      }
      switch (argCount) {
        case 1: return function(value) {
          return func.call(thisArg, value);
        };
        case 2: return function(a, b) {
          return func.call(thisArg, a, b);
        };
        case 3: return function(value, index, collection) {
          return func.call(thisArg, value, index, collection);
        };
        case 4: return function(accumulator, value, index, collection) {
          return func.call(thisArg, accumulator, value, index, collection);
        };
      }
      return bind(func, thisArg);
    }

    /**
     * The base implementation of `createWrapper` that creates the wrapper and
     * sets its meta data.
     *
     * @private
     * @param {Array} bindData The bind data array.
     * @returns {Function} Returns the new function.
     */
    function baseCreateWrapper(bindData) {
      var func = bindData[0],
          bitmask = bindData[1],
          partialArgs = bindData[2],
          partialRightArgs = bindData[3],
          thisArg = bindData[4],
          arity = bindData[5];

      var isBind = bitmask & 1,
          isBindKey = bitmask & 2,
          isCurry = bitmask & 4,
          isCurryBound = bitmask & 8,
          key = func;

      function bound() {
        var thisBinding = isBind ? thisArg : this;
        if (partialArgs) {
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        if (partialRightArgs || isCurry) {
          args || (args = slice(arguments));
          if (partialRightArgs) {
            push.apply(args, partialRightArgs);
          }
          if (isCurry && args.length < arity) {
            bitmask |= 16 & ~32;
            return baseCreateWrapper([func, (isCurryBound ? bitmask : bitmask & ~3), args, null, thisArg, arity]);
          }
        }
        args || (args = arguments);
        if (isBindKey) {
          func = thisBinding[key];
        }
        if (this instanceof bound) {
          thisBinding = baseCreate(func.prototype);
          var result = func.apply(thisBinding, args);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisBinding, args);
      }
      setBindData(bound, bindData);
      return bound;
    }

    /**
     * The base implementation of `_.difference` that accepts a single array
     * of values to exclude.
     *
     * @private
     * @param {Array} array The array to process.
     * @param {Array} [values] The array of values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     */
    function baseDifference(array, values) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          isLarge = length >= largeArraySize && indexOf === baseIndexOf,
          result = [];

      if (isLarge) {
        var cache = createCache(values);
        if (cache) {
          indexOf = cacheIndexOf;
          values = cache;
        } else {
          isLarge = false;
        }
      }
      while (++index < length) {
        var value = array[index];
        if (indexOf(values, value) < 0) {
          result.push(value);
        }
      }
      if (isLarge) {
        releaseObject(values);
      }
      return result;
    }

    /**
     * The base implementation of `_.flatten` without support for callback
     * shorthands or `thisArg` binding.
     *
     * @private
     * @param {Array} array The array to flatten.
     * @param {boolean} [isShallow=false] A flag to restrict flattening to a single level.
     * @param {boolean} [isStrict=false] A flag to restrict flattening to arrays and `arguments` objects.
     * @param {number} [fromIndex=0] The index to start from.
     * @returns {Array} Returns a new flattened array.
     */
    function baseFlatten(array, isShallow, isStrict, fromIndex) {
      var index = (fromIndex || 0) - 1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];

        if (value && typeof value == 'object' && typeof value.length == 'number'
            && (isArray(value) || isArguments(value))) {
          // recursively flatten arrays (susceptible to call stack limits)
          if (!isShallow) {
            value = baseFlatten(value, isShallow, isStrict);
          }
          var valIndex = -1,
              valLength = value.length,
              resIndex = result.length;

          result.length += valLength;
          while (++valIndex < valLength) {
            result[resIndex++] = value[valIndex];
          }
        } else if (!isStrict) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * The base implementation of `_.isEqual`, without support for `thisArg` binding,
     * that allows partial "_.where" style comparisons.
     *
     * @private
     * @param {*} a The value to compare.
     * @param {*} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {Function} [isWhere=false] A flag to indicate performing partial comparisons.
     * @param {Array} [stackA=[]] Tracks traversed `a` objects.
     * @param {Array} [stackB=[]] Tracks traversed `b` objects.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     */
    function baseIsEqual(a, b, callback, isWhere, stackA, stackB) {
      // used to indicate that when comparing objects, `a` has at least the properties of `b`
      if (callback) {
        var result = callback(a, b);
        if (typeof result != 'undefined') {
          return !!result;
        }
      }
      // exit early for identical values
      if (a === b) {
        // treat `+0` vs. `-0` as not equal
        return a !== 0 || (1 / a == 1 / b);
      }
      var type = typeof a,
          otherType = typeof b;

      // exit early for unlike primitive values
      if (a === a &&
          !(a && objectTypes[type]) &&
          !(b && objectTypes[otherType])) {
        return false;
      }
      // exit early for `null` and `undefined` avoiding ES3's Function#call behavior
      // http://es5.github.io/#x15.3.4.4
      if (a == null || b == null) {
        return a === b;
      }
      // compare [[Class]] names
      var className = toString.call(a),
          otherClass = toString.call(b);

      if (className == argsClass) {
        className = objectClass;
      }
      if (otherClass == argsClass) {
        otherClass = objectClass;
      }
      if (className != otherClass) {
        return false;
      }
      switch (className) {
        case boolClass:
        case dateClass:
          // coerce dates and booleans to numbers, dates to milliseconds and booleans
          // to `1` or `0` treating invalid dates coerced to `NaN` as not equal
          return +a == +b;

        case numberClass:
          // treat `NaN` vs. `NaN` as equal
          return (a != +a)
            ? b != +b
            // but treat `+0` vs. `-0` as not equal
            : (a == 0 ? (1 / a == 1 / b) : a == +b);

        case regexpClass:
        case stringClass:
          // coerce regexes to strings (http://es5.github.io/#x15.10.6.4)
          // treat string primitives and their corresponding object instances as equal
          return a == String(b);
      }
      var isArr = className == arrayClass;
      if (!isArr) {
        // unwrap any `lodash` wrapped values
        var aWrapped = hasOwnProperty.call(a, '__wrapped__'),
            bWrapped = hasOwnProperty.call(b, '__wrapped__');

        if (aWrapped || bWrapped) {
          return baseIsEqual(aWrapped ? a.__wrapped__ : a, bWrapped ? b.__wrapped__ : b, callback, isWhere, stackA, stackB);
        }
        // exit for functions and DOM nodes
        if (className != objectClass) {
          return false;
        }
        // in older versions of Opera, `arguments` objects have `Array` constructors
        var ctorA = a.constructor,
            ctorB = b.constructor;

        // non `Object` object instances with different constructors are not equal
        if (ctorA != ctorB &&
              !(isFunction(ctorA) && ctorA instanceof ctorA && isFunction(ctorB) && ctorB instanceof ctorB) &&
              ('constructor' in a && 'constructor' in b)
            ) {
          return false;
        }
      }
      // assume cyclic structures are equal
      // the algorithm for detecting cyclic structures is adapted from ES 5.1
      // section 15.12.3, abstract operation `JO` (http://es5.github.io/#x15.12.3)
      var initedStack = !stackA;
      stackA || (stackA = getArray());
      stackB || (stackB = getArray());

      var length = stackA.length;
      while (length--) {
        if (stackA[length] == a) {
          return stackB[length] == b;
        }
      }
      var size = 0;
      result = true;

      // add `a` and `b` to the stack of traversed objects
      stackA.push(a);
      stackB.push(b);

      // recursively compare objects and arrays (susceptible to call stack limits)
      if (isArr) {
        // compare lengths to determine if a deep comparison is necessary
        length = a.length;
        size = b.length;
        result = size == length;

        if (result || isWhere) {
          // deep compare the contents, ignoring non-numeric properties
          while (size--) {
            var index = length,
                value = b[size];

            if (isWhere) {
              while (index--) {
                if ((result = baseIsEqual(a[index], value, callback, isWhere, stackA, stackB))) {
                  break;
                }
              }
            } else if (!(result = baseIsEqual(a[size], value, callback, isWhere, stackA, stackB))) {
              break;
            }
          }
        }
      }
      else {
        // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
        // which, in this case, is more costly
        forIn(b, function(value, key, b) {
          if (hasOwnProperty.call(b, key)) {
            // count the number of properties.
            size++;
            // deep compare each property value.
            return (result = hasOwnProperty.call(a, key) && baseIsEqual(a[key], value, callback, isWhere, stackA, stackB));
          }
        });

        if (result && !isWhere) {
          // ensure both objects have the same number of properties
          forIn(a, function(value, key, a) {
            if (hasOwnProperty.call(a, key)) {
              // `size` will be `-1` if `a` has more properties than `b`
              return (result = --size > -1);
            }
          });
        }
      }
      stackA.pop();
      stackB.pop();

      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }

    /**
     * The base implementation of `_.merge` without argument juggling or support
     * for `thisArg` binding.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {Array} [stackA=[]] Tracks traversed source objects.
     * @param {Array} [stackB=[]] Associates values with source counterparts.
     */
    function baseMerge(object, source, callback, stackA, stackB) {
      (isArray(source) ? forEach : forOwn)(source, function(source, key) {
        var found,
            isArr,
            result = source,
            value = object[key];

        if (source && ((isArr = isArray(source)) || isPlainObject(source))) {
          // avoid merging previously merged cyclic sources
          var stackLength = stackA.length;
          while (stackLength--) {
            if ((found = stackA[stackLength] == source)) {
              value = stackB[stackLength];
              break;
            }
          }
          if (!found) {
            var isShallow;
            if (callback) {
              result = callback(value, source);
              if ((isShallow = typeof result != 'undefined')) {
                value = result;
              }
            }
            if (!isShallow) {
              value = isArr
                ? (isArray(value) ? value : [])
                : (isPlainObject(value) ? value : {});
            }
            // add `source` and associated `value` to the stack of traversed objects
            stackA.push(source);
            stackB.push(value);

            // recursively merge objects and arrays (susceptible to call stack limits)
            if (!isShallow) {
              baseMerge(value, source, callback, stackA, stackB);
            }
          }
        }
        else {
          if (callback) {
            result = callback(value, source);
            if (typeof result == 'undefined') {
              result = source;
            }
          }
          if (typeof result != 'undefined') {
            value = result;
          }
        }
        object[key] = value;
      });
    }

    /**
     * The base implementation of `_.random` without argument juggling or support
     * for returning floating-point numbers.
     *
     * @private
     * @param {number} min The minimum possible value.
     * @param {number} max The maximum possible value.
     * @returns {number} Returns a random number.
     */
    function baseRandom(min, max) {
      return min + floor(nativeRandom() * (max - min + 1));
    }

    /**
     * The base implementation of `_.uniq` without support for callback shorthands
     * or `thisArg` binding.
     *
     * @private
     * @param {Array} array The array to process.
     * @param {boolean} [isSorted=false] A flag to indicate that `array` is sorted.
     * @param {Function} [callback] The function called per iteration.
     * @returns {Array} Returns a duplicate-value-free array.
     */
    function baseUniq(array, isSorted, callback) {
      var index = -1,
          indexOf = getIndexOf(),
          length = array ? array.length : 0,
          result = [];

      var isLarge = !isSorted && length >= largeArraySize && indexOf === baseIndexOf,
          seen = (callback || isLarge) ? getArray() : result;

      if (isLarge) {
        var cache = createCache(seen);
        indexOf = cacheIndexOf;
        seen = cache;
      }
      while (++index < length) {
        var value = array[index],
            computed = callback ? callback(value, index, array) : value;

        if (isSorted
              ? !index || seen[seen.length - 1] !== computed
              : indexOf(seen, computed) < 0
            ) {
          if (callback || isLarge) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
      if (isLarge) {
        releaseArray(seen.array);
        releaseObject(seen);
      } else if (callback) {
        releaseArray(seen);
      }
      return result;
    }

    /**
     * Creates a function that aggregates a collection, creating an object composed
     * of keys generated from the results of running each element of the collection
     * through a callback. The given `setter` function sets the keys and values
     * of the composed object.
     *
     * @private
     * @param {Function} setter The setter function.
     * @returns {Function} Returns the new aggregator function.
     */
    function createAggregator(setter) {
      return function(collection, callback, thisArg) {
        var result = {};
        callback = lodash.createCallback(callback, thisArg, 3);

        var index = -1,
            length = collection ? collection.length : 0;

        if (typeof length == 'number') {
          while (++index < length) {
            var value = collection[index];
            setter(result, value, callback(value, index, collection), collection);
          }
        } else {
          forOwn(collection, function(value, key, collection) {
            setter(result, value, callback(value, key, collection), collection);
          });
        }
        return result;
      };
    }

    /**
     * Creates a function that, when called, either curries or invokes `func`
     * with an optional `this` binding and partially applied arguments.
     *
     * @private
     * @param {Function|string} func The function or method name to reference.
     * @param {number} bitmask The bitmask of method flags to compose.
     *  The bitmask may be composed of the following flags:
     *  1 - `_.bind`
     *  2 - `_.bindKey`
     *  4 - `_.curry`
     *  8 - `_.curry` (bound)
     *  16 - `_.partial`
     *  32 - `_.partialRight`
     * @param {Array} [partialArgs] An array of arguments to prepend to those
     *  provided to the new function.
     * @param {Array} [partialRightArgs] An array of arguments to append to those
     *  provided to the new function.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {number} [arity] The arity of `func`.
     * @returns {Function} Returns the new function.
     */
    function createWrapper(func, bitmask, partialArgs, partialRightArgs, thisArg, arity) {
      var isBind = bitmask & 1,
          isBindKey = bitmask & 2,
          isCurry = bitmask & 4,
          isCurryBound = bitmask & 8,
          isPartial = bitmask & 16,
          isPartialRight = bitmask & 32;

      if (!isBindKey && !isFunction(func)) {
        throw new TypeError;
      }
      if (isPartial && !partialArgs.length) {
        bitmask &= ~16;
        isPartial = partialArgs = false;
      }
      if (isPartialRight && !partialRightArgs.length) {
        bitmask &= ~32;
        isPartialRight = partialRightArgs = false;
      }
      var bindData = func && func.__bindData__;
      if (bindData && bindData !== true) {
        // clone `bindData`
        bindData = slice(bindData);
        if (bindData[2]) {
          bindData[2] = slice(bindData[2]);
        }
        if (bindData[3]) {
          bindData[3] = slice(bindData[3]);
        }
        // set `thisBinding` is not previously bound
        if (isBind && !(bindData[1] & 1)) {
          bindData[4] = thisArg;
        }
        // set if previously bound but not currently (subsequent curried functions)
        if (!isBind && bindData[1] & 1) {
          bitmask |= 8;
        }
        // set curried arity if not yet set
        if (isCurry && !(bindData[1] & 4)) {
          bindData[5] = arity;
        }
        // append partial left arguments
        if (isPartial) {
          push.apply(bindData[2] || (bindData[2] = []), partialArgs);
        }
        // append partial right arguments
        if (isPartialRight) {
          unshift.apply(bindData[3] || (bindData[3] = []), partialRightArgs);
        }
        // merge flags
        bindData[1] |= bitmask;
        return createWrapper.apply(null, bindData);
      }
      // fast path for `_.bind`
      var creater = (bitmask == 1 || bitmask === 17) ? baseBind : baseCreateWrapper;
      return creater([func, bitmask, partialArgs, partialRightArgs, thisArg, arity]);
    }

    /**
     * Used by `escape` to convert characters to HTML entities.
     *
     * @private
     * @param {string} match The matched character to escape.
     * @returns {string} Returns the escaped character.
     */
    function escapeHtmlChar(match) {
      return htmlEscapes[match];
    }

    /**
     * Gets the appropriate "indexOf" function. If the `_.indexOf` method is
     * customized, this method returns the custom method, otherwise it returns
     * the `baseIndexOf` function.
     *
     * @private
     * @returns {Function} Returns the "indexOf" function.
     */
    function getIndexOf() {
      var result = (result = lodash.indexOf) === indexOf ? baseIndexOf : result;
      return result;
    }

    /**
     * Checks if `value` is a native function.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a native function, else `false`.
     */
    function isNative(value) {
      return typeof value == 'function' && reNative.test(value);
    }

    /**
     * Sets `this` binding data on a given function.
     *
     * @private
     * @param {Function} func The function to set data on.
     * @param {Array} value The data array to set.
     */
    var setBindData = !defineProperty ? noop : function(func, value) {
      descriptor.value = value;
      defineProperty(func, '__bindData__', descriptor);
    };

    /**
     * A fallback implementation of `isPlainObject` which checks if a given value
     * is an object created by the `Object` constructor, assuming objects created
     * by the `Object` constructor have no inherited enumerable properties and that
     * there are no `Object.prototype` extensions.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     */
    function shimIsPlainObject(value) {
      var ctor,
          result;

      // avoid non Object objects, `arguments` objects, and DOM elements
      if (!(value && toString.call(value) == objectClass) ||
          (ctor = value.constructor, isFunction(ctor) && !(ctor instanceof ctor))) {
        return false;
      }
      // In most environments an object's own properties are iterated before
      // its inherited properties. If the last iterated property is an object's
      // own property then there are no inherited enumerable properties.
      forIn(value, function(value, key) {
        result = key;
      });
      return typeof result == 'undefined' || hasOwnProperty.call(value, result);
    }

    /**
     * Used by `unescape` to convert HTML entities to characters.
     *
     * @private
     * @param {string} match The matched character to unescape.
     * @returns {string} Returns the unescaped character.
     */
    function unescapeHtmlChar(match) {
      return htmlUnescapes[match];
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Checks if `value` is an `arguments` object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an `arguments` object, else `false`.
     * @example
     *
     * (function() { return _.isArguments(arguments); })(1, 2, 3);
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    function isArguments(value) {
      return value && typeof value == 'object' && typeof value.length == 'number' &&
        toString.call(value) == argsClass || false;
    }

    /**
     * Checks if `value` is an array.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an array, else `false`.
     * @example
     *
     * (function() { return _.isArray(arguments); })();
     * // => false
     *
     * _.isArray([1, 2, 3]);
     * // => true
     */
    var isArray = nativeIsArray || function(value) {
      return value && typeof value == 'object' && typeof value.length == 'number' &&
        toString.call(value) == arrayClass || false;
    };

    /**
     * A fallback implementation of `Object.keys` which produces an array of the
     * given object's own enumerable property names.
     *
     * @private
     * @type Function
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names.
     */
    var shimKeys = function(object) {
      var index, iterable = object, result = [];
      if (!iterable) return result;
      if (!(objectTypes[typeof object])) return result;
        for (index in iterable) {
          if (hasOwnProperty.call(iterable, index)) {
            result.push(index);
          }
        }
      return result
    };

    /**
     * Creates an array composed of the own enumerable property names of an object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names.
     * @example
     *
     * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
     * // => ['one', 'two', 'three'] (property order is not guaranteed across environments)
     */
    var keys = !nativeKeys ? shimKeys : function(object) {
      if (!isObject(object)) {
        return [];
      }
      return nativeKeys(object);
    };

    /**
     * Used to convert characters to HTML entities:
     *
     * Though the `>` character is escaped for symmetry, characters like `>` and `/`
     * don't require escaping in HTML and have no special meaning unless they're part
     * of a tag or an unquoted attribute value.
     * http://mathiasbynens.be/notes/ambiguous-ampersands (under "semi-related fun fact")
     */
    var htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    /** Used to convert HTML entities to characters */
    var htmlUnescapes = invert(htmlEscapes);

    /** Used to match HTML entities and HTML characters */
    var reEscapedHtml = RegExp('(' + keys(htmlUnescapes).join('|') + ')', 'g'),
        reUnescapedHtml = RegExp('[' + keys(htmlEscapes).join('') + ']', 'g');

    /*--------------------------------------------------------------------------*/

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object. Subsequent sources will overwrite property assignments of previous
     * sources. If a callback is provided it will be executed to produce the
     * assigned values. The callback is bound to `thisArg` and invoked with two
     * arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @type Function
     * @alias extend
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param {Function} [callback] The function to customize assigning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * _.assign({ 'name': 'fred' }, { 'employer': 'slate' });
     * // => { 'name': 'fred', 'employer': 'slate' }
     *
     * var defaults = _.partialRight(_.assign, function(a, b) {
     *   return typeof a == 'undefined' ? b : a;
     * });
     *
     * var object = { 'name': 'barney' };
     * defaults(object, { 'name': 'fred', 'employer': 'slate' });
     * // => { 'name': 'barney', 'employer': 'slate' }
     */
    var assign = function(object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      if (argsLength > 3 && typeof args[argsLength - 2] == 'function') {
        var callback = baseCreateCallback(args[--argsLength - 1], args[argsLength--], 2);
      } else if (argsLength > 2 && typeof args[argsLength - 1] == 'function') {
        callback = args[--argsLength];
      }
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          result[index] = callback ? callback(result[index], iterable[index]) : iterable[index];
        }
        }
      }
      return result
    };

    /**
     * Creates a clone of `value`. If `isDeep` is `true` nested objects will also
     * be cloned, otherwise they will be assigned by reference. If a callback
     * is provided it will be executed to produce the cloned values. If the
     * callback returns `undefined` cloning will be handled by the method instead.
     * The callback is bound to `thisArg` and invoked with one argument; (value).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to clone.
     * @param {boolean} [isDeep=false] Specify a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the cloned value.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * var shallow = _.clone(characters);
     * shallow[0] === characters[0];
     * // => true
     *
     * var deep = _.clone(characters, true);
     * deep[0] === characters[0];
     * // => false
     *
     * _.mixin({
     *   'clone': _.partialRight(_.clone, function(value) {
     *     return _.isElement(value) ? value.cloneNode(false) : undefined;
     *   })
     * });
     *
     * var clone = _.clone(document.body);
     * clone.childNodes.length;
     * // => 0
     */
    function clone(value, isDeep, callback, thisArg) {
      // allows working with "Collections" methods without using their `index`
      // and `collection` arguments for `isDeep` and `callback`
      if (typeof isDeep != 'boolean' && isDeep != null) {
        thisArg = callback;
        callback = isDeep;
        isDeep = false;
      }
      return baseClone(value, isDeep, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }

    /**
     * Creates a deep clone of `value`. If a callback is provided it will be
     * executed to produce the cloned values. If the callback returns `undefined`
     * cloning will be handled by the method instead. The callback is bound to
     * `thisArg` and invoked with one argument; (value).
     *
     * Note: This method is loosely based on the structured clone algorithm. Functions
     * and DOM nodes are **not** cloned. The enumerable properties of `arguments` objects and
     * objects created by constructors other than `Object` are cloned to plain `Object` objects.
     * See http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the deep cloned value.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * var deep = _.cloneDeep(characters);
     * deep[0] === characters[0];
     * // => false
     *
     * var view = {
     *   'label': 'docs',
     *   'node': element
     * };
     *
     * var clone = _.cloneDeep(view, function(value) {
     *   return _.isElement(value) ? value.cloneNode(true) : undefined;
     * });
     *
     * clone.node == view.node;
     * // => false
     */
    function cloneDeep(value, callback, thisArg) {
      return baseClone(value, true, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }

    /**
     * Creates an object that inherits from the given `prototype` object. If a
     * `properties` object is provided its own enumerable properties are assigned
     * to the created object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} prototype The object to inherit from.
     * @param {Object} [properties] The properties to assign to the object.
     * @returns {Object} Returns the new object.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * function Circle() {
     *   Shape.call(this);
     * }
     *
     * Circle.prototype = _.create(Shape.prototype, { 'constructor': Circle });
     *
     * var circle = new Circle;
     * circle instanceof Circle;
     * // => true
     *
     * circle instanceof Shape;
     * // => true
     */
    function create(prototype, properties) {
      var result = baseCreate(prototype);
      return properties ? assign(result, properties) : result;
    }

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object for all destination properties that resolve to `undefined`. Once a
     * property is set, additional defaults of the same property will be ignored.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param- {Object} [guard] Allows working with `_.reduce` without using its
     *  `key` and `object` arguments as sources.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var object = { 'name': 'barney' };
     * _.defaults(object, { 'name': 'fred', 'employer': 'slate' });
     * // => { 'name': 'barney', 'employer': 'slate' }
     */
    var defaults = function(object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (typeof result[index] == 'undefined') result[index] = iterable[index];
        }
        }
      }
      return result
    };

    /**
     * This method is like `_.findIndex` except that it returns the key of the
     * first element that passes the callback check, instead of the element itself.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [callback=identity] The function called per
     *  iteration. If a property name or object is provided it will be used to
     *  create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {string|undefined} Returns the key of the found element, else `undefined`.
     * @example
     *
     * var characters = {
     *   'barney': {  'age': 36, 'blocked': false },
     *   'fred': {    'age': 40, 'blocked': true },
     *   'pebbles': { 'age': 1,  'blocked': false }
     * };
     *
     * _.findKey(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => 'barney' (property order is not guaranteed across environments)
     *
     * // using "_.where" callback shorthand
     * _.findKey(characters, { 'age': 1 });
     * // => 'pebbles'
     *
     * // using "_.pluck" callback shorthand
     * _.findKey(characters, 'blocked');
     * // => 'fred'
     */
    function findKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwn(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * This method is like `_.findKey` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|string} [callback=identity] The function called per
     *  iteration. If a property name or object is provided it will be used to
     *  create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {string|undefined} Returns the key of the found element, else `undefined`.
     * @example
     *
     * var characters = {
     *   'barney': {  'age': 36, 'blocked': true },
     *   'fred': {    'age': 40, 'blocked': false },
     *   'pebbles': { 'age': 1,  'blocked': true }
     * };
     *
     * _.findLastKey(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => returns `pebbles`, assuming `_.findKey` returns `barney`
     *
     * // using "_.where" callback shorthand
     * _.findLastKey(characters, { 'age': 40 });
     * // => 'fred'
     *
     * // using "_.pluck" callback shorthand
     * _.findLastKey(characters, 'blocked');
     * // => 'pebbles'
     */
    function findLastKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwnRight(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over own and inherited enumerable properties of an object,
     * executing the callback for each property. The callback is bound to `thisArg`
     * and invoked with three arguments; (value, key, object). Callbacks may exit
     * iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * Shape.prototype.move = function(x, y) {
     *   this.x += x;
     *   this.y += y;
     * };
     *
     * _.forIn(new Shape, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'x', 'y', and 'move' (property order is not guaranteed across environments)
     */
    var forIn = function(collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
        for (index in iterable) {
          if (callback(iterable[index], index, collection) === false) return result;
        }
      return result
    };

    /**
     * This method is like `_.forIn` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * Shape.prototype.move = function(x, y) {
     *   this.x += x;
     *   this.y += y;
     * };
     *
     * _.forInRight(new Shape, function(value, key) {
     *   console.log(key);
     * });
     * // => logs 'move', 'y', and 'x' assuming `_.forIn ` logs 'x', 'y', and 'move'
     */
    function forInRight(object, callback, thisArg) {
      var pairs = [];

      forIn(object, function(value, key) {
        pairs.push(key, value);
      });

      var length = pairs.length;
      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(pairs[length--], pairs[length], object) === false) {
          break;
        }
      }
      return object;
    }

    /**
     * Iterates over own enumerable properties of an object, executing the callback
     * for each property. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, key, object). Callbacks may exit iteration early by
     * explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   console.log(key);
     * });
     * // => logs '0', '1', and 'length' (property order is not guaranteed across environments)
     */
    var forOwn = function(collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] && keys(iterable),
            length = ownProps ? ownProps.length : 0;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (callback(iterable[index], index, collection) === false) return result;
        }
      return result
    };

    /**
     * This method is like `_.forOwn` except that it iterates over elements
     * of a `collection` in the opposite order.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwnRight({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   console.log(key);
     * });
     * // => logs 'length', '1', and '0' assuming `_.forOwn` logs '0', '1', and 'length'
     */
    function forOwnRight(object, callback, thisArg) {
      var props = keys(object),
          length = props.length;

      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        var key = props[length];
        if (callback(object[key], key, object) === false) {
          break;
        }
      }
      return object;
    }

    /**
     * Creates a sorted array of property names of all enumerable properties,
     * own and inherited, of `object` that have function values.
     *
     * @static
     * @memberOf _
     * @alias methods
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property names that have function values.
     * @example
     *
     * _.functions(_);
     * // => ['all', 'any', 'bind', 'bindAll', 'clone', 'compact', 'compose', ...]
     */
    function functions(object) {
      var result = [];
      forIn(object, function(value, key) {
        if (isFunction(value)) {
          result.push(key);
        }
      });
      return result.sort();
    }

    /**
     * Checks if the specified property name exists as a direct property of `object`,
     * instead of an inherited property.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @param {string} key The name of the property to check.
     * @returns {boolean} Returns `true` if key is a direct property, else `false`.
     * @example
     *
     * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
     * // => true
     */
    function has(object, key) {
      return object ? hasOwnProperty.call(object, key) : false;
    }

    /**
     * Creates an object composed of the inverted keys and values of the given object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to invert.
     * @returns {Object} Returns the created inverted object.
     * @example
     *
     * _.invert({ 'first': 'fred', 'second': 'barney' });
     * // => { 'fred': 'first', 'barney': 'second' }
     */
    function invert(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = {};

      while (++index < length) {
        var key = props[index];
        result[object[key]] = key;
      }
      return result;
    }

    /**
     * Checks if `value` is a boolean value.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a boolean value, else `false`.
     * @example
     *
     * _.isBoolean(null);
     * // => false
     */
    function isBoolean(value) {
      return value === true || value === false ||
        value && typeof value == 'object' && toString.call(value) == boolClass || false;
    }

    /**
     * Checks if `value` is a date.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a date, else `false`.
     * @example
     *
     * _.isDate(new Date);
     * // => true
     */
    function isDate(value) {
      return value && typeof value == 'object' && toString.call(value) == dateClass || false;
    }

    /**
     * Checks if `value` is a DOM element.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a DOM element, else `false`.
     * @example
     *
     * _.isElement(document.body);
     * // => true
     */
    function isElement(value) {
      return value && value.nodeType === 1 || false;
    }

    /**
     * Checks if `value` is empty. Arrays, strings, or `arguments` objects with a
     * length of `0` and objects with no own enumerable properties are considered
     * "empty".
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object|string} value The value to inspect.
     * @returns {boolean} Returns `true` if the `value` is empty, else `false`.
     * @example
     *
     * _.isEmpty([1, 2, 3]);
     * // => false
     *
     * _.isEmpty({});
     * // => true
     *
     * _.isEmpty('');
     * // => true
     */
    function isEmpty(value) {
      var result = true;
      if (!value) {
        return result;
      }
      var className = toString.call(value),
          length = value.length;

      if ((className == arrayClass || className == stringClass || className == argsClass ) ||
          (className == objectClass && typeof length == 'number' && isFunction(value.splice))) {
        return !length;
      }
      forOwn(value, function() {
        return (result = false);
      });
      return result;
    }

    /**
     * Performs a deep comparison between two values to determine if they are
     * equivalent to each other. If a callback is provided it will be executed
     * to compare values. If the callback returns `undefined` comparisons will
     * be handled by the method instead. The callback is bound to `thisArg` and
     * invoked with two arguments; (a, b).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} a The value to compare.
     * @param {*} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'name': 'fred' };
     * var copy = { 'name': 'fred' };
     *
     * object == copy;
     * // => false
     *
     * _.isEqual(object, copy);
     * // => true
     *
     * var words = ['hello', 'goodbye'];
     * var otherWords = ['hi', 'goodbye'];
     *
     * _.isEqual(words, otherWords, function(a, b) {
     *   var reGreet = /^(?:hello|hi)$/i,
     *       aGreet = _.isString(a) && reGreet.test(a),
     *       bGreet = _.isString(b) && reGreet.test(b);
     *
     *   return (aGreet || bGreet) ? (aGreet == bGreet) : undefined;
     * });
     * // => true
     */
    function isEqual(a, b, callback, thisArg) {
      return baseIsEqual(a, b, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 2));
    }

    /**
     * Checks if `value` is, or can be coerced to, a finite number.
     *
     * Note: This is not the same as native `isFinite` which will return true for
     * booleans and empty strings. See http://es5.github.io/#x15.1.2.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is finite, else `false`.
     * @example
     *
     * _.isFinite(-101);
     * // => true
     *
     * _.isFinite('10');
     * // => true
     *
     * _.isFinite(true);
     * // => false
     *
     * _.isFinite('');
     * // => false
     *
     * _.isFinite(Infinity);
     * // => false
     */
    function isFinite(value) {
      return nativeIsFinite(value) && !nativeIsNaN(parseFloat(value));
    }

    /**
     * Checks if `value` is a function.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     */
    function isFunction(value) {
      return typeof value == 'function';
    }

    /**
     * Checks if `value` is the language type of Object.
     * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(1);
     * // => false
     */
    function isObject(value) {
      // check if the value is the ECMAScript language type of Object
      // http://es5.github.io/#x8
      // and avoid a V8 bug
      // http://code.google.com/p/v8/issues/detail?id=2291
      return !!(value && objectTypes[typeof value]);
    }

    /**
     * Checks if `value` is `NaN`.
     *
     * Note: This is not the same as native `isNaN` which will return `true` for
     * `undefined` and other non-numeric values. See http://es5.github.io/#x15.1.2.4.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `NaN`, else `false`.
     * @example
     *
     * _.isNaN(NaN);
     * // => true
     *
     * _.isNaN(new Number(NaN));
     * // => true
     *
     * isNaN(undefined);
     * // => true
     *
     * _.isNaN(undefined);
     * // => false
     */
    function isNaN(value) {
      // `NaN` as a primitive is the only value that is not equal to itself
      // (perform the [[Class]] check first to avoid errors with some host objects in IE)
      return isNumber(value) && value != +value;
    }

    /**
     * Checks if `value` is `null`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `null`, else `false`.
     * @example
     *
     * _.isNull(null);
     * // => true
     *
     * _.isNull(undefined);
     * // => false
     */
    function isNull(value) {
      return value === null;
    }

    /**
     * Checks if `value` is a number.
     *
     * Note: `NaN` is considered a number. See http://es5.github.io/#x8.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a number, else `false`.
     * @example
     *
     * _.isNumber(8.4 * 5);
     * // => true
     */
    function isNumber(value) {
      return typeof value == 'number' ||
        value && typeof value == 'object' && toString.call(value) == numberClass || false;
    }

    /**
     * Checks if `value` is an object created by the `Object` constructor.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * _.isPlainObject(new Shape);
     * // => false
     *
     * _.isPlainObject([1, 2, 3]);
     * // => false
     *
     * _.isPlainObject({ 'x': 0, 'y': 0 });
     * // => true
     */
    var isPlainObject = !getPrototypeOf ? shimIsPlainObject : function(value) {
      if (!(value && toString.call(value) == objectClass)) {
        return false;
      }
      var valueOf = value.valueOf,
          objProto = isNative(valueOf) && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);

      return objProto
        ? (value == objProto || getPrototypeOf(value) == objProto)
        : shimIsPlainObject(value);
    };

    /**
     * Checks if `value` is a regular expression.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a regular expression, else `false`.
     * @example
     *
     * _.isRegExp(/fred/);
     * // => true
     */
    function isRegExp(value) {
      return value && typeof value == 'object' && toString.call(value) == regexpClass || false;
    }

    /**
     * Checks if `value` is a string.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is a string, else `false`.
     * @example
     *
     * _.isString('fred');
     * // => true
     */
    function isString(value) {
      return typeof value == 'string' ||
        value && typeof value == 'object' && toString.call(value) == stringClass || false;
    }

    /**
     * Checks if `value` is `undefined`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if the `value` is `undefined`, else `false`.
     * @example
     *
     * _.isUndefined(void 0);
     * // => true
     */
    function isUndefined(value) {
      return typeof value == 'undefined';
    }

    /**
     * Creates an object with the same keys as `object` and values generated by
     * running each own enumerable property of `object` through the callback.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new object with values of the results of each `callback` execution.
     * @example
     *
     * _.mapValues({ 'a': 1, 'b': 2, 'c': 3} , function(num) { return num * 3; });
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     *
     * var characters = {
     *   'fred': { 'name': 'fred', 'age': 40 },
     *   'pebbles': { 'name': 'pebbles', 'age': 1 }
     * };
     *
     * // using "_.pluck" callback shorthand
     * _.mapValues(characters, 'age');
     * // => { 'fred': 40, 'pebbles': 1 }
     */
    function mapValues(object, callback, thisArg) {
      var result = {};
      callback = lodash.createCallback(callback, thisArg, 3);

      forOwn(object, function(value, key, object) {
        result[key] = callback(value, key, object);
      });
      return result;
    }

    /**
     * Recursively merges own enumerable properties of the source object(s), that
     * don't resolve to `undefined` into the destination object. Subsequent sources
     * will overwrite property assignments of previous sources. If a callback is
     * provided it will be executed to produce the merged values of the destination
     * and source properties. If the callback returns `undefined` merging will
     * be handled by the method instead. The callback is bound to `thisArg` and
     * invoked with two arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The destination object.
     * @param {...Object} [source] The source objects.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var names = {
     *   'characters': [
     *     { 'name': 'barney' },
     *     { 'name': 'fred' }
     *   ]
     * };
     *
     * var ages = {
     *   'characters': [
     *     { 'age': 36 },
     *     { 'age': 40 }
     *   ]
     * };
     *
     * _.merge(names, ages);
     * // => { 'characters': [{ 'name': 'barney', 'age': 36 }, { 'name': 'fred', 'age': 40 }] }
     *
     * var food = {
     *   'fruits': ['apple'],
     *   'vegetables': ['beet']
     * };
     *
     * var otherFood = {
     *   'fruits': ['banana'],
     *   'vegetables': ['carrot']
     * };
     *
     * _.merge(food, otherFood, function(a, b) {
     *   return _.isArray(a) ? a.concat(b) : undefined;
     * });
     * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot] }
     */
    function merge(object) {
      var args = arguments,
          length = 2;

      if (!isObject(object)) {
        return object;
      }
      // allows working with `_.reduce` and `_.reduceRight` without using
      // their `index` and `collection` arguments
      if (typeof args[2] != 'number') {
        length = args.length;
      }
      if (length > 3 && typeof args[length - 2] == 'function') {
        var callback = baseCreateCallback(args[--length - 1], args[length--], 2);
      } else if (length > 2 && typeof args[length - 1] == 'function') {
        callback = args[--length];
      }
      var sources = slice(arguments, 1, length),
          index = -1,
          stackA = getArray(),
          stackB = getArray();

      while (++index < length) {
        baseMerge(object, sources[index], callback, stackA, stackB);
      }
      releaseArray(stackA);
      releaseArray(stackB);
      return object;
    }

    /**
     * Creates a shallow clone of `object` excluding the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a callback is provided it will be executed for each
     * property of `object` omitting the properties the callback returns truey
     * for. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|...string|string[]} [callback] The properties to omit or the
     *  function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object without the omitted properties.
     * @example
     *
     * _.omit({ 'name': 'fred', 'age': 40 }, 'age');
     * // => { 'name': 'fred' }
     *
     * _.omit({ 'name': 'fred', 'age': 40 }, function(value) {
     *   return typeof value == 'number';
     * });
     * // => { 'name': 'fred' }
     */
    function omit(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var props = [];
        forIn(object, function(value, key) {
          props.push(key);
        });
        props = baseDifference(props, baseFlatten(arguments, true, false, 1));

        var index = -1,
            length = props.length;

        while (++index < length) {
          var key = props[index];
          result[key] = object[key];
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function(value, key, object) {
          if (!callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * Creates a two dimensional array of an object's key-value pairs,
     * i.e. `[[key1, value1], [key2, value2]]`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns new array of key-value pairs.
     * @example
     *
     * _.pairs({ 'barney': 36, 'fred': 40 });
     * // => [['barney', 36], ['fred', 40]] (property order is not guaranteed across environments)
     */
    function pairs(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        var key = props[index];
        result[index] = [key, object[key]];
      }
      return result;
    }

    /**
     * Creates a shallow clone of `object` composed of the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a callback is provided it will be executed for each
     * property of `object` picking the properties the callback returns truey
     * for. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|...string|string[]} [callback] The function called per
     *  iteration or property names to pick, specified as individual property
     *  names or arrays of property names.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object composed of the picked properties.
     * @example
     *
     * _.pick({ 'name': 'fred', '_userid': 'fred1' }, 'name');
     * // => { 'name': 'fred' }
     *
     * _.pick({ 'name': 'fred', '_userid': 'fred1' }, function(value, key) {
     *   return key.charAt(0) != '_';
     * });
     * // => { 'name': 'fred' }
     */
    function pick(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var index = -1,
            props = baseFlatten(arguments, true, false, 1),
            length = isObject(object) ? props.length : 0;

        while (++index < length) {
          var key = props[index];
          if (key in object) {
            result[key] = object[key];
          }
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function(value, key, object) {
          if (callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * An alternative to `_.reduce` this method transforms `object` to a new
     * `accumulator` object which is the result of running each of its own
     * enumerable properties through a callback, with each callback execution
     * potentially mutating the `accumulator` object. The callback is bound to
     * `thisArg` and invoked with four arguments; (accumulator, value, key, object).
     * Callbacks may exit iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] The custom accumulator value.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var squares = _.transform([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], function(result, num) {
     *   num *= num;
     *   if (num % 2) {
     *     return result.push(num) < 3;
     *   }
     * });
     * // => [1, 9, 25]
     *
     * var mapped = _.transform({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     * });
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function transform(object, callback, accumulator, thisArg) {
      var isArr = isArray(object);
      if (accumulator == null) {
        if (isArr) {
          accumulator = [];
        } else {
          var ctor = object && object.constructor,
              proto = ctor && ctor.prototype;

          accumulator = baseCreate(proto);
        }
      }
      if (callback) {
        callback = lodash.createCallback(callback, thisArg, 4);
        (isArr ? forEach : forOwn)(object, function(value, index, object) {
          return callback(accumulator, value, index, object);
        });
      }
      return accumulator;
    }

    /**
     * Creates an array composed of the own enumerable property values of `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns an array of property values.
     * @example
     *
     * _.values({ 'one': 1, 'two': 2, 'three': 3 });
     * // => [1, 2, 3] (property order is not guaranteed across environments)
     */
    function values(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        result[index] = object[props[index]];
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array of elements from the specified indexes, or keys, of the
     * `collection`. Indexes may be specified as individual arguments or as arrays
     * of indexes.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {...(number|number[]|string|string[])} [index] The indexes of `collection`
     *   to retrieve, specified as individual indexes or arrays of indexes.
     * @returns {Array} Returns a new array of elements corresponding to the
     *  provided indexes.
     * @example
     *
     * _.at(['a', 'b', 'c', 'd', 'e'], [0, 2, 4]);
     * // => ['a', 'c', 'e']
     *
     * _.at(['fred', 'barney', 'pebbles'], 0, 2);
     * // => ['fred', 'pebbles']
     */
    function at(collection) {
      var args = arguments,
          index = -1,
          props = baseFlatten(args, true, false, 1),
          length = (args[2] && args[2][args[1]] === collection) ? 1 : props.length,
          result = Array(length);

      while(++index < length) {
        result[index] = collection[props[index]];
      }
      return result;
    }

    /**
     * Checks if a given value is present in a collection using strict equality
     * for comparisons, i.e. `===`. If `fromIndex` is negative, it is used as the
     * offset from the end of the collection.
     *
     * @static
     * @memberOf _
     * @alias include
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {*} target The value to check for.
     * @param {number} [fromIndex=0] The index to search from.
     * @returns {boolean} Returns `true` if the `target` element is found, else `false`.
     * @example
     *
     * _.contains([1, 2, 3], 1);
     * // => true
     *
     * _.contains([1, 2, 3], 1, 2);
     * // => false
     *
     * _.contains({ 'name': 'fred', 'age': 40 }, 'fred');
     * // => true
     *
     * _.contains('pebbles', 'eb');
     * // => true
     */
    function contains(collection, target, fromIndex) {
      var index = -1,
          indexOf = getIndexOf(),
          length = collection ? collection.length : 0,
          result = false;

      fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex) || 0;
      if (isArray(collection)) {
        result = indexOf(collection, target, fromIndex) > -1;
      } else if (typeof length == 'number') {
        result = (isString(collection) ? collection.indexOf(target, fromIndex) : indexOf(collection, target, fromIndex)) > -1;
      } else {
        forOwn(collection, function(value) {
          if (++index >= fromIndex) {
            return !(result = value === target);
          }
        });
      }
      return result;
    }

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of `collection` through the callback. The corresponding value
     * of each key is the number of times the key was returned by the callback.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy(['one', 'two', 'three'], 'length');
     * // => { '3': 2, '5': 1 }
     */
    var countBy = createAggregator(function(result, value, key) {
      (hasOwnProperty.call(result, key) ? result[key]++ : result[key] = 1);
    });

    /**
     * Checks if the given callback returns truey value for **all** elements of
     * a collection. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias all
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if all elements passed the callback check,
     *  else `false`.
     * @example
     *
     * _.every([true, 1, null, 'yes']);
     * // => false
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.every(characters, 'age');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.every(characters, { 'age': 36 });
     * // => false
     */
    function every(collection, callback, thisArg) {
      var result = true;
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if (!(result = !!callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return (result = !!callback(value, index, collection));
        });
      }
      return result;
    }

    /**
     * Iterates over elements of a collection, returning an array of all elements
     * the callback returns truey for. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias select
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that passed the callback check.
     * @example
     *
     * var evens = _.filter([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [2, 4, 6]
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.filter(characters, 'blocked');
     * // => [{ 'name': 'fred', 'age': 40, 'blocked': true }]
     *
     * // using "_.where" callback shorthand
     * _.filter(characters, { 'age': 36 });
     * // => [{ 'name': 'barney', 'age': 36, 'blocked': false }]
     */
    function filter(collection, callback, thisArg) {
      var result = [];
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            result.push(value);
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result.push(value);
          }
        });
      }
      return result;
    }

    /**
     * Iterates over elements of a collection, returning the first element that
     * the callback returns truey for. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias detect, findWhere
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the found element, else `undefined`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': false },
     *   { 'name': 'fred',    'age': 40, 'blocked': true },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': false }
     * ];
     *
     * _.find(characters, function(chr) {
     *   return chr.age < 40;
     * });
     * // => { 'name': 'barney', 'age': 36, 'blocked': false }
     *
     * // using "_.where" callback shorthand
     * _.find(characters, { 'age': 1 });
     * // =>  { 'name': 'pebbles', 'age': 1, 'blocked': false }
     *
     * // using "_.pluck" callback shorthand
     * _.find(characters, 'blocked');
     * // => { 'name': 'fred', 'age': 40, 'blocked': true }
     */
    function find(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            return value;
          }
        }
      } else {
        var result;
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result = value;
            return false;
          }
        });
        return result;
      }
    }

    /**
     * This method is like `_.find` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the found element, else `undefined`.
     * @example
     *
     * _.findLast([1, 2, 3, 4], function(num) {
     *   return num % 2 == 1;
     * });
     * // => 3
     */
    function findLast(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forEachRight(collection, function(value, index, collection) {
        if (callback(value, index, collection)) {
          result = value;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over elements of a collection, executing the callback for each
     * element. The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection). Callbacks may exit iteration early by
     * explicitly returning `false`.
     *
     * Note: As with other "Collections" methods, objects with a `length` property
     * are iterated like arrays. To avoid this behavior `_.forIn` or `_.forOwn`
     * may be used for object iteration.
     *
     * @static
     * @memberOf _
     * @alias each
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|string} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEach(function(num) { console.log(num); }).join(',');
     * // => logs each number and returns '1,2,3'
     *
     * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { console.log(num); });
     * // => logs each number and returns the object (property order is not guaranteed across environments)
     */
    function forEach(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (++index < length) {
          if (callback(collection[index], index, collection) === false) {
            break;
          }
        }
      } else {
        forOwn(collection, callback);
      }
      return collection;
    }

    /**
     * This method is like `_.forEach` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias eachRight
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|string} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEachRight(function(num) { console.log(num); }).join(',');
     * // => logs each number from right to left and returns '3,2,1'
     */
    function forEachRight(collection, callback, thisArg) {
      var length = collection ? collection.length : 0;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (length--) {
          if (callback(collection[length], length, collection) === false) {
            break;
          }
        }
      } else {
        var props = keys(collection);
        length = props.length;
        forOwn(collection, function(value, key, collection) {
          key = props ? props[--length] : --length;
          return callback(collection[key], key, collection);
        });
      }
      return collection;
    }

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of a collection through the callback. The corresponding value
     * of each key is an array of the elements responsible for generating the key.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * // using "_.pluck" callback shorthand
     * _.groupBy(['one', 'two', 'three'], 'length');
     * // => { '3': ['one', 'two'], '5': ['three'] }
     */
    var groupBy = createAggregator(function(result, value, key) {
      (hasOwnProperty.call(result, key) ? result[key] : result[key] = []).push(value);
    });

    /**
     * Creates an object composed of keys generated from the results of running
     * each element of the collection through the given callback. The corresponding
     * value of each key is the last element responsible for generating the key.
     * The callback is bound to `thisArg` and invoked with three arguments;
     * (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * var keys = [
     *   { 'dir': 'left', 'code': 97 },
     *   { 'dir': 'right', 'code': 100 }
     * ];
     *
     * _.indexBy(keys, 'dir');
     * // => { 'left': { 'dir': 'left', 'code': 97 }, 'right': { 'dir': 'right', 'code': 100 } }
     *
     * _.indexBy(keys, function(key) { return String.fromCharCode(key.code); });
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     *
     * _.indexBy(characters, function(key) { this.fromCharCode(key.code); }, String);
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     */
    var indexBy = createAggregator(function(result, value, key) {
      result[key] = value;
    });

    /**
     * Invokes the method named by `methodName` on each element in the `collection`
     * returning an array of the results of each invoked method. Additional arguments
     * will be provided to each invoked method. If `methodName` is a function it
     * will be invoked for, and `this` bound to, each element in the `collection`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|string} methodName The name of the method to invoke or
     *  the function invoked per iteration.
     * @param {...*} [arg] Arguments to invoke the method with.
     * @returns {Array} Returns a new array of the results of each invoked method.
     * @example
     *
     * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
     * // => [[1, 5, 7], [1, 2, 3]]
     *
     * _.invoke([123, 456], String.prototype.split, '');
     * // => [['1', '2', '3'], ['4', '5', '6']]
     */
    function invoke(collection, methodName) {
      var args = slice(arguments, 2),
          index = -1,
          isFunc = typeof methodName == 'function',
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        result[++index] = (isFunc ? methodName : value[methodName]).apply(value, args);
      });
      return result;
    }

    /**
     * Creates an array of values by running each element in the collection
     * through the callback. The callback is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias collect
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of the results of each `callback` execution.
     * @example
     *
     * _.map([1, 2, 3], function(num) { return num * 3; });
     * // => [3, 6, 9]
     *
     * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { return num * 3; });
     * // => [3, 6, 9] (property order is not guaranteed across environments)
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(characters, 'name');
     * // => ['barney', 'fred']
     */
    function map(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = lodash.createCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        var result = Array(length);
        while (++index < length) {
          result[index] = callback(collection[index], index, collection);
        }
      } else {
        result = [];
        forOwn(collection, function(value, key, collection) {
          result[++index] = callback(value, key, collection);
        });
      }
      return result;
    }

    /**
     * Retrieves the maximum value of a collection. If the collection is empty or
     * falsey `-Infinity` is returned. If a callback is provided it will be executed
     * for each value in the collection to generate the criterion by which the value
     * is ranked. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the maximum value.
     * @example
     *
     * _.max([4, 2, 8, 6]);
     * // => 8
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.max(characters, function(chr) { return chr.age; });
     * // => { 'name': 'fred', 'age': 40 };
     *
     * // using "_.pluck" callback shorthand
     * _.max(characters, 'age');
     * // => { 'name': 'fred', 'age': 40 };
     */
    function max(collection, callback, thisArg) {
      var computed = -Infinity,
          result = computed;

      // allows working with functions like `_.map` without using
      // their `index` argument as a callback
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value > result) {
            result = value;
          }
        }
      } else {
        callback = (callback == null && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg, 3);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current > computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the minimum value of a collection. If the collection is empty or
     * falsey `Infinity` is returned. If a callback is provided it will be executed
     * for each value in the collection to generate the criterion by which the value
     * is ranked. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the minimum value.
     * @example
     *
     * _.min([4, 2, 8, 6]);
     * // => 2
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.min(characters, function(chr) { return chr.age; });
     * // => { 'name': 'barney', 'age': 36 };
     *
     * // using "_.pluck" callback shorthand
     * _.min(characters, 'age');
     * // => { 'name': 'barney', 'age': 36 };
     */
    function min(collection, callback, thisArg) {
      var computed = Infinity,
          result = computed;

      // allows working with functions like `_.map` without using
      // their `index` argument as a callback
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value < result) {
            result = value;
          }
        }
      } else {
        callback = (callback == null && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg, 3);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current < computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the value of a specified property from all elements in the collection.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {string} property The name of the property to pluck.
     * @returns {Array} Returns a new array of property values.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * _.pluck(characters, 'name');
     * // => ['barney', 'fred']
     */
    var pluck = map;

    /**
     * Reduces a collection to a value which is the accumulated result of running
     * each element in the collection through the callback, where each successive
     * callback execution consumes the return value of the previous execution. If
     * `accumulator` is not provided the first element of the collection will be
     * used as the initial `accumulator` value. The callback is bound to `thisArg`
     * and invoked with four arguments; (accumulator, value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @alias foldl, inject
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] Initial value of the accumulator.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var sum = _.reduce([1, 2, 3], function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * var mapped = _.reduce({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     *   return result;
     * }, {});
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function reduce(collection, callback, accumulator, thisArg) {
      if (!collection) return accumulator;
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);

      var index = -1,
          length = collection.length;

      if (typeof length == 'number') {
        if (noaccum) {
          accumulator = collection[++index];
        }
        while (++index < length) {
          accumulator = callback(accumulator, collection[index], index, collection);
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          accumulator = noaccum
            ? (noaccum = false, value)
            : callback(accumulator, value, index, collection)
        });
      }
      return accumulator;
    }

    /**
     * This method is like `_.reduce` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias foldr
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {*} [accumulator] Initial value of the accumulator.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * var list = [[0, 1], [2, 3], [4, 5]];
     * var flat = _.reduceRight(list, function(a, b) { return a.concat(b); }, []);
     * // => [4, 5, 2, 3, 0, 1]
     */
    function reduceRight(collection, callback, accumulator, thisArg) {
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);
      forEachRight(collection, function(value, index, collection) {
        accumulator = noaccum
          ? (noaccum = false, value)
          : callback(accumulator, value, index, collection);
      });
      return accumulator;
    }

    /**
     * The opposite of `_.filter` this method returns the elements of a
     * collection that the callback does **not** return truey for.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that failed the callback check.
     * @example
     *
     * var odds = _.reject([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [1, 3, 5]
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.reject(characters, 'blocked');
     * // => [{ 'name': 'barney', 'age': 36, 'blocked': false }]
     *
     * // using "_.where" callback shorthand
     * _.reject(characters, { 'age': 36 });
     * // => [{ 'name': 'fred', 'age': 40, 'blocked': true }]
     */
    function reject(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);
      return filter(collection, function(value, index, collection) {
        return !callback(value, index, collection);
      });
    }

    /**
     * Retrieves a random element or `n` random elements from a collection.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to sample.
     * @param {number} [n] The number of elements to sample.
     * @param- {Object} [guard] Allows working with functions like `_.map`
     *  without using their `index` arguments as `n`.
     * @returns {Array} Returns the random sample(s) of `collection`.
     * @example
     *
     * _.sample([1, 2, 3, 4]);
     * // => 2
     *
     * _.sample([1, 2, 3, 4], 2);
     * // => [3, 1]
     */
    function sample(collection, n, guard) {
      if (collection && typeof collection.length != 'number') {
        collection = values(collection);
      }
      if (n == null || guard) {
        return collection ? collection[baseRandom(0, collection.length - 1)] : undefined;
      }
      var result = shuffle(collection);
      result.length = nativeMin(nativeMax(0, n), result.length);
      return result;
    }

    /**
     * Creates an array of shuffled values, using a version of the Fisher-Yates
     * shuffle. See http://en.wikipedia.org/wiki/Fisher-Yates_shuffle.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to shuffle.
     * @returns {Array} Returns a new shuffled collection.
     * @example
     *
     * _.shuffle([1, 2, 3, 4, 5, 6]);
     * // => [4, 1, 6, 3, 5, 2]
     */
    function shuffle(collection) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        var rand = baseRandom(0, ++index);
        result[index] = result[rand];
        result[rand] = value;
      });
      return result;
    }

    /**
     * Gets the size of the `collection` by returning `collection.length` for arrays
     * and array-like objects or the number of own enumerable properties for objects.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to inspect.
     * @returns {number} Returns `collection.length` or number of own enumerable properties.
     * @example
     *
     * _.size([1, 2]);
     * // => 2
     *
     * _.size({ 'one': 1, 'two': 2, 'three': 3 });
     * // => 3
     *
     * _.size('pebbles');
     * // => 7
     */
    function size(collection) {
      var length = collection ? collection.length : 0;
      return typeof length == 'number' ? length : keys(collection).length;
    }

    /**
     * Checks if the callback returns a truey value for **any** element of a
     * collection. The function returns as soon as it finds a passing value and
     * does not iterate over the entire collection. The callback is bound to
     * `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias any
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {boolean} Returns `true` if any element passed the callback check,
     *  else `false`.
     * @example
     *
     * _.some([null, 0, 'yes', false], Boolean);
     * // => true
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'blocked': false },
     *   { 'name': 'fred',   'age': 40, 'blocked': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.some(characters, 'blocked');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.some(characters, { 'age': 1 });
     * // => false
     */
    function some(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if ((result = callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return !(result = callback(value, index, collection));
        });
      }
      return !!result;
    }

    /**
     * Creates an array of elements, sorted in ascending order by the results of
     * running each element in a collection through the callback. This method
     * performs a stable sort, that is, it will preserve the original sort order
     * of equal elements. The callback is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an array of property names is provided for `callback` the collection
     * will be sorted by each property value.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Array|Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of sorted elements.
     * @example
     *
     * _.sortBy([1, 2, 3], function(num) { return Math.sin(num); });
     * // => [3, 1, 2]
     *
     * _.sortBy([1, 2, 3], function(num) { return this.sin(num); }, Math);
     * // => [3, 1, 2]
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36 },
     *   { 'name': 'fred',    'age': 40 },
     *   { 'name': 'barney',  'age': 26 },
     *   { 'name': 'fred',    'age': 30 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(_.sortBy(characters, 'age'), _.values);
     * // => [['barney', 26], ['fred', 30], ['barney', 36], ['fred', 40]]
     *
     * // sorting by multiple properties
     * _.map(_.sortBy(characters, ['name', 'age']), _.values);
     * // = > [['barney', 26], ['barney', 36], ['fred', 30], ['fred', 40]]
     */
    function sortBy(collection, callback, thisArg) {
      var index = -1,
          isArr = isArray(callback),
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      if (!isArr) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      forEach(collection, function(value, key, collection) {
        var object = result[++index] = getObject();
        if (isArr) {
          object.criteria = map(callback, function(key) { return value[key]; });
        } else {
          (object.criteria = getArray())[0] = callback(value, key, collection);
        }
        object.index = index;
        object.value = value;
      });

      length = result.length;
      result.sort(compareAscending);
      while (length--) {
        var object = result[length];
        result[length] = object.value;
        if (!isArr) {
          releaseArray(object.criteria);
        }
        releaseObject(object);
      }
      return result;
    }

    /**
     * Converts the `collection` to an array.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|string} collection The collection to convert.
     * @returns {Array} Returns the new converted array.
     * @example
     *
     * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
     * // => [2, 3, 4]
     */
    function toArray(collection) {
      if (collection && typeof collection.length == 'number') {
        return slice(collection);
      }
      return values(collection);
    }

    /**
     * Performs a deep comparison of each element in a `collection` to the given
     * `properties` object, returning an array of all elements that have equivalent
     * property values.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|string} collection The collection to iterate over.
     * @param {Object} props The object of property values to filter by.
     * @returns {Array} Returns a new array of elements that have the given properties.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36, 'pets': ['hoppy'] },
     *   { 'name': 'fred',   'age': 40, 'pets': ['baby puss', 'dino'] }
     * ];
     *
     * _.where(characters, { 'age': 36 });
     * // => [{ 'name': 'barney', 'age': 36, 'pets': ['hoppy'] }]
     *
     * _.where(characters, { 'pets': ['dino'] });
     * // => [{ 'name': 'fred', 'age': 40, 'pets': ['baby puss', 'dino'] }]
     */
    var where = filter;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array with all falsey values removed. The values `false`, `null`,
     * `0`, `""`, `undefined`, and `NaN` are all falsey.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to compact.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.compact([0, 1, false, 2, '', 3]);
     * // => [1, 2, 3]
     */
    function compact(array) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];
        if (value) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Creates an array excluding all values of the provided arrays using strict
     * equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {...Array} [values] The arrays of values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
     * // => [1, 3, 4]
     */
    function difference(array) {
      return baseDifference(array, baseFlatten(arguments, true, true, 1));
    }

    /**
     * This method is like `_.find` except that it returns the index of the first
     * element that passes the callback check, instead of the element itself.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': false },
     *   { 'name': 'fred',    'age': 40, 'blocked': true },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': false }
     * ];
     *
     * _.findIndex(characters, function(chr) {
     *   return chr.age < 20;
     * });
     * // => 2
     *
     * // using "_.where" callback shorthand
     * _.findIndex(characters, { 'age': 36 });
     * // => 0
     *
     * // using "_.pluck" callback shorthand
     * _.findIndex(characters, 'blocked');
     * // => 1
     */
    function findIndex(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0;

      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        if (callback(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }

    /**
     * This method is like `_.findIndex` except that it iterates over elements
     * of a `collection` from right to left.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36, 'blocked': true },
     *   { 'name': 'fred',    'age': 40, 'blocked': false },
     *   { 'name': 'pebbles', 'age': 1,  'blocked': true }
     * ];
     *
     * _.findLastIndex(characters, function(chr) {
     *   return chr.age > 30;
     * });
     * // => 1
     *
     * // using "_.where" callback shorthand
     * _.findLastIndex(characters, { 'age': 36 });
     * // => 0
     *
     * // using "_.pluck" callback shorthand
     * _.findLastIndex(characters, 'blocked');
     * // => 2
     */
    function findLastIndex(array, callback, thisArg) {
      var length = array ? array.length : 0;
      callback = lodash.createCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(array[length], length, array)) {
          return length;
        }
      }
      return -1;
    }

    /**
     * Gets the first element or first `n` elements of an array. If a callback
     * is provided elements at the beginning of the array are returned as long
     * as the callback returns truey. The callback is bound to `thisArg` and
     * invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias head, take
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the first element(s) of `array`.
     * @example
     *
     * _.first([1, 2, 3]);
     * // => 1
     *
     * _.first([1, 2, 3], 2);
     * // => [1, 2]
     *
     * _.first([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [1, 2]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': true,  'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': false, 'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.first(characters, 'blocked');
     * // => [{ 'name': 'barney', 'blocked': true, 'employer': 'slate' }]
     *
     * // using "_.where" callback shorthand
     * _.pluck(_.first(characters, { 'employer': 'slate' }), 'name');
     * // => ['barney', 'fred']
     */
    function first(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = -1;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[0] : undefined;
        }
      }
      return slice(array, 0, nativeMin(nativeMax(0, n), length));
    }

    /**
     * Flattens a nested array (the nesting can be to any depth). If `isShallow`
     * is truey, the array will only be flattened a single level. If a callback
     * is provided each element of the array is passed through the callback before
     * flattening. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to flatten.
     * @param {boolean} [isShallow=false] A flag to restrict flattening to a single level.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new flattened array.
     * @example
     *
     * _.flatten([1, [2], [3, [[4]]]]);
     * // => [1, 2, 3, 4];
     *
     * _.flatten([1, [2], [3, [[4]]]], true);
     * // => [1, 2, 3, [[4]]];
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 30, 'pets': ['hoppy'] },
     *   { 'name': 'fred',   'age': 40, 'pets': ['baby puss', 'dino'] }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.flatten(characters, 'pets');
     * // => ['hoppy', 'baby puss', 'dino']
     */
    function flatten(array, isShallow, callback, thisArg) {
      // juggle arguments
      if (typeof isShallow != 'boolean' && isShallow != null) {
        thisArg = callback;
        callback = (typeof isShallow != 'function' && thisArg && thisArg[isShallow] === array) ? null : isShallow;
        isShallow = false;
      }
      if (callback != null) {
        array = map(array, callback, thisArg);
      }
      return baseFlatten(array, isShallow);
    }

    /**
     * Gets the index at which the first occurrence of `value` is found using
     * strict equality for comparisons, i.e. `===`. If the array is already sorted
     * providing `true` for `fromIndex` will run a faster binary search.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {boolean|number} [fromIndex=0] The index to search from or `true`
     *  to perform a binary search on a sorted array.
     * @returns {number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 1
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 4
     *
     * _.indexOf([1, 1, 2, 2, 3, 3], 2, true);
     * // => 2
     */
    function indexOf(array, value, fromIndex) {
      if (typeof fromIndex == 'number') {
        var length = array ? array.length : 0;
        fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex || 0);
      } else if (fromIndex) {
        var index = sortedIndex(array, value);
        return array[index] === value ? index : -1;
      }
      return baseIndexOf(array, value, fromIndex);
    }

    /**
     * Gets all but the last element or last `n` elements of an array. If a
     * callback is provided elements at the end of the array are excluded from
     * the result as long as the callback returns truey. The callback is bound
     * to `thisArg` and invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.initial([1, 2, 3]);
     * // => [1, 2]
     *
     * _.initial([1, 2, 3], 2);
     * // => [1]
     *
     * _.initial([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [1]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': false, 'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': true,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.initial(characters, 'blocked');
     * // => [{ 'name': 'barney',  'blocked': false, 'employer': 'slate' }]
     *
     * // using "_.where" callback shorthand
     * _.pluck(_.initial(characters, { 'employer': 'na' }), 'name');
     * // => ['barney', 'fred']
     */
    function initial(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : callback || n;
      }
      return slice(array, 0, nativeMin(nativeMax(0, length - n), length));
    }

    /**
     * Creates an array of unique values present in all provided arrays using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of shared values.
     * @example
     *
     * _.intersection([1, 2, 3], [5, 2, 1, 4], [2, 1]);
     * // => [1, 2]
     */
    function intersection() {
      var args = [],
          argsIndex = -1,
          argsLength = arguments.length,
          caches = getArray(),
          indexOf = getIndexOf(),
          trustIndexOf = indexOf === baseIndexOf,
          seen = getArray();

      while (++argsIndex < argsLength) {
        var value = arguments[argsIndex];
        if (isArray(value) || isArguments(value)) {
          args.push(value);
          caches.push(trustIndexOf && value.length >= largeArraySize &&
            createCache(argsIndex ? args[argsIndex] : seen));
        }
      }
      var array = args[0],
          index = -1,
          length = array ? array.length : 0,
          result = [];

      outer:
      while (++index < length) {
        var cache = caches[0];
        value = array[index];

        if ((cache ? cacheIndexOf(cache, value) : indexOf(seen, value)) < 0) {
          argsIndex = argsLength;
          (cache || seen).push(value);
          while (--argsIndex) {
            cache = caches[argsIndex];
            if ((cache ? cacheIndexOf(cache, value) : indexOf(args[argsIndex], value)) < 0) {
              continue outer;
            }
          }
          result.push(value);
        }
      }
      while (argsLength--) {
        cache = caches[argsLength];
        if (cache) {
          releaseObject(cache);
        }
      }
      releaseArray(caches);
      releaseArray(seen);
      return result;
    }

    /**
     * Gets the last element or last `n` elements of an array. If a callback is
     * provided elements at the end of the array are returned as long as the
     * callback returns truey. The callback is bound to `thisArg` and invoked
     * with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {*} Returns the last element(s) of `array`.
     * @example
     *
     * _.last([1, 2, 3]);
     * // => 3
     *
     * _.last([1, 2, 3], 2);
     * // => [2, 3]
     *
     * _.last([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [2, 3]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': false, 'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': true,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true,  'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.pluck(_.last(characters, 'blocked'), 'name');
     * // => ['fred', 'pebbles']
     *
     * // using "_.where" callback shorthand
     * _.last(characters, { 'employer': 'na' });
     * // => [{ 'name': 'pebbles', 'blocked': true, 'employer': 'na' }]
     */
    function last(array, callback, thisArg) {
      var n = 0,
          length = array ? array.length : 0;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[length - 1] : undefined;
        }
      }
      return slice(array, nativeMax(0, length - n));
    }

    /**
     * Gets the index at which the last occurrence of `value` is found using strict
     * equality for comparisons, i.e. `===`. If `fromIndex` is negative, it is used
     * as the offset from the end of the collection.
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=array.length-1] The index to search from.
     * @returns {number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 4
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 1
     */
    function lastIndexOf(array, value, fromIndex) {
      var index = array ? array.length : 0;
      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? nativeMax(0, index + fromIndex) : nativeMin(fromIndex, index - 1)) + 1;
      }
      while (index--) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Removes all provided values from the given array using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to modify.
     * @param {...*} [value] The values to remove.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [1, 2, 3, 1, 2, 3];
     * _.pull(array, 2, 3);
     * console.log(array);
     * // => [1, 1]
     */
    function pull(array) {
      var args = arguments,
          argsIndex = 0,
          argsLength = args.length,
          length = array ? array.length : 0;

      while (++argsIndex < argsLength) {
        var index = -1,
            value = args[argsIndex];
        while (++index < length) {
          if (array[index] === value) {
            splice.call(array, index--, 1);
            length--;
          }
        }
      }
      return array;
    }

    /**
     * Creates an array of numbers (positive and/or negative) progressing from
     * `start` up to but not including `end`. If `start` is less than `stop` a
     * zero-length range is created unless a negative `step` is specified.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {number} [start=0] The start of the range.
     * @param {number} end The end of the range.
     * @param {number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns a new range array.
     * @example
     *
     * _.range(4);
     * // => [0, 1, 2, 3]
     *
     * _.range(1, 5);
     * // => [1, 2, 3, 4]
     *
     * _.range(0, 20, 5);
     * // => [0, 5, 10, 15]
     *
     * _.range(0, -4, -1);
     * // => [0, -1, -2, -3]
     *
     * _.range(1, 4, 0);
     * // => [1, 1, 1]
     *
     * _.range(0);
     * // => []
     */
    function range(start, end, step) {
      start = +start || 0;
      step = typeof step == 'number' ? step : (+step || 1);

      if (end == null) {
        end = start;
        start = 0;
      }
      // use `Array(length)` so engines like Chakra and V8 avoid slower modes
      // http://youtu.be/XAqIpGU8ZZk#t=17m25s
      var index = -1,
          length = nativeMax(0, ceil((end - start) / (step || 1))),
          result = Array(length);

      while (++index < length) {
        result[index] = start;
        start += step;
      }
      return result;
    }

    /**
     * Removes all elements from an array that the callback returns truey for
     * and returns an array of removed elements. The callback is bound to `thisArg`
     * and invoked with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to modify.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of removed elements.
     * @example
     *
     * var array = [1, 2, 3, 4, 5, 6];
     * var evens = _.remove(array, function(num) { return num % 2 == 0; });
     *
     * console.log(array);
     * // => [1, 3, 5]
     *
     * console.log(evens);
     * // => [2, 4, 6]
     */
    function remove(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        var value = array[index];
        if (callback(value, index, array)) {
          result.push(value);
          splice.call(array, index--, 1);
          length--;
        }
      }
      return result;
    }

    /**
     * The opposite of `_.initial` this method gets all but the first element or
     * first `n` elements of an array. If a callback function is provided elements
     * at the beginning of the array are excluded from the result as long as the
     * callback returns truey. The callback is bound to `thisArg` and invoked
     * with three arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias drop, tail
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|number|string} [callback=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is provided it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.rest([1, 2, 3]);
     * // => [2, 3]
     *
     * _.rest([1, 2, 3], 2);
     * // => [3]
     *
     * _.rest([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [3]
     *
     * var characters = [
     *   { 'name': 'barney',  'blocked': true,  'employer': 'slate' },
     *   { 'name': 'fred',    'blocked': false,  'employer': 'slate' },
     *   { 'name': 'pebbles', 'blocked': true, 'employer': 'na' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.pluck(_.rest(characters, 'blocked'), 'name');
     * // => ['fred', 'pebbles']
     *
     * // using "_.where" callback shorthand
     * _.rest(characters, { 'employer': 'slate' });
     * // => [{ 'name': 'pebbles', 'blocked': true, 'employer': 'na' }]
     */
    function rest(array, callback, thisArg) {
      if (typeof callback != 'number' && callback != null) {
        var n = 0,
            index = -1,
            length = array ? array.length : 0;

        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : nativeMax(0, callback);
      }
      return slice(array, n);
    }

    /**
     * Uses a binary search to determine the smallest index at which a value
     * should be inserted into a given sorted array in order to maintain the sort
     * order of the array. If a callback is provided it will be executed for
     * `value` and each element of `array` to compute their sort ranking. The
     * callback is bound to `thisArg` and invoked with one argument; (value).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to inspect.
     * @param {*} value The value to evaluate.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {number} Returns the index at which `value` should be inserted
     *  into `array`.
     * @example
     *
     * _.sortedIndex([20, 30, 50], 40);
     * // => 2
     *
     * // using "_.pluck" callback shorthand
     * _.sortedIndex([{ 'x': 20 }, { 'x': 30 }, { 'x': 50 }], { 'x': 40 }, 'x');
     * // => 2
     *
     * var dict = {
     *   'wordToNumber': { 'twenty': 20, 'thirty': 30, 'fourty': 40, 'fifty': 50 }
     * };
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return dict.wordToNumber[word];
     * });
     * // => 2
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return this.wordToNumber[word];
     * }, dict);
     * // => 2
     */
    function sortedIndex(array, value, callback, thisArg) {
      var low = 0,
          high = array ? array.length : low;

      // explicitly reference `identity` for better inlining in Firefox
      callback = callback ? lodash.createCallback(callback, thisArg, 1) : identity;
      value = callback(value);

      while (low < high) {
        var mid = (low + high) >>> 1;
        (callback(array[mid]) < value)
          ? low = mid + 1
          : high = mid;
      }
      return low;
    }

    /**
     * Creates an array of unique values, in order, of the provided arrays using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of combined values.
     * @example
     *
     * _.union([1, 2, 3], [5, 2, 1, 4], [2, 1]);
     * // => [1, 2, 3, 5, 4]
     */
    function union() {
      return baseUniq(baseFlatten(arguments, true, true));
    }

    /**
     * Creates a duplicate-value-free version of an array using strict equality
     * for comparisons, i.e. `===`. If the array is sorted, providing
     * `true` for `isSorted` will use a faster algorithm. If a callback is provided
     * each element of `array` is passed through the callback before uniqueness
     * is computed. The callback is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is provided for `callback` the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is provided for `callback` the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias unique
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {boolean} [isSorted=false] A flag to indicate that `array` is sorted.
     * @param {Function|Object|string} [callback=identity] The function called
     *  per iteration. If a property name or object is provided it will be used
     *  to create a "_.pluck" or "_.where" style callback, respectively.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a duplicate-value-free array.
     * @example
     *
     * _.uniq([1, 2, 1, 3, 1]);
     * // => [1, 2, 3]
     *
     * _.uniq([1, 1, 2, 2, 3], true);
     * // => [1, 2, 3]
     *
     * _.uniq(['A', 'b', 'C', 'a', 'B', 'c'], function(letter) { return letter.toLowerCase(); });
     * // => ['A', 'b', 'C']
     *
     * _.uniq([1, 2.5, 3, 1.5, 2, 3.5], function(num) { return this.floor(num); }, Math);
     * // => [1, 2.5, 3]
     *
     * // using "_.pluck" callback shorthand
     * _.uniq([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }, { 'x': 2 }]
     */
    function uniq(array, isSorted, callback, thisArg) {
      // juggle arguments
      if (typeof isSorted != 'boolean' && isSorted != null) {
        thisArg = callback;
        callback = (typeof isSorted != 'function' && thisArg && thisArg[isSorted] === array) ? null : isSorted;
        isSorted = false;
      }
      if (callback != null) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      return baseUniq(array, isSorted, callback);
    }

    /**
     * Creates an array excluding all provided values using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to filter.
     * @param {...*} [value] The values to exclude.
     * @returns {Array} Returns a new array of filtered values.
     * @example
     *
     * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
     * // => [2, 3, 4]
     */
    function without(array) {
      return baseDifference(array, slice(arguments, 1));
    }

    /**
     * Creates an array that is the symmetric difference of the provided arrays.
     * See http://en.wikipedia.org/wiki/Symmetric_difference.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {...Array} [array] The arrays to inspect.
     * @returns {Array} Returns an array of values.
     * @example
     *
     * _.xor([1, 2, 3], [5, 2, 1, 4]);
     * // => [3, 5, 4]
     *
     * _.xor([1, 2, 5], [2, 3, 5], [3, 4, 5]);
     * // => [1, 4, 5]
     */
    function xor() {
      var index = -1,
          length = arguments.length;

      while (++index < length) {
        var array = arguments[index];
        if (isArray(array) || isArguments(array)) {
          var result = result
            ? baseUniq(baseDifference(result, array).concat(baseDifference(array, result)))
            : array;
        }
      }
      return result || [];
    }

    /**
     * Creates an array of grouped elements, the first of which contains the first
     * elements of the given arrays, the second of which contains the second
     * elements of the given arrays, and so on.
     *
     * @static
     * @memberOf _
     * @alias unzip
     * @category Arrays
     * @param {...Array} [array] Arrays to process.
     * @returns {Array} Returns a new array of grouped elements.
     * @example
     *
     * _.zip(['fred', 'barney'], [30, 40], [true, false]);
     * // => [['fred', 30, true], ['barney', 40, false]]
     */
    function zip() {
      var array = arguments.length > 1 ? arguments : arguments[0],
          index = -1,
          length = array ? max(pluck(array, 'length')) : 0,
          result = Array(length < 0 ? 0 : length);

      while (++index < length) {
        result[index] = pluck(array, index);
      }
      return result;
    }

    /**
     * Creates an object composed from arrays of `keys` and `values`. Provide
     * either a single two dimensional array, i.e. `[[key1, value1], [key2, value2]]`
     * or two arrays, one of `keys` and one of corresponding `values`.
     *
     * @static
     * @memberOf _
     * @alias object
     * @category Arrays
     * @param {Array} keys The array of keys.
     * @param {Array} [values=[]] The array of values.
     * @returns {Object} Returns an object composed of the given keys and
     *  corresponding values.
     * @example
     *
     * _.zipObject(['fred', 'barney'], [30, 40]);
     * // => { 'fred': 30, 'barney': 40 }
     */
    function zipObject(keys, values) {
      var index = -1,
          length = keys ? keys.length : 0,
          result = {};

      if (!values && length && !isArray(keys[0])) {
        values = [];
      }
      while (++index < length) {
        var key = keys[index];
        if (values) {
          result[key] = values[index];
        } else if (key) {
          result[key[0]] = key[1];
        }
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function that executes `func`, with  the `this` binding and
     * arguments of the created function, only after being called `n` times.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {number} n The number of times the function must be called before
     *  `func` is executed.
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var saves = ['profile', 'settings'];
     *
     * var done = _.after(saves.length, function() {
     *   console.log('Done saving!');
     * });
     *
     * _.forEach(saves, function(type) {
     *   asyncSave({ 'type': type, 'complete': done });
     * });
     * // => logs 'Done saving!', after all saves have completed
     */
    function after(n, func) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      return function() {
        if (--n < 1) {
          return func.apply(this, arguments);
        }
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with the `this`
     * binding of `thisArg` and prepends any additional `bind` arguments to those
     * provided to the bound function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to bind.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var func = function(greeting) {
     *   return greeting + ' ' + this.name;
     * };
     *
     * func = _.bind(func, { 'name': 'fred' }, 'hi');
     * func();
     * // => 'hi fred'
     */
    function bind(func, thisArg) {
      return arguments.length > 2
        ? createWrapper(func, 17, slice(arguments, 2), null, thisArg)
        : createWrapper(func, 1, null, null, thisArg);
    }

    /**
     * Binds methods of an object to the object itself, overwriting the existing
     * method. Method names may be specified as individual arguments or as arrays
     * of method names. If no method names are provided all the function properties
     * of `object` will be bound.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object to bind and assign the bound methods to.
     * @param {...string} [methodName] The object method names to
     *  bind, specified as individual method names or arrays of method names.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var view = {
     *   'label': 'docs',
     *   'onClick': function() { console.log('clicked ' + this.label); }
     * };
     *
     * _.bindAll(view);
     * jQuery('#docs').on('click', view.onClick);
     * // => logs 'clicked docs', when the button is clicked
     */
    function bindAll(object) {
      var funcs = arguments.length > 1 ? baseFlatten(arguments, true, false, 1) : functions(object),
          index = -1,
          length = funcs.length;

      while (++index < length) {
        var key = funcs[index];
        object[key] = createWrapper(object[key], 1, null, null, object);
      }
      return object;
    }

    /**
     * Creates a function that, when called, invokes the method at `object[key]`
     * and prepends any additional `bindKey` arguments to those provided to the bound
     * function. This method differs from `_.bind` by allowing bound functions to
     * reference methods that will be redefined or don't yet exist.
     * See http://michaux.ca/articles/lazy-function-definition-pattern.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object the method belongs to.
     * @param {string} key The key of the method.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var object = {
     *   'name': 'fred',
     *   'greet': function(greeting) {
     *     return greeting + ' ' + this.name;
     *   }
     * };
     *
     * var func = _.bindKey(object, 'greet', 'hi');
     * func();
     * // => 'hi fred'
     *
     * object.greet = function(greeting) {
     *   return greeting + 'ya ' + this.name + '!';
     * };
     *
     * func();
     * // => 'hiya fred!'
     */
    function bindKey(object, key) {
      return arguments.length > 2
        ? createWrapper(key, 19, slice(arguments, 2), null, object)
        : createWrapper(key, 3, null, null, object);
    }

    /**
     * Creates a function that is the composition of the provided functions,
     * where each function consumes the return value of the function that follows.
     * For example, composing the functions `f()`, `g()`, and `h()` produces `f(g(h()))`.
     * Each function is executed with the `this` binding of the composed function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {...Function} [func] Functions to compose.
     * @returns {Function} Returns the new composed function.
     * @example
     *
     * var realNameMap = {
     *   'pebbles': 'penelope'
     * };
     *
     * var format = function(name) {
     *   name = realNameMap[name.toLowerCase()] || name;
     *   return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
     * };
     *
     * var greet = function(formatted) {
     *   return 'Hiya ' + formatted + '!';
     * };
     *
     * var welcome = _.compose(greet, format);
     * welcome('pebbles');
     * // => 'Hiya Penelope!'
     */
    function compose() {
      var funcs = arguments,
          length = funcs.length;

      while (length--) {
        if (!isFunction(funcs[length])) {
          throw new TypeError;
        }
      }
      return function() {
        var args = arguments,
            length = funcs.length;

        while (length--) {
          args = [funcs[length].apply(this, args)];
        }
        return args[0];
      };
    }

    /**
     * Creates a function which accepts one or more arguments of `func` that when
     * invoked either executes `func` returning its result, if all `func` arguments
     * have been provided, or returns a function that accepts one or more of the
     * remaining `func` arguments, and so on. The arity of `func` can be specified
     * if `func.length` is not sufficient.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to curry.
     * @param {number} [arity=func.length] The arity of `func`.
     * @returns {Function} Returns the new curried function.
     * @example
     *
     * var curried = _.curry(function(a, b, c) {
     *   console.log(a + b + c);
     * });
     *
     * curried(1)(2)(3);
     * // => 6
     *
     * curried(1, 2)(3);
     * // => 6
     *
     * curried(1, 2, 3);
     * // => 6
     */
    function curry(func, arity) {
      arity = typeof arity == 'number' ? arity : (+arity || func.length);
      return createWrapper(func, 4, null, null, null, arity);
    }

    /**
     * Creates a function that will delay the execution of `func` until after
     * `wait` milliseconds have elapsed since the last time it was invoked.
     * Provide an options object to indicate that `func` should be invoked on
     * the leading and/or trailing edge of the `wait` timeout. Subsequent calls
     * to the debounced function will return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true` `func` will be called
     * on the trailing edge of the timeout only if the the debounced function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to debounce.
     * @param {number} wait The number of milliseconds to delay.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=false] Specify execution on the leading edge of the timeout.
     * @param {number} [options.maxWait] The maximum time `func` is allowed to be delayed before it's called.
     * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * // avoid costly calculations while the window size is in flux
     * var lazyLayout = _.debounce(calculateLayout, 150);
     * jQuery(window).on('resize', lazyLayout);
     *
     * // execute `sendMail` when the click event is fired, debouncing subsequent calls
     * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
     *   'leading': true,
     *   'trailing': false
     * });
     *
     * // ensure `batchLog` is executed once after 1 second of debounced calls
     * var source = new EventSource('/stream');
     * source.addEventListener('message', _.debounce(batchLog, 250, {
     *   'maxWait': 1000
     * }, false);
     */
    function debounce(func, wait, options) {
      var args,
          maxTimeoutId,
          result,
          stamp,
          thisArg,
          timeoutId,
          trailingCall,
          lastCalled = 0,
          maxWait = false,
          trailing = true;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      wait = nativeMax(0, wait) || 0;
      if (options === true) {
        var leading = true;
        trailing = false;
      } else if (isObject(options)) {
        leading = options.leading;
        maxWait = 'maxWait' in options && (nativeMax(wait, options.maxWait) || 0);
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      var delayed = function() {
        var remaining = wait - (now() - stamp);
        if (remaining <= 0) {
          if (maxTimeoutId) {
            clearTimeout(maxTimeoutId);
          }
          var isCalled = trailingCall;
          maxTimeoutId = timeoutId = trailingCall = undefined;
          if (isCalled) {
            lastCalled = now();
            result = func.apply(thisArg, args);
            if (!timeoutId && !maxTimeoutId) {
              args = thisArg = null;
            }
          }
        } else {
          timeoutId = setTimeout(delayed, remaining);
        }
      };

      var maxDelayed = function() {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        maxTimeoutId = timeoutId = trailingCall = undefined;
        if (trailing || (maxWait !== wait)) {
          lastCalled = now();
          result = func.apply(thisArg, args);
          if (!timeoutId && !maxTimeoutId) {
            args = thisArg = null;
          }
        }
      };

      return function() {
        args = arguments;
        stamp = now();
        thisArg = this;
        trailingCall = trailing && (timeoutId || !leading);

        if (maxWait === false) {
          var leadingCall = leading && !timeoutId;
        } else {
          if (!maxTimeoutId && !leading) {
            lastCalled = stamp;
          }
          var remaining = maxWait - (stamp - lastCalled),
              isCalled = remaining <= 0;

          if (isCalled) {
            if (maxTimeoutId) {
              maxTimeoutId = clearTimeout(maxTimeoutId);
            }
            lastCalled = stamp;
            result = func.apply(thisArg, args);
          }
          else if (!maxTimeoutId) {
            maxTimeoutId = setTimeout(maxDelayed, remaining);
          }
        }
        if (isCalled && timeoutId) {
          timeoutId = clearTimeout(timeoutId);
        }
        else if (!timeoutId && wait !== maxWait) {
          timeoutId = setTimeout(delayed, wait);
        }
        if (leadingCall) {
          isCalled = true;
          result = func.apply(thisArg, args);
        }
        if (isCalled && !timeoutId && !maxTimeoutId) {
          args = thisArg = null;
        }
        return result;
      };
    }

    /**
     * Defers executing the `func` function until the current call stack has cleared.
     * Additional arguments will be provided to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to defer.
     * @param {...*} [arg] Arguments to invoke the function with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.defer(function(text) { console.log(text); }, 'deferred');
     * // logs 'deferred' after one or more milliseconds
     */
    function defer(func) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var args = slice(arguments, 1);
      return setTimeout(function() { func.apply(undefined, args); }, 1);
    }

    /**
     * Executes the `func` function after `wait` milliseconds. Additional arguments
     * will be provided to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to delay.
     * @param {number} wait The number of milliseconds to delay execution.
     * @param {...*} [arg] Arguments to invoke the function with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.delay(function(text) { console.log(text); }, 1000, 'later');
     * // => logs 'later' after one second
     */
    function delay(func, wait) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var args = slice(arguments, 2);
      return setTimeout(function() { func.apply(undefined, args); }, wait);
    }

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided it will be used to determine the cache key for storing the result
     * based on the arguments provided to the memoized function. By default, the
     * first argument provided to the memoized function is used as the cache key.
     * The `func` is executed with the `this` binding of the memoized function.
     * The result cache is exposed as the `cache` property on the memoized function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] A function used to resolve the cache key.
     * @returns {Function} Returns the new memoizing function.
     * @example
     *
     * var fibonacci = _.memoize(function(n) {
     *   return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
     * });
     *
     * fibonacci(9)
     * // => 34
     *
     * var data = {
     *   'fred': { 'name': 'fred', 'age': 40 },
     *   'pebbles': { 'name': 'pebbles', 'age': 1 }
     * };
     *
     * // modifying the result cache
     * var get = _.memoize(function(name) { return data[name]; }, _.identity);
     * get('pebbles');
     * // => { 'name': 'pebbles', 'age': 1 }
     *
     * get.cache.pebbles.name = 'penelope';
     * get('pebbles');
     * // => { 'name': 'penelope', 'age': 1 }
     */
    function memoize(func, resolver) {
      if (!isFunction(func)) {
        throw new TypeError;
      }
      var memoized = function() {
        var cache = memoized.cache,
            key = resolver ? resolver.apply(this, arguments) : keyPrefix + arguments[0];

        return hasOwnProperty.call(cache, key)
          ? cache[key]
          : (cache[key] = func.apply(this, arguments));
      }
      memoized.cache = {};
      return memoized;
    }

    /**
     * Creates a function that is restricted to execute `func` once. Repeat calls to
     * the function will return the value of the first call. The `func` is executed
     * with the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var initialize = _.once(createApplication);
     * initialize();
     * initialize();
     * // `initialize` executes `createApplication` once
     */
    function once(func) {
      var ran,
          result;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      return function() {
        if (ran) {
          return result;
        }
        ran = true;
        result = func.apply(this, arguments);

        // clear the `func` variable so the function may be garbage collected
        func = null;
        return result;
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with any additional
     * `partial` arguments prepended to those provided to the new function. This
     * method is similar to `_.bind` except it does **not** alter the `this` binding.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var greet = function(greeting, name) { return greeting + ' ' + name; };
     * var hi = _.partial(greet, 'hi');
     * hi('fred');
     * // => 'hi fred'
     */
    function partial(func) {
      return createWrapper(func, 16, slice(arguments, 1));
    }

    /**
     * This method is like `_.partial` except that `partial` arguments are
     * appended to those provided to the new function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [arg] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var defaultsDeep = _.partialRight(_.merge, _.defaults);
     *
     * var options = {
     *   'variable': 'data',
     *   'imports': { 'jq': $ }
     * };
     *
     * defaultsDeep(options, _.templateSettings);
     *
     * options.variable
     * // => 'data'
     *
     * options.imports
     * // => { '_': _, 'jq': $ }
     */
    function partialRight(func) {
      return createWrapper(func, 32, null, slice(arguments, 1));
    }

    /**
     * Creates a function that, when executed, will only call the `func` function
     * at most once per every `wait` milliseconds. Provide an options object to
     * indicate that `func` should be invoked on the leading and/or trailing edge
     * of the `wait` timeout. Subsequent calls to the throttled function will
     * return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true` `func` will be called
     * on the trailing edge of the timeout only if the the throttled function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to throttle.
     * @param {number} wait The number of milliseconds to throttle executions to.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.leading=true] Specify execution on the leading edge of the timeout.
     * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new throttled function.
     * @example
     *
     * // avoid excessively updating the position while scrolling
     * var throttled = _.throttle(updatePosition, 100);
     * jQuery(window).on('scroll', throttled);
     *
     * // execute `renewToken` when the click event is fired, but not more than once every 5 minutes
     * jQuery('.interactive').on('click', _.throttle(renewToken, 300000, {
     *   'trailing': false
     * }));
     */
    function throttle(func, wait, options) {
      var leading = true,
          trailing = true;

      if (!isFunction(func)) {
        throw new TypeError;
      }
      if (options === false) {
        leading = false;
      } else if (isObject(options)) {
        leading = 'leading' in options ? options.leading : leading;
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      debounceOptions.leading = leading;
      debounceOptions.maxWait = wait;
      debounceOptions.trailing = trailing;

      return debounce(func, wait, debounceOptions);
    }

    /**
     * Creates a function that provides `value` to the wrapper function as its
     * first argument. Additional arguments provided to the function are appended
     * to those provided to the wrapper function. The wrapper is executed with
     * the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {*} value The value to wrap.
     * @param {Function} wrapper The wrapper function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var p = _.wrap(_.escape, function(func, text) {
     *   return '<p>' + func(text) + '</p>';
     * });
     *
     * p('Fred, Wilma, & Pebbles');
     * // => '<p>Fred, Wilma, &amp; Pebbles</p>'
     */
    function wrap(value, wrapper) {
      return createWrapper(wrapper, 16, [value]);
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function that returns `value`.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} value The value to return from the new function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var object = { 'name': 'fred' };
     * var getter = _.constant(object);
     * getter() === object;
     * // => true
     */
    function constant(value) {
      return function() {
        return value;
      };
    }

    /**
     * Produces a callback bound to an optional `thisArg`. If `func` is a property
     * name the created callback will return the property value for a given element.
     * If `func` is an object the created callback will return `true` for elements
     * that contain the equivalent object properties, otherwise it will return `false`.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} [func=identity] The value to convert to a callback.
     * @param {*} [thisArg] The `this` binding of the created callback.
     * @param {number} [argCount] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // wrap to create custom callback shorthands
     * _.createCallback = _.wrap(_.createCallback, function(func, callback, thisArg) {
     *   var match = /^(.+?)__([gl]t)(.+)$/.exec(callback);
     *   return !match ? func(callback, thisArg) : function(object) {
     *     return match[2] == 'gt' ? object[match[1]] > match[3] : object[match[1]] < match[3];
     *   };
     * });
     *
     * _.filter(characters, 'age__gt38');
     * // => [{ 'name': 'fred', 'age': 40 }]
     */
    function createCallback(func, thisArg, argCount) {
      var type = typeof func;
      if (func == null || type == 'function') {
        return baseCreateCallback(func, thisArg, argCount);
      }
      // handle "_.pluck" style callback shorthands
      if (type != 'object') {
        return property(func);
      }
      var props = keys(func),
          key = props[0],
          a = func[key];

      // handle "_.where" style callback shorthands
      if (props.length == 1 && a === a && !isObject(a)) {
        // fast path the common case of providing an object with a single
        // property containing a primitive value
        return function(object) {
          var b = object[key];
          return a === b && (a !== 0 || (1 / a == 1 / b));
        };
      }
      return function(object) {
        var length = props.length,
            result = false;

        while (length--) {
          if (!(result = baseIsEqual(object[props[length]], func[props[length]], null, true))) {
            break;
          }
        }
        return result;
      };
    }

    /**
     * Converts the characters `&`, `<`, `>`, `"`, and `'` in `string` to their
     * corresponding HTML entities.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} string The string to escape.
     * @returns {string} Returns the escaped string.
     * @example
     *
     * _.escape('Fred, Wilma, & Pebbles');
     * // => 'Fred, Wilma, &amp; Pebbles'
     */
    function escape(string) {
      return string == null ? '' : String(string).replace(reUnescapedHtml, escapeHtmlChar);
    }

    /**
     * This method returns the first argument provided to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {*} value Any value.
     * @returns {*} Returns `value`.
     * @example
     *
     * var object = { 'name': 'fred' };
     * _.identity(object) === object;
     * // => true
     */
    function identity(value) {
      return value;
    }

    /**
     * Adds function properties of a source object to the destination object.
     * If `object` is a function methods will be added to its prototype as well.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Function|Object} [object=lodash] object The destination object.
     * @param {Object} source The object of functions to add.
     * @param {Object} [options] The options object.
     * @param {boolean} [options.chain=true] Specify whether the functions added are chainable.
     * @example
     *
     * function capitalize(string) {
     *   return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
     * }
     *
     * _.mixin({ 'capitalize': capitalize });
     * _.capitalize('fred');
     * // => 'Fred'
     *
     * _('fred').capitalize().value();
     * // => 'Fred'
     *
     * _.mixin({ 'capitalize': capitalize }, { 'chain': false });
     * _('fred').capitalize();
     * // => 'Fred'
     */
    function mixin(object, source, options) {
      var chain = true,
          methodNames = source && functions(source);

      if (!source || (!options && !methodNames.length)) {
        if (options == null) {
          options = source;
        }
        ctor = lodashWrapper;
        source = object;
        object = lodash;
        methodNames = functions(source);
      }
      if (options === false) {
        chain = false;
      } else if (isObject(options) && 'chain' in options) {
        chain = options.chain;
      }
      var ctor = object,
          isFunc = isFunction(ctor);

      forEach(methodNames, function(methodName) {
        var func = object[methodName] = source[methodName];
        if (isFunc) {
          ctor.prototype[methodName] = function() {
            var chainAll = this.__chain__,
                value = this.__wrapped__,
                args = [value];

            push.apply(args, arguments);
            var result = func.apply(object, args);
            if (chain || chainAll) {
              if (value === result && isObject(result)) {
                return this;
              }
              result = new ctor(result);
              result.__chain__ = chainAll;
            }
            return result;
          };
        }
      });
    }

    /**
     * Reverts the '_' variable to its previous value and returns a reference to
     * the `lodash` function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @returns {Function} Returns the `lodash` function.
     * @example
     *
     * var lodash = _.noConflict();
     */
    function noConflict() {
      context._ = oldDash;
      return this;
    }

    /**
     * A no-operation function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @example
     *
     * var object = { 'name': 'fred' };
     * _.noop(object) === undefined;
     * // => true
     */
    function noop() {
      // no operation performed
    }

    /**
     * Gets the number of milliseconds that have elapsed since the Unix epoch
     * (1 January 1970 00:00:00 UTC).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @example
     *
     * var stamp = _.now();
     * _.defer(function() { console.log(_.now() - stamp); });
     * // => logs the number of milliseconds it took for the deferred function to be called
     */
    var now = isNative(now = Date.now) && now || function() {
      return new Date().getTime();
    };

    /**
     * Converts the given value into an integer of the specified radix.
     * If `radix` is `undefined` or `0` a `radix` of `10` is used unless the
     * `value` is a hexadecimal, in which case a `radix` of `16` is used.
     *
     * Note: This method avoids differences in native ES3 and ES5 `parseInt`
     * implementations. See http://es5.github.io/#E.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} value The value to parse.
     * @param {number} [radix] The radix used to interpret the value to parse.
     * @returns {number} Returns the new integer value.
     * @example
     *
     * _.parseInt('08');
     * // => 8
     */
    var parseInt = nativeParseInt(whitespace + '08') == 8 ? nativeParseInt : function(value, radix) {
      // Firefox < 21 and Opera < 15 follow the ES3 specified implementation of `parseInt`
      return nativeParseInt(isString(value) ? value.replace(reLeadingSpacesAndZeros, '') : value, radix || 0);
    };

    /**
     * Creates a "_.pluck" style function, which returns the `key` value of a
     * given object.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} key The name of the property to retrieve.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var characters = [
     *   { 'name': 'fred',   'age': 40 },
     *   { 'name': 'barney', 'age': 36 }
     * ];
     *
     * var getName = _.property('name');
     *
     * _.map(characters, getName);
     * // => ['barney', 'fred']
     *
     * _.sortBy(characters, getName);
     * // => [{ 'name': 'barney', 'age': 36 }, { 'name': 'fred',   'age': 40 }]
     */
    function property(key) {
      return function(object) {
        return object[key];
      };
    }

    /**
     * Produces a random number between `min` and `max` (inclusive). If only one
     * argument is provided a number between `0` and the given number will be
     * returned. If `floating` is truey or either `min` or `max` are floats a
     * floating-point number will be returned instead of an integer.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {number} [min=0] The minimum possible value.
     * @param {number} [max=1] The maximum possible value.
     * @param {boolean} [floating=false] Specify returning a floating-point number.
     * @returns {number} Returns a random number.
     * @example
     *
     * _.random(0, 5);
     * // => an integer between 0 and 5
     *
     * _.random(5);
     * // => also an integer between 0 and 5
     *
     * _.random(5, true);
     * // => a floating-point number between 0 and 5
     *
     * _.random(1.2, 5.2);
     * // => a floating-point number between 1.2 and 5.2
     */
    function random(min, max, floating) {
      var noMin = min == null,
          noMax = max == null;

      if (floating == null) {
        if (typeof min == 'boolean' && noMax) {
          floating = min;
          min = 1;
        }
        else if (!noMax && typeof max == 'boolean') {
          floating = max;
          noMax = true;
        }
      }
      if (noMin && noMax) {
        max = 1;
      }
      min = +min || 0;
      if (noMax) {
        max = min;
        min = 0;
      } else {
        max = +max || 0;
      }
      if (floating || min % 1 || max % 1) {
        var rand = nativeRandom();
        return nativeMin(min + (rand * (max - min + parseFloat('1e-' + ((rand +'').length - 1)))), max);
      }
      return baseRandom(min, max);
    }

    /**
     * Resolves the value of property `key` on `object`. If `key` is a function
     * it will be invoked with the `this` binding of `object` and its result returned,
     * else the property value is returned. If `object` is falsey then `undefined`
     * is returned.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Object} object The object to inspect.
     * @param {string} key The name of the property to resolve.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = {
     *   'cheese': 'crumpets',
     *   'stuff': function() {
     *     return 'nonsense';
     *   }
     * };
     *
     * _.result(object, 'cheese');
     * // => 'crumpets'
     *
     * _.result(object, 'stuff');
     * // => 'nonsense'
     */
    function result(object, key) {
      if (object) {
        var value = object[key];
        return isFunction(value) ? object[key]() : value;
      }
    }

    /**
     * A micro-templating method that handles arbitrary delimiters, preserves
     * whitespace, and correctly escapes quotes within interpolated code.
     *
     * Note: In the development build, `_.template` utilizes sourceURLs for easier
     * debugging. See http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
     *
     * For more information on precompiling templates see:
     * http://lodash.com/custom-builds
     *
     * For more information on Chrome extension sandboxes see:
     * http://developer.chrome.com/stable/extensions/sandboxingEval.html
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} text The template text.
     * @param {Object} data The data object used to populate the text.
     * @param {Object} [options] The options object.
     * @param {RegExp} [options.escape] The "escape" delimiter.
     * @param {RegExp} [options.evaluate] The "evaluate" delimiter.
     * @param {Object} [options.imports] An object to import into the template as local variables.
     * @param {RegExp} [options.interpolate] The "interpolate" delimiter.
     * @param {string} [sourceURL] The sourceURL of the template's compiled source.
     * @param {string} [variable] The data object variable name.
     * @returns {Function|string} Returns a compiled function when no `data` object
     *  is given, else it returns the interpolated text.
     * @example
     *
     * // using the "interpolate" delimiter to create a compiled template
     * var compiled = _.template('hello <%= name %>');
     * compiled({ 'name': 'fred' });
     * // => 'hello fred'
     *
     * // using the "escape" delimiter to escape HTML in data property values
     * _.template('<b><%- value %></b>', { 'value': '<script>' });
     * // => '<b>&lt;script&gt;</b>'
     *
     * // using the "evaluate" delimiter to generate HTML
     * var list = '<% _.forEach(people, function(name) { %><li><%- name %></li><% }); %>';
     * _.template(list, { 'people': ['fred', 'barney'] });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // using the ES6 delimiter as an alternative to the default "interpolate" delimiter
     * _.template('hello ${ name }', { 'name': 'pebbles' });
     * // => 'hello pebbles'
     *
     * // using the internal `print` function in "evaluate" delimiters
     * _.template('<% print("hello " + name); %>!', { 'name': 'barney' });
     * // => 'hello barney!'
     *
     * // using a custom template delimiters
     * _.templateSettings = {
     *   'interpolate': /{{([\s\S]+?)}}/g
     * };
     *
     * _.template('hello {{ name }}!', { 'name': 'mustache' });
     * // => 'hello mustache!'
     *
     * // using the `imports` option to import jQuery
     * var list = '<% jq.each(people, function(name) { %><li><%- name %></li><% }); %>';
     * _.template(list, { 'people': ['fred', 'barney'] }, { 'imports': { 'jq': jQuery } });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // using the `sourceURL` option to specify a custom sourceURL for the template
     * var compiled = _.template('hello <%= name %>', null, { 'sourceURL': '/basic/greeting.jst' });
     * compiled(data);
     * // => find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector
     *
     * // using the `variable` option to ensure a with-statement isn't used in the compiled template
     * var compiled = _.template('hi <%= data.name %>!', null, { 'variable': 'data' });
     * compiled.source;
     * // => function(data) {
     *   var __t, __p = '', __e = _.escape;
     *   __p += 'hi ' + ((__t = ( data.name )) == null ? '' : __t) + '!';
     *   return __p;
     * }
     *
     * // using the `source` property to inline compiled templates for meaningful
     * // line numbers in error messages and a stack trace
     * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
     *   var JST = {\
     *     "main": ' + _.template(mainText).source + '\
     *   };\
     * ');
     */
    function template(text, data, options) {
      // based on John Resig's `tmpl` implementation
      // http://ejohn.org/blog/javascript-micro-templating/
      // and Laura Doktorova's doT.js
      // https://github.com/olado/doT
      var settings = lodash.templateSettings;
      text = String(text || '');

      // avoid missing dependencies when `iteratorTemplate` is not defined
      options = defaults({}, options, settings);

      var imports = defaults({}, options.imports, settings.imports),
          importsKeys = keys(imports),
          importsValues = values(imports);

      var isEvaluating,
          index = 0,
          interpolate = options.interpolate || reNoMatch,
          source = "__p += '";

      // compile the regexp to match each delimiter
      var reDelimiters = RegExp(
        (options.escape || reNoMatch).source + '|' +
        interpolate.source + '|' +
        (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
        (options.evaluate || reNoMatch).source + '|$'
      , 'g');

      text.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
        interpolateValue || (interpolateValue = esTemplateValue);

        // escape characters that cannot be included in string literals
        source += text.slice(index, offset).replace(reUnescapedString, escapeStringChar);

        // replace delimiters with snippets
        if (escapeValue) {
          source += "' +\n__e(" + escapeValue + ") +\n'";
        }
        if (evaluateValue) {
          isEvaluating = true;
          source += "';\n" + evaluateValue + ";\n__p += '";
        }
        if (interpolateValue) {
          source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
        }
        index = offset + match.length;

        // the JS engine embedded in Adobe products requires returning the `match`
        // string in order to produce the correct `offset` value
        return match;
      });

      source += "';\n";

      // if `variable` is not specified, wrap a with-statement around the generated
      // code to add the data object to the top of the scope chain
      var variable = options.variable,
          hasVariable = variable;

      if (!hasVariable) {
        variable = 'obj';
        source = 'with (' + variable + ') {\n' + source + '\n}\n';
      }
      // cleanup code by stripping empty strings
      source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
        .replace(reEmptyStringMiddle, '$1')
        .replace(reEmptyStringTrailing, '$1;');

      // frame code as the function body
      source = 'function(' + variable + ') {\n' +
        (hasVariable ? '' : variable + ' || (' + variable + ' = {});\n') +
        "var __t, __p = '', __e = _.escape" +
        (isEvaluating
          ? ', __j = Array.prototype.join;\n' +
            "function print() { __p += __j.call(arguments, '') }\n"
          : ';\n'
        ) +
        source +
        'return __p\n}';

      // Use a sourceURL for easier debugging.
      // http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
      var sourceURL = '\n/*\n//# sourceURL=' + (options.sourceURL || '/lodash/template/source[' + (templateCounter++) + ']') + '\n*/';

      try {
        var result = Function(importsKeys, 'return ' + source + sourceURL).apply(undefined, importsValues);
      } catch(e) {
        e.source = source;
        throw e;
      }
      if (data) {
        return result(data);
      }
      // provide the compiled function's source by its `toString` method, in
      // supported environments, or the `source` property as a convenience for
      // inlining compiled templates during the build process
      result.source = source;
      return result;
    }

    /**
     * Executes the callback `n` times, returning an array of the results
     * of each callback execution. The callback is bound to `thisArg` and invoked
     * with one argument; (index).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {number} n The number of times to execute the callback.
     * @param {Function} callback The function called per iteration.
     * @param {*} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns an array of the results of each `callback` execution.
     * @example
     *
     * var diceRolls = _.times(3, _.partial(_.random, 1, 6));
     * // => [3, 6, 4]
     *
     * _.times(3, function(n) { mage.castSpell(n); });
     * // => calls `mage.castSpell(n)` three times, passing `n` of `0`, `1`, and `2` respectively
     *
     * _.times(3, function(n) { this.cast(n); }, mage);
     * // => also calls `mage.castSpell(n)` three times
     */
    function times(n, callback, thisArg) {
      n = (n = +n) > -1 ? n : 0;
      var index = -1,
          result = Array(n);

      callback = baseCreateCallback(callback, thisArg, 1);
      while (++index < n) {
        result[index] = callback(index);
      }
      return result;
    }

    /**
     * The inverse of `_.escape` this method converts the HTML entities
     * `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#39;` in `string` to their
     * corresponding characters.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} string The string to unescape.
     * @returns {string} Returns the unescaped string.
     * @example
     *
     * _.unescape('Fred, Barney &amp; Pebbles');
     * // => 'Fred, Barney & Pebbles'
     */
    function unescape(string) {
      return string == null ? '' : String(string).replace(reEscapedHtml, unescapeHtmlChar);
    }

    /**
     * Generates a unique ID. If `prefix` is provided the ID will be appended to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {string} [prefix] The value to prefix the ID with.
     * @returns {string} Returns the unique ID.
     * @example
     *
     * _.uniqueId('contact_');
     * // => 'contact_104'
     *
     * _.uniqueId();
     * // => '105'
     */
    function uniqueId(prefix) {
      var id = ++idCounter;
      return String(prefix == null ? '' : prefix) + id;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object that wraps the given value with explicit
     * method chaining enabled.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {*} value The value to wrap.
     * @returns {Object} Returns the wrapper object.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney',  'age': 36 },
     *   { 'name': 'fred',    'age': 40 },
     *   { 'name': 'pebbles', 'age': 1 }
     * ];
     *
     * var youngest = _.chain(characters)
     *     .sortBy('age')
     *     .map(function(chr) { return chr.name + ' is ' + chr.age; })
     *     .first()
     *     .value();
     * // => 'pebbles is 1'
     */
    function chain(value) {
      value = new lodashWrapper(value);
      value.__chain__ = true;
      return value;
    }

    /**
     * Invokes `interceptor` with the `value` as the first argument and then
     * returns `value`. The purpose of this method is to "tap into" a method
     * chain in order to perform operations on intermediate results within
     * the chain.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {*} value The value to provide to `interceptor`.
     * @param {Function} interceptor The function to invoke.
     * @returns {*} Returns `value`.
     * @example
     *
     * _([1, 2, 3, 4])
     *  .tap(function(array) { array.pop(); })
     *  .reverse()
     *  .value();
     * // => [3, 2, 1]
     */
    function tap(value, interceptor) {
      interceptor(value);
      return value;
    }

    /**
     * Enables explicit method chaining on the wrapper object.
     *
     * @name chain
     * @memberOf _
     * @category Chaining
     * @returns {*} Returns the wrapper object.
     * @example
     *
     * var characters = [
     *   { 'name': 'barney', 'age': 36 },
     *   { 'name': 'fred',   'age': 40 }
     * ];
     *
     * // without explicit chaining
     * _(characters).first();
     * // => { 'name': 'barney', 'age': 36 }
     *
     * // with explicit chaining
     * _(characters).chain()
     *   .first()
     *   .pick('age')
     *   .value();
     * // => { 'age': 36 }
     */
    function wrapperChain() {
      this.__chain__ = true;
      return this;
    }

    /**
     * Produces the `toString` result of the wrapped value.
     *
     * @name toString
     * @memberOf _
     * @category Chaining
     * @returns {string} Returns the string result.
     * @example
     *
     * _([1, 2, 3]).toString();
     * // => '1,2,3'
     */
    function wrapperToString() {
      return String(this.__wrapped__);
    }

    /**
     * Extracts the wrapped value.
     *
     * @name valueOf
     * @memberOf _
     * @alias value
     * @category Chaining
     * @returns {*} Returns the wrapped value.
     * @example
     *
     * _([1, 2, 3]).valueOf();
     * // => [1, 2, 3]
     */
    function wrapperValueOf() {
      return this.__wrapped__;
    }

    /*--------------------------------------------------------------------------*/

    // add functions that return wrapped values when chaining
    lodash.after = after;
    lodash.assign = assign;
    lodash.at = at;
    lodash.bind = bind;
    lodash.bindAll = bindAll;
    lodash.bindKey = bindKey;
    lodash.chain = chain;
    lodash.compact = compact;
    lodash.compose = compose;
    lodash.constant = constant;
    lodash.countBy = countBy;
    lodash.create = create;
    lodash.createCallback = createCallback;
    lodash.curry = curry;
    lodash.debounce = debounce;
    lodash.defaults = defaults;
    lodash.defer = defer;
    lodash.delay = delay;
    lodash.difference = difference;
    lodash.filter = filter;
    lodash.flatten = flatten;
    lodash.forEach = forEach;
    lodash.forEachRight = forEachRight;
    lodash.forIn = forIn;
    lodash.forInRight = forInRight;
    lodash.forOwn = forOwn;
    lodash.forOwnRight = forOwnRight;
    lodash.functions = functions;
    lodash.groupBy = groupBy;
    lodash.indexBy = indexBy;
    lodash.initial = initial;
    lodash.intersection = intersection;
    lodash.invert = invert;
    lodash.invoke = invoke;
    lodash.keys = keys;
    lodash.map = map;
    lodash.mapValues = mapValues;
    lodash.max = max;
    lodash.memoize = memoize;
    lodash.merge = merge;
    lodash.min = min;
    lodash.omit = omit;
    lodash.once = once;
    lodash.pairs = pairs;
    lodash.partial = partial;
    lodash.partialRight = partialRight;
    lodash.pick = pick;
    lodash.pluck = pluck;
    lodash.property = property;
    lodash.pull = pull;
    lodash.range = range;
    lodash.reject = reject;
    lodash.remove = remove;
    lodash.rest = rest;
    lodash.shuffle = shuffle;
    lodash.sortBy = sortBy;
    lodash.tap = tap;
    lodash.throttle = throttle;
    lodash.times = times;
    lodash.toArray = toArray;
    lodash.transform = transform;
    lodash.union = union;
    lodash.uniq = uniq;
    lodash.values = values;
    lodash.where = where;
    lodash.without = without;
    lodash.wrap = wrap;
    lodash.xor = xor;
    lodash.zip = zip;
    lodash.zipObject = zipObject;

    // add aliases
    lodash.collect = map;
    lodash.drop = rest;
    lodash.each = forEach;
    lodash.eachRight = forEachRight;
    lodash.extend = assign;
    lodash.methods = functions;
    lodash.object = zipObject;
    lodash.select = filter;
    lodash.tail = rest;
    lodash.unique = uniq;
    lodash.unzip = zip;

    // add functions to `lodash.prototype`
    mixin(lodash);

    /*--------------------------------------------------------------------------*/

    // add functions that return unwrapped values when chaining
    lodash.clone = clone;
    lodash.cloneDeep = cloneDeep;
    lodash.contains = contains;
    lodash.escape = escape;
    lodash.every = every;
    lodash.find = find;
    lodash.findIndex = findIndex;
    lodash.findKey = findKey;
    lodash.findLast = findLast;
    lodash.findLastIndex = findLastIndex;
    lodash.findLastKey = findLastKey;
    lodash.has = has;
    lodash.identity = identity;
    lodash.indexOf = indexOf;
    lodash.isArguments = isArguments;
    lodash.isArray = isArray;
    lodash.isBoolean = isBoolean;
    lodash.isDate = isDate;
    lodash.isElement = isElement;
    lodash.isEmpty = isEmpty;
    lodash.isEqual = isEqual;
    lodash.isFinite = isFinite;
    lodash.isFunction = isFunction;
    lodash.isNaN = isNaN;
    lodash.isNull = isNull;
    lodash.isNumber = isNumber;
    lodash.isObject = isObject;
    lodash.isPlainObject = isPlainObject;
    lodash.isRegExp = isRegExp;
    lodash.isString = isString;
    lodash.isUndefined = isUndefined;
    lodash.lastIndexOf = lastIndexOf;
    lodash.mixin = mixin;
    lodash.noConflict = noConflict;
    lodash.noop = noop;
    lodash.now = now;
    lodash.parseInt = parseInt;
    lodash.random = random;
    lodash.reduce = reduce;
    lodash.reduceRight = reduceRight;
    lodash.result = result;
    lodash.runInContext = runInContext;
    lodash.size = size;
    lodash.some = some;
    lodash.sortedIndex = sortedIndex;
    lodash.template = template;
    lodash.unescape = unescape;
    lodash.uniqueId = uniqueId;

    // add aliases
    lodash.all = every;
    lodash.any = some;
    lodash.detect = find;
    lodash.findWhere = find;
    lodash.foldl = reduce;
    lodash.foldr = reduceRight;
    lodash.include = contains;
    lodash.inject = reduce;

    mixin(function() {
      var source = {}
      forOwn(lodash, function(func, methodName) {
        if (!lodash.prototype[methodName]) {
          source[methodName] = func;
        }
      });
      return source;
    }(), false);

    /*--------------------------------------------------------------------------*/

    // add functions capable of returning wrapped and unwrapped values when chaining
    lodash.first = first;
    lodash.last = last;
    lodash.sample = sample;

    // add aliases
    lodash.take = first;
    lodash.head = first;

    forOwn(lodash, function(func, methodName) {
      var callbackable = methodName !== 'sample';
      if (!lodash.prototype[methodName]) {
        lodash.prototype[methodName]= function(n, guard) {
          var chainAll = this.__chain__,
              result = func(this.__wrapped__, n, guard);

          return !chainAll && (n == null || (guard && !(callbackable && typeof n == 'function')))
            ? result
            : new lodashWrapper(result, chainAll);
        };
      }
    });

    /*--------------------------------------------------------------------------*/

    /**
     * The semantic version number.
     *
     * @static
     * @memberOf _
     * @type string
     */
    lodash.VERSION = '2.4.1';

    // add "Chaining" functions to the wrapper
    lodash.prototype.chain = wrapperChain;
    lodash.prototype.toString = wrapperToString;
    lodash.prototype.value = wrapperValueOf;
    lodash.prototype.valueOf = wrapperValueOf;

    // add `Array` functions that return unwrapped values
    forEach(['join', 'pop', 'shift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        var chainAll = this.__chain__,
            result = func.apply(this.__wrapped__, arguments);

        return chainAll
          ? new lodashWrapper(result, chainAll)
          : result;
      };
    });

    // add `Array` functions that return the existing wrapped value
    forEach(['push', 'reverse', 'sort', 'unshift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        func.apply(this.__wrapped__, arguments);
        return this;
      };
    });

    // add `Array` functions that return new wrapped values
    forEach(['concat', 'slice', 'splice'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        return new lodashWrapper(func.apply(this.__wrapped__, arguments), this.__chain__);
      };
    });

    return lodash;
  }

  /*--------------------------------------------------------------------------*/

  // expose Lo-Dash
  var _ = runInContext();

  // some AMD build optimizers like r.js check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lo-Dash to the global object even when an AMD loader is present in
    // case Lo-Dash is loaded with a RequireJS shim config.
    // See http://requirejs.org/docs/api.html#config-shim
    root._ = _;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define(function() {
      return _;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports && freeModule) {
    // in Node.js or RingoJS
    if (moduleExports) {
      (freeModule.exports = _)._ = _;
    }
    // in Narwhal or Rhino -require
    else {
      freeExports._ = _;
    }
  }
  else {
    // in a browser or Rhino
    root._ = _;
  }
}.call(this));

},{}],33:[function(require,module,exports){
//  Underscore.string
//  (c) 2010 Esa-Matti Suuronen <esa-matti aet suuronen dot org>
//  Underscore.string is freely distributable under the terms of the MIT license.
//  Documentation: https://github.com/epeli/underscore.string
//  Some code is borrowed from MooTools and Alexandru Marasteanu.
//  Version '2.3.2'

!function(root, String){
  'use strict';

  // Defining helper functions.

  var nativeTrim = String.prototype.trim;
  var nativeTrimRight = String.prototype.trimRight;
  var nativeTrimLeft = String.prototype.trimLeft;

  var parseNumber = function(source) { return source * 1 || 0; };

  var strRepeat = function(str, qty){
    if (qty < 1) return '';
    var result = '';
    while (qty > 0) {
      if (qty & 1) result += str;
      qty >>= 1, str += str;
    }
    return result;
  };

  var slice = [].slice;

  var defaultToWhiteSpace = function(characters) {
    if (characters == null)
      return '\\s';
    else if (characters.source)
      return characters.source;
    else
      return '[' + _s.escapeRegExp(characters) + ']';
  };

  // Helper for toBoolean
  function boolMatch(s, matchers) {
    var i, matcher, down = s.toLowerCase();
    matchers = [].concat(matchers);
    for (i = 0; i < matchers.length; i += 1) {
      matcher = matchers[i];
      if (!matcher) continue;
      if (matcher.test && matcher.test(s)) return true;
      if (matcher.toLowerCase() === down) return true;
    }
  }

  var escapeChars = {
    lt: '<',
    gt: '>',
    quot: '"',
    amp: '&',
    apos: "'"
  };

  var reversedEscapeChars = {};
  for(var key in escapeChars) reversedEscapeChars[escapeChars[key]] = key;
  reversedEscapeChars["'"] = '#39';

  // sprintf() for JavaScript 0.7-beta1
  // http://www.diveintojavascript.com/projects/javascript-sprintf
  //
  // Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>
  // All rights reserved.

  var sprintf = (function() {
    function get_type(variable) {
      return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
    }

    var str_repeat = strRepeat;

    var str_format = function() {
      if (!str_format.cache.hasOwnProperty(arguments[0])) {
        str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
      }
      return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
    };

    str_format.format = function(parse_tree, argv) {
      var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
      for (i = 0; i < tree_length; i++) {
        node_type = get_type(parse_tree[i]);
        if (node_type === 'string') {
          output.push(parse_tree[i]);
        }
        else if (node_type === 'array') {
          match = parse_tree[i]; // convenience purposes only
          if (match[2]) { // keyword argument
            arg = argv[cursor];
            for (k = 0; k < match[2].length; k++) {
              if (!arg.hasOwnProperty(match[2][k])) {
                throw new Error(sprintf('[_.sprintf] property "%s" does not exist', match[2][k]));
              }
              arg = arg[match[2][k]];
            }
          } else if (match[1]) { // positional argument (explicit)
            arg = argv[match[1]];
          }
          else { // positional argument (implicit)
            arg = argv[cursor++];
          }

          if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
            throw new Error(sprintf('[_.sprintf] expecting number but found %s', get_type(arg)));
          }
          switch (match[8]) {
            case 'b': arg = arg.toString(2); break;
            case 'c': arg = String.fromCharCode(arg); break;
            case 'd': arg = parseInt(arg, 10); break;
            case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
            case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
            case 'o': arg = arg.toString(8); break;
            case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
            case 'u': arg = Math.abs(arg); break;
            case 'x': arg = arg.toString(16); break;
            case 'X': arg = arg.toString(16).toUpperCase(); break;
          }
          arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
          pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
          pad_length = match[6] - String(arg).length;
          pad = match[6] ? str_repeat(pad_character, pad_length) : '';
          output.push(match[5] ? arg + pad : pad + arg);
        }
      }
      return output.join('');
    };

    str_format.cache = {};

    str_format.parse = function(fmt) {
      var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
      while (_fmt) {
        if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
          parse_tree.push(match[0]);
        }
        else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
          parse_tree.push('%');
        }
        else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
          if (match[2]) {
            arg_names |= 1;
            var field_list = [], replacement_field = match[2], field_match = [];
            if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
              field_list.push(field_match[1]);
              while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
                if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                }
                else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                }
                else {
                  throw new Error('[_.sprintf] huh?');
                }
              }
            }
            else {
              throw new Error('[_.sprintf] huh?');
            }
            match[2] = field_list;
          }
          else {
            arg_names |= 2;
          }
          if (arg_names === 3) {
            throw new Error('[_.sprintf] mixing positional and named placeholders is not (yet) supported');
          }
          parse_tree.push(match);
        }
        else {
          throw new Error('[_.sprintf] huh?');
        }
        _fmt = _fmt.substring(match[0].length);
      }
      return parse_tree;
    };

    return str_format;
  })();



  // Defining underscore.string

  var _s = {

    VERSION: '2.3.0',

    isBlank: function(str){
      if (str == null) str = '';
      return (/^\s*$/).test(str);
    },

    stripTags: function(str){
      if (str == null) return '';
      return String(str).replace(/<\/?[^>]+>/g, '');
    },

    capitalize : function(str){
      str = str == null ? '' : String(str);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    chop: function(str, step){
      if (str == null) return [];
      str = String(str);
      step = ~~step;
      return step > 0 ? str.match(new RegExp('.{1,' + step + '}', 'g')) : [str];
    },

    clean: function(str){
      return _s.strip(str).replace(/\s+/g, ' ');
    },

    count: function(str, substr){
      if (str == null || substr == null) return 0;

      str = String(str);
      substr = String(substr);

      var count = 0,
        pos = 0,
        length = substr.length;

      while (true) {
        pos = str.indexOf(substr, pos);
        if (pos === -1) break;
        count++;
        pos += length;
      }

      return count;
    },

    chars: function(str) {
      if (str == null) return [];
      return String(str).split('');
    },

    swapCase: function(str) {
      if (str == null) return '';
      return String(str).replace(/\S/g, function(c){
        return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
      });
    },

    escapeHTML: function(str) {
      if (str == null) return '';
      return String(str).replace(/[&<>"']/g, function(m){ return '&' + reversedEscapeChars[m] + ';'; });
    },

    unescapeHTML: function(str) {
      if (str == null) return '';
      return String(str).replace(/\&([^;]+);/g, function(entity, entityCode){
        var match;

        if (entityCode in escapeChars) {
          return escapeChars[entityCode];
        } else if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) {
          return String.fromCharCode(parseInt(match[1], 16));
        } else if (match = entityCode.match(/^#(\d+)$/)) {
          return String.fromCharCode(~~match[1]);
        } else {
          return entity;
        }
      });
    },

    escapeRegExp: function(str){
      if (str == null) return '';
      return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
    },

    splice: function(str, i, howmany, substr){
      var arr = _s.chars(str);
      arr.splice(~~i, ~~howmany, substr);
      return arr.join('');
    },

    insert: function(str, i, substr){
      return _s.splice(str, i, 0, substr);
    },

    include: function(str, needle){
      if (needle === '') return true;
      if (str == null) return false;
      return String(str).indexOf(needle) !== -1;
    },

    join: function() {
      var args = slice.call(arguments),
        separator = args.shift();

      if (separator == null) separator = '';

      return args.join(separator);
    },

    lines: function(str) {
      if (str == null) return [];
      return String(str).split("\n");
    },

    reverse: function(str){
      return _s.chars(str).reverse().join('');
    },

    startsWith: function(str, starts){
      if (starts === '') return true;
      if (str == null || starts == null) return false;
      str = String(str); starts = String(starts);
      return str.length >= starts.length && str.slice(0, starts.length) === starts;
    },

    endsWith: function(str, ends){
      if (ends === '') return true;
      if (str == null || ends == null) return false;
      str = String(str); ends = String(ends);
      return str.length >= ends.length && str.slice(str.length - ends.length) === ends;
    },

    succ: function(str){
      if (str == null) return '';
      str = String(str);
      return str.slice(0, -1) + String.fromCharCode(str.charCodeAt(str.length-1) + 1);
    },

    titleize: function(str){
      if (str == null) return '';
      str  = String(str).toLowerCase();
      return str.replace(/(?:^|\s|-)\S/g, function(c){ return c.toUpperCase(); });
    },

    camelize: function(str){
      return _s.trim(str).replace(/[-_\s]+(.)?/g, function(match, c){ return c ? c.toUpperCase() : ""; });
    },

    underscored: function(str){
      return _s.trim(str).replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
    },

    dasherize: function(str){
      return _s.trim(str).replace(/([A-Z])/g, '-$1').replace(/[-_\s]+/g, '-').toLowerCase();
    },

    classify: function(str){
      return _s.titleize(String(str).replace(/[\W_]/g, ' ')).replace(/\s/g, '');
    },

    humanize: function(str){
      return _s.capitalize(_s.underscored(str).replace(/_id$/,'').replace(/_/g, ' '));
    },

    trim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrim) return nativeTrim.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp('\^' + characters + '+|' + characters + '+$', 'g'), '');
    },

    ltrim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrimLeft) return nativeTrimLeft.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp('^' + characters + '+'), '');
    },

    rtrim: function(str, characters){
      if (str == null) return '';
      if (!characters && nativeTrimRight) return nativeTrimRight.call(str);
      characters = defaultToWhiteSpace(characters);
      return String(str).replace(new RegExp(characters + '+$'), '');
    },

    truncate: function(str, length, truncateStr){
      if (str == null) return '';
      str = String(str); truncateStr = truncateStr || '...';
      length = ~~length;
      return str.length > length ? str.slice(0, length) + truncateStr : str;
    },

    /**
     * _s.prune: a more elegant version of truncate
     * prune extra chars, never leaving a half-chopped word.
     * @author github.com/rwz
     */
    prune: function(str, length, pruneStr){
      if (str == null) return '';

      str = String(str); length = ~~length;
      pruneStr = pruneStr != null ? String(pruneStr) : '...';

      if (str.length <= length) return str;

      var tmpl = function(c){ return c.toUpperCase() !== c.toLowerCase() ? 'A' : ' '; },
        template = str.slice(0, length+1).replace(/.(?=\W*\w*$)/g, tmpl); // 'Hello, world' -> 'HellAA AAAAA'

      if (template.slice(template.length-2).match(/\w\w/))
        template = template.replace(/\s*\S+$/, '');
      else
        template = _s.rtrim(template.slice(0, template.length-1));

      return (template+pruneStr).length > str.length ? str : str.slice(0, template.length)+pruneStr;
    },

    words: function(str, delimiter) {
      if (_s.isBlank(str)) return [];
      return _s.trim(str, delimiter).split(delimiter || /\s+/);
    },

    pad: function(str, length, padStr, type) {
      str = str == null ? '' : String(str);
      length = ~~length;

      var padlen  = 0;

      if (!padStr)
        padStr = ' ';
      else if (padStr.length > 1)
        padStr = padStr.charAt(0);

      switch(type) {
        case 'right':
          padlen = length - str.length;
          return str + strRepeat(padStr, padlen);
        case 'both':
          padlen = length - str.length;
          return strRepeat(padStr, Math.ceil(padlen/2)) + str
                  + strRepeat(padStr, Math.floor(padlen/2));
        default: // 'left'
          padlen = length - str.length;
          return strRepeat(padStr, padlen) + str;
        }
    },

    lpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr);
    },

    rpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr, 'right');
    },

    lrpad: function(str, length, padStr) {
      return _s.pad(str, length, padStr, 'both');
    },

    sprintf: sprintf,

    vsprintf: function(fmt, argv){
      argv.unshift(fmt);
      return sprintf.apply(null, argv);
    },

    toNumber: function(str, decimals) {
      if (!str) return 0;
      str = _s.trim(str);
      if (!str.match(/^-?\d+(?:\.\d+)?$/)) return NaN;
      return parseNumber(parseNumber(str).toFixed(~~decimals));
    },

    numberFormat : function(number, dec, dsep, tsep) {
      if (isNaN(number) || number == null) return '';

      number = number.toFixed(~~dec);
      tsep = typeof tsep == 'string' ? tsep : ',';

      var parts = number.split('.'), fnums = parts[0],
        decimals = parts[1] ? (dsep || '.') + parts[1] : '';

      return fnums.replace(/(\d)(?=(?:\d{3})+$)/g, '$1' + tsep) + decimals;
    },

    strRight: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.indexOf(sep);
      return ~pos ? str.slice(pos+sep.length, str.length) : str;
    },

    strRightBack: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.lastIndexOf(sep);
      return ~pos ? str.slice(pos+sep.length, str.length) : str;
    },

    strLeft: function(str, sep){
      if (str == null) return '';
      str = String(str); sep = sep != null ? String(sep) : sep;
      var pos = !sep ? -1 : str.indexOf(sep);
      return ~pos ? str.slice(0, pos) : str;
    },

    strLeftBack: function(str, sep){
      if (str == null) return '';
      str += ''; sep = sep != null ? ''+sep : sep;
      var pos = str.lastIndexOf(sep);
      return ~pos ? str.slice(0, pos) : str;
    },

    toSentence: function(array, separator, lastSeparator, serial) {
      separator = separator || ', ';
      lastSeparator = lastSeparator || ' and ';
      var a = array.slice(), lastMember = a.pop();

      if (array.length > 2 && serial) lastSeparator = _s.rtrim(separator) + lastSeparator;

      return a.length ? a.join(separator) + lastSeparator + lastMember : lastMember;
    },

    toSentenceSerial: function() {
      var args = slice.call(arguments);
      args[3] = true;
      return _s.toSentence.apply(_s, args);
    },

    slugify: function(str) {
      if (str == null) return '';

      var from  = "ąàáäâãåæăćęèéëêìíïîłńòóöôõøśșțùúüûñçżź",
          to    = "aaaaaaaaaceeeeeiiiilnoooooosstuuuunczz",
          regex = new RegExp(defaultToWhiteSpace(from), 'g');

      str = String(str).toLowerCase().replace(regex, function(c){
        var index = from.indexOf(c);
        return to.charAt(index) || '-';
      });

      return _s.dasherize(str.replace(/[^\w\s-]/g, ''));
    },

    surround: function(str, wrapper) {
      return [wrapper, str, wrapper].join('');
    },

    quote: function(str, quoteChar) {
      return _s.surround(str, quoteChar || '"');
    },

    unquote: function(str, quoteChar) {
      quoteChar = quoteChar || '"';
      if (str[0] === quoteChar && str[str.length-1] === quoteChar)
        return str.slice(1,str.length-1);
      else return str;
    },

    exports: function() {
      var result = {};

      for (var prop in this) {
        if (!this.hasOwnProperty(prop) || prop.match(/^(?:include|contains|reverse)$/)) continue;
        result[prop] = this[prop];
      }

      return result;
    },

    repeat: function(str, qty, separator){
      if (str == null) return '';

      qty = ~~qty;

      // using faster implementation if separator is not needed;
      if (separator == null) return strRepeat(String(str), qty);

      // this one is about 300x slower in Google Chrome
      for (var repeat = []; qty > 0; repeat[--qty] = str) {}
      return repeat.join(separator);
    },

    naturalCmp: function(str1, str2){
      if (str1 == str2) return 0;
      if (!str1) return -1;
      if (!str2) return 1;

      var cmpRegex = /(\.\d+)|(\d+)|(\D+)/g,
        tokens1 = String(str1).toLowerCase().match(cmpRegex),
        tokens2 = String(str2).toLowerCase().match(cmpRegex),
        count = Math.min(tokens1.length, tokens2.length);

      for(var i = 0; i < count; i++) {
        var a = tokens1[i], b = tokens2[i];

        if (a !== b){
          var num1 = parseInt(a, 10);
          if (!isNaN(num1)){
            var num2 = parseInt(b, 10);
            if (!isNaN(num2) && num1 - num2)
              return num1 - num2;
          }
          return a < b ? -1 : 1;
        }
      }

      if (tokens1.length === tokens2.length)
        return tokens1.length - tokens2.length;

      return str1 < str2 ? -1 : 1;
    },

    levenshtein: function(str1, str2) {
      if (str1 == null && str2 == null) return 0;
      if (str1 == null) return String(str2).length;
      if (str2 == null) return String(str1).length;

      str1 = String(str1); str2 = String(str2);

      var current = [], prev, value;

      for (var i = 0; i <= str2.length; i++)
        for (var j = 0; j <= str1.length; j++) {
          if (i && j)
            if (str1.charAt(j - 1) === str2.charAt(i - 1))
              value = prev;
            else
              value = Math.min(current[j], current[j - 1], prev) + 1;
          else
            value = i + j;

          prev = current[j];
          current[j] = value;
        }

      return current.pop();
    },

    toBoolean: function(str, trueValues, falseValues) {
      if (typeof str === "number") str = "" + str;
      if (typeof str !== "string") return !!str;
      str = _s.trim(str);
      if (boolMatch(str, trueValues || ["true", "1"])) return true;
      if (boolMatch(str, falseValues || ["false", "0"])) return false;
    }
  };

  // Aliases

  _s.strip    = _s.trim;
  _s.lstrip   = _s.ltrim;
  _s.rstrip   = _s.rtrim;
  _s.center   = _s.lrpad;
  _s.rjust    = _s.lpad;
  _s.ljust    = _s.rpad;
  _s.contains = _s.include;
  _s.q        = _s.quote;
  _s.toBool   = _s.toBoolean;

  // Exporting

  // CommonJS module is defined
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports)
      module.exports = _s;

    exports._s = _s;
  }

  // Register as a named module with AMD.
  if (typeof define === 'function' && define.amd)
    define('underscore.string', [], function(){ return _s; });


  // Integrate with Underscore.js if defined
  // or create our own underscore object.
  root._ = root._ || {};
  root._.string = root._.str = _s;
}(this, String);

},{}]},{},[20])

;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BpcGVsaW5lL2J1aWxkL2ZyYW1lci9BbmltYXRpb24uY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGlwZWxpbmUvYnVpbGQvZnJhbWVyL0FuaW1hdGlvbkxvb3AuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGlwZWxpbmUvYnVpbGQvZnJhbWVyL0FuaW1hdG9yLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BpcGVsaW5lL2J1aWxkL2ZyYW1lci9BbmltYXRvcnMvQmV6aWVyQ3VydmVBbmltYXRvci5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9waXBlbGluZS9idWlsZC9mcmFtZXIvQW5pbWF0b3JzL0xpbmVhckFuaW1hdG9yLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BpcGVsaW5lL2J1aWxkL2ZyYW1lci9BbmltYXRvcnMvU3ByaW5nREhPQW5pbWF0b3IuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGlwZWxpbmUvYnVpbGQvZnJhbWVyL0FuaW1hdG9ycy9TcHJpbmdSSzRBbmltYXRvci5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9waXBlbGluZS9idWlsZC9mcmFtZXIvQmFja2dyb3VuZExheWVyLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BpcGVsaW5lL2J1aWxkL2ZyYW1lci9CYXNlQ2xhc3MuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGlwZWxpbmUvYnVpbGQvZnJhbWVyL0NvbXBhdC5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9waXBlbGluZS9idWlsZC9mcmFtZXIvQ29uZmlnLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BpcGVsaW5lL2J1aWxkL2ZyYW1lci9EZWJ1Zy5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9waXBlbGluZS9idWlsZC9mcmFtZXIvRGVmYXVsdHMuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGlwZWxpbmUvYnVpbGQvZnJhbWVyL0V2ZW50RW1pdHRlci5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9waXBlbGluZS9idWlsZC9mcmFtZXIvRXZlbnRzLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BpcGVsaW5lL2J1aWxkL2ZyYW1lci9FeHRyYXMvRXh0cmFzLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BpcGVsaW5lL2J1aWxkL2ZyYW1lci9FeHRyYXMvTW9iaWxlU2Nyb2xsRml4LmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BpcGVsaW5lL2J1aWxkL2ZyYW1lci9FeHRyYXMvT21pdE5ldy5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9waXBlbGluZS9idWlsZC9mcmFtZXIvRnJhbWUuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGlwZWxpbmUvYnVpbGQvZnJhbWVyL0ZyYW1lci5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9waXBlbGluZS9idWlsZC9mcmFtZXIvSW1wb3J0ZXIuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGlwZWxpbmUvYnVpbGQvZnJhbWVyL0xheWVyLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BpcGVsaW5lL2J1aWxkL2ZyYW1lci9MYXllckRyYWdnYWJsZS5jb2ZmZWUiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9waXBlbGluZS9idWlsZC9mcmFtZXIvTGF5ZXJTdGF0ZXMuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGlwZWxpbmUvYnVpbGQvZnJhbWVyL0xheWVyU3R5bGUuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGlwZWxpbmUvYnVpbGQvZnJhbWVyL1ByaW50LmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BpcGVsaW5lL2J1aWxkL2ZyYW1lci9TY3JlZW4uY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGlwZWxpbmUvYnVpbGQvZnJhbWVyL1Nlc3Npb24uY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGlwZWxpbmUvYnVpbGQvZnJhbWVyL1VuZGVyc2NvcmUuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGlwZWxpbmUvYnVpbGQvZnJhbWVyL1V0aWxzLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BpcGVsaW5lL2J1aWxkL2ZyYW1lci9WaWRlb0xheWVyLmNvZmZlZSIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BpcGVsaW5lL2J1aWxkL25vZGVfbW9kdWxlcy9sb2Rhc2gvZGlzdC9sb2Rhc2guanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9waXBlbGluZS9idWlsZC9ub2RlX21vZHVsZXMvdW5kZXJzY29yZS5zdHJpbmcvbGliL3VuZGVyc2NvcmUuc3RyaW5nLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxJQUFBLHVPQUFBO0dBQUE7OztrU0FBQTs7QUFBQyxDQUFELEVBQU0sSUFBQSxPQUFBOztBQUVOLENBRkEsRUFFUSxFQUFSLEVBQVEsRUFBQTs7QUFFUCxDQUpELEVBSVcsR0FKWCxDQUlXLEdBQUE7O0FBQ1YsQ0FMRCxFQUthLElBQUEsQ0FMYixJQUthOztBQUNaLENBTkQsRUFNaUIsSUFBQSxLQU5qQixJQU1pQjs7QUFDaEIsQ0FQRCxFQU9VLEVBUFYsRUFPVSxFQUFBOztBQUVULENBVEQsRUFTbUIsSUFBQSxPQVRuQixjQVNtQjs7QUFDbEIsQ0FWRCxFQVV3QixJQUFBLFlBVnhCLGNBVXdCOztBQUN2QixDQVhELEVBV3NCLElBQUEsVUFYdEIsY0FXc0I7O0FBQ3JCLENBWkQsRUFZc0IsSUFBQSxVQVp0QixjQVlzQjs7QUFFdEIsQ0FkQSxFQWVDLFlBREQ7Q0FDQyxDQUFBLE1BQUEsTUFBQTtDQUFBLENBQ0EsWUFBQSxLQURBO0NBQUEsQ0FFQSxVQUFBLEtBRkE7Q0FBQSxDQUdBLFVBQUEsS0FIQTtDQWZELENBQUE7O0FBb0JBLENBcEJBLEVBb0I0QixL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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pvTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJmcmFtZXIuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyJ7X30gPSByZXF1aXJlIFwiLi9VbmRlcnNjb3JlXCJcblxuVXRpbHMgPSByZXF1aXJlIFwiLi9VdGlsc1wiXG5cbntDb25maWd9ID0gcmVxdWlyZSBcIi4vQ29uZmlnXCJcbntEZWZhdWx0c30gPSByZXF1aXJlIFwiLi9EZWZhdWx0c1wiXG57RXZlbnRFbWl0dGVyfSA9IHJlcXVpcmUgXCIuL0V2ZW50RW1pdHRlclwiXG57RnJhbWV9ID0gcmVxdWlyZSBcIi4vRnJhbWVcIlxuXG57TGluZWFyQW5pbWF0b3J9ID0gcmVxdWlyZSBcIi4vQW5pbWF0b3JzL0xpbmVhckFuaW1hdG9yXCJcbntCZXppZXJDdXJ2ZUFuaW1hdG9yfSA9IHJlcXVpcmUgXCIuL0FuaW1hdG9ycy9CZXppZXJDdXJ2ZUFuaW1hdG9yXCJcbntTcHJpbmdSSzRBbmltYXRvcn0gPSByZXF1aXJlIFwiLi9BbmltYXRvcnMvU3ByaW5nUks0QW5pbWF0b3JcIlxue1NwcmluZ0RIT0FuaW1hdG9yfSA9IHJlcXVpcmUgXCIuL0FuaW1hdG9ycy9TcHJpbmdESE9BbmltYXRvclwiXG5cbkFuaW1hdG9yQ2xhc3NlcyA9XG5cdFwibGluZWFyXCI6IExpbmVhckFuaW1hdG9yXG5cdFwiYmV6aWVyLWN1cnZlXCI6IEJlemllckN1cnZlQW5pbWF0b3Jcblx0XCJzcHJpbmctcms0XCI6IFNwcmluZ1JLNEFuaW1hdG9yXG5cdFwic3ByaW5nLWRob1wiOiBTcHJpbmdESE9BbmltYXRvclxuXG5BbmltYXRvckNsYXNzZXNbXCJzcHJpbmdcIl0gPSBBbmltYXRvckNsYXNzZXNbXCJzcHJpbmctcms0XCJdXG5BbmltYXRvckNsYXNzZXNbXCJjdWJpYy1iZXppZXJcIl0gPSBBbmltYXRvckNsYXNzZXNbXCJiZXppZXItY3VydmVcIl1cblxubnVtYmVyUkUgPSAvWystXT8oPzpcXGQqXFwufClcXGQrKD86W2VFXVsrLV0/XFxkK3wpL1xucmVsYXRpdmVQcm9wZXJ0eVJFID0gbmV3IFJlZ0V4cCgnXig/OihbKy1dKT18KSgnICsgbnVtYmVyUkUuc291cmNlICsgJykoW2EteiVdKikkJywgJ2knKVxuXG5pc1JlbGF0aXZlUHJvcGVydHkgPSAodikgLT5cblx0Xy5pc1N0cmluZyh2KSBhbmQgcmVsYXRpdmVQcm9wZXJ0eVJFLnRlc3QodilcblxuZXZhbHVhdGVSZWxhdGl2ZVByb3BlcnR5ID0gKHRhcmdldCwgaywgdikgLT5cblx0W21hdGNoLCBzaWduLCBudW1iZXIsIHVuaXQsIHJlc3QuLi5dID0gcmVsYXRpdmVQcm9wZXJ0eVJFLmV4ZWModilcblxuXHRpZiBzaWduXG5cdFx0cmV0dXJuIHRhcmdldFtrXSArIChzaWduICsgMSkgKiBudW1iZXJcblx0ZWxzZVxuXHRcdHJldHVybiArbnVtYmVyXG5cbl9ydW5uaW5nQW5pbWF0aW9ucyA9IFtdXG5cbiMgVG9kbzogdGhpcyB3b3VsZCBub3JtYWxseSBiZSBCYXNlQ2xhc3MgYnV0IHRoZSBwcm9wZXJ0aWVzIGtleXdvcmRcbiMgaXMgbm90IGNvbXBhdGlibGUgYW5kIGNhdXNlcyBwcm9ibGVtcy5cbmNsYXNzIGV4cG9ydHMuQW5pbWF0aW9uIGV4dGVuZHMgRXZlbnRFbWl0dGVyXG5cblx0QHJ1bm5pbmdBbmltYXRpb25zID0gLT5cblx0XHRfcnVubmluZ0FuaW1hdGlvbnNcblxuXHRjb25zdHJ1Y3RvcjogKG9wdGlvbnM9e30pIC0+XG5cblx0XHRvcHRpb25zID0gRGVmYXVsdHMuZ2V0RGVmYXVsdHMgXCJBbmltYXRpb25cIiwgb3B0aW9uc1xuXG5cdFx0c3VwZXIgb3B0aW9uc1xuXG5cdFx0QG9wdGlvbnMgPSBVdGlscy5zZXREZWZhdWx0UHJvcGVydGllcyBvcHRpb25zLFxuXHRcdFx0bGF5ZXI6IG51bGxcblx0XHRcdHByb3BlcnRpZXM6IHt9XG5cdFx0XHRjdXJ2ZTogXCJsaW5lYXJcIlxuXHRcdFx0Y3VydmVPcHRpb25zOiB7fVxuXHRcdFx0dGltZTogMVxuXHRcdFx0cmVwZWF0OiAwXG5cdFx0XHRkZWxheTogMFxuXHRcdFx0ZGVidWc6IGZhbHNlXG5cblx0XHRpZiBvcHRpb25zLm9yaWdpblxuXHRcdFx0Y29uc29sZS53YXJuIFwiQW5pbWF0aW9uLm9yaWdpbjogcGxlYXNlIHVzZSBsYXllci5vcmlnaW5YIGFuZCBsYXllci5vcmlnaW5ZXCJcblxuXHRcdCMgQ29udmVydCBhIGZyYW1lIGluc3RhbmNlIHRvIGEgcmVndWxhciBqcyBvYmplY3Rcblx0XHRpZiBvcHRpb25zLnByb3BlcnRpZXMgaW5zdGFuY2VvZiBGcmFtZVxuXHRcdFx0b3B0aW9uLnByb3BlcnRpZXMgPSBvcHRpb24ucHJvcGVydGllcy5wcm9wZXJ0aWVzXG5cblx0XHRAb3B0aW9ucy5wcm9wZXJ0aWVzID0gQF9maWx0ZXJBbmltYXRhYmxlUHJvcGVydGllcyBAb3B0aW9ucy5wcm9wZXJ0aWVzXG5cblx0XHRAX3BhcnNlQW5pbWF0b3JPcHRpb25zKClcblx0XHRAX29yaWdpbmFsU3RhdGUgPSBAX2N1cnJlbnRTdGF0ZSgpXG5cdFx0QF9yZXBlYXRDb3VudGVyID0gQG9wdGlvbnMucmVwZWF0XG5cblx0X2ZpbHRlckFuaW1hdGFibGVQcm9wZXJ0aWVzOiAocHJvcGVydGllcykgLT5cblxuXHRcdGFuaW1hdGFibGVQcm9wZXJ0aWVzID0ge31cblxuXHRcdCMgT25seSBhbmltYXRlIG51bWVyaWMgcHJvcGVydGllcyBmb3Igbm93XG5cdFx0Zm9yIGssIHYgb2YgcHJvcGVydGllc1xuXHRcdFx0YW5pbWF0YWJsZVByb3BlcnRpZXNba10gPSB2IGlmIF8uaXNOdW1iZXIodikgb3IgaXNSZWxhdGl2ZVByb3BlcnR5KHYpXG5cblx0XHRhbmltYXRhYmxlUHJvcGVydGllc1xuXG5cdF9jdXJyZW50U3RhdGU6IC0+XG5cdFx0Xy5waWNrIEBvcHRpb25zLmxheWVyLCBfLmtleXMoQG9wdGlvbnMucHJvcGVydGllcylcblxuXHRfYW5pbWF0b3JDbGFzczogLT5cblxuXHRcdHBhcnNlZEN1cnZlID0gVXRpbHMucGFyc2VGdW5jdGlvbiBAb3B0aW9ucy5jdXJ2ZVxuXHRcdGFuaW1hdG9yQ2xhc3NOYW1lID0gcGFyc2VkQ3VydmUubmFtZS50b0xvd2VyQ2FzZSgpXG5cblx0XHRpZiBBbmltYXRvckNsYXNzZXMuaGFzT3duUHJvcGVydHkgYW5pbWF0b3JDbGFzc05hbWVcblx0XHRcdHJldHVybiBBbmltYXRvckNsYXNzZXNbYW5pbWF0b3JDbGFzc05hbWVdXG5cblx0XHRyZXR1cm4gTGluZWFyQW5pbWF0b3JcblxuXHRfcGFyc2VBbmltYXRvck9wdGlvbnM6IC0+XG5cblx0XHRhbmltYXRvckNsYXNzID0gQF9hbmltYXRvckNsYXNzKClcblx0XHRwYXJzZWRDdXJ2ZSA9IFV0aWxzLnBhcnNlRnVuY3Rpb24gQG9wdGlvbnMuY3VydmVcblxuXHRcdCMgVGhpcyBpcyBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIHRoZSBkaXJlY3QgQW5pbWF0aW9uLnRpbWUgYXJndW1lbnQuIFRoaXMgc2hvdWxkXG5cdFx0IyBpZGVhbGx5IGFsc28gYmUgcGFzc2VkIGFzIGEgY3VydmVPcHRpb25cblxuXHRcdGlmIGFuaW1hdG9yQ2xhc3MgaW4gW0xpbmVhckFuaW1hdG9yLCBCZXppZXJDdXJ2ZUFuaW1hdG9yXVxuXHRcdFx0aWYgXy5pc1N0cmluZyhAb3B0aW9ucy5jdXJ2ZU9wdGlvbnMpIG9yIF8uaXNBcnJheShAb3B0aW9ucy5jdXJ2ZU9wdGlvbnMpXG5cdFx0XHRcdEBvcHRpb25zLmN1cnZlT3B0aW9ucyA9XG5cdFx0XHRcdFx0dmFsdWVzOiBAb3B0aW9ucy5jdXJ2ZU9wdGlvbnNcblxuXHRcdFx0QG9wdGlvbnMuY3VydmVPcHRpb25zLnRpbWUgPz0gQG9wdGlvbnMudGltZVxuXG5cdFx0IyBBbGwgdGhpcyBpcyB0byBzdXBwb3J0IGN1cnZlOiBcInNwcmluZygxMDAsMjAsMTApXCIuIEluIHRoZSBmdXR1cmUgd2UnZCBsaWtlIHBlb3BsZVxuXHRcdCMgdG8gc3RhcnQgdXNpbmcgY3VydmVPcHRpb25zOiB7dGVuc2lvbjoxMDAsIGZyaWN0aW9uOjEwfSBldGNcblxuXHRcdGlmIHBhcnNlZEN1cnZlLmFyZ3MubGVuZ3RoXG5cblx0XHRcdCMgY29uc29sZS53YXJuIFwiQW5pbWF0aW9uLmN1cnZlIGFyZ3VtZW50cyBhcmUgZGVwcmVjYXRlZC4gUGxlYXNlIHVzZSBBbmltYXRpb24uY3VydmVPcHRpb25zXCJcblxuXHRcdFx0aWYgYW5pbWF0b3JDbGFzcyBpcyBCZXppZXJDdXJ2ZUFuaW1hdG9yXG5cdFx0XHRcdEBvcHRpb25zLmN1cnZlT3B0aW9ucy52YWx1ZXMgPSBwYXJzZWRDdXJ2ZS5hcmdzLm1hcCAodikgLT4gcGFyc2VGbG9hdCh2KSBvciAwXG5cblx0XHRcdGlmIGFuaW1hdG9yQ2xhc3MgaXMgU3ByaW5nUks0QW5pbWF0b3Jcblx0XHRcdFx0Zm9yIGssIGkgaW4gW1widGVuc2lvblwiLCBcImZyaWN0aW9uXCIsIFwidmVsb2NpdHlcIl1cblx0XHRcdFx0XHR2YWx1ZSA9IHBhcnNlRmxvYXQgcGFyc2VkQ3VydmUuYXJnc1tpXVxuXHRcdFx0XHRcdEBvcHRpb25zLmN1cnZlT3B0aW9uc1trXSA9IHZhbHVlIGlmIHZhbHVlXG5cblx0XHRcdGlmIGFuaW1hdG9yQ2xhc3MgaXMgU3ByaW5nREhPQW5pbWF0b3Jcblx0XHRcdFx0Zm9yIGssIGkgaW4gW1wic3RpZmZuZXNzXCIsIFwiZGFtcGluZ1wiLCBcIm1hc3NcIiwgXCJ0b2xlcmFuY2VcIl1cblx0XHRcdFx0XHR2YWx1ZSA9IHBhcnNlRmxvYXQgcGFyc2VkQ3VydmUuYXJnc1tpXVxuXHRcdFx0XHRcdEBvcHRpb25zLmN1cnZlT3B0aW9uc1trXSA9IHZhbHVlIGlmIHZhbHVlXG5cblx0c3RhcnQ6ID0+XG5cblx0XHRpZiBAb3B0aW9ucy5sYXllciBpcyBudWxsXG5cdFx0XHRjb25zb2xlLmVycm9yIFwiQW5pbWF0aW9uOiBtaXNzaW5nIGxheWVyXCJcblxuXHRcdEFuaW1hdG9yQ2xhc3MgPSBAX2FuaW1hdG9yQ2xhc3MoKVxuXG5cdFx0aWYgQG9wdGlvbnMuZGVidWdcblx0XHRcdGNvbnNvbGUubG9nIFwiQW5pbWF0aW9uLnN0YXJ0ICN7QW5pbWF0b3JDbGFzcy5uYW1lfVwiLCBAb3B0aW9ucy5jdXJ2ZU9wdGlvbnNcblxuXHRcdEBfYW5pbWF0b3IgPSBuZXcgQW5pbWF0b3JDbGFzcyBAb3B0aW9ucy5jdXJ2ZU9wdGlvbnNcblxuXHRcdHRhcmdldCA9IEBvcHRpb25zLmxheWVyXG5cdFx0c3RhdGVBID0gQF9jdXJyZW50U3RhdGUoKVxuXHRcdHN0YXRlQiA9IHt9XG5cblx0XHRmb3IgaywgdiBvZiBAb3B0aW9ucy5wcm9wZXJ0aWVzXG5cdFx0XHQjIEV2YWx1YXRlIHJlbGF0aXZlIHByb3BlcnRpZXNcblx0XHRcdHYgPSBldmFsdWF0ZVJlbGF0aXZlUHJvcGVydHkodGFyZ2V0LCBrLCB2KSBpZiBpc1JlbGF0aXZlUHJvcGVydHkodilcblxuXHRcdFx0IyBGaWx0ZXIgb3V0IHRoZSBwcm9wZXJ0aWVzIHRoYXQgYXJlIGVxdWFsXG5cdFx0XHRzdGF0ZUJba10gPSB2IGlmIHN0YXRlQVtrXSAhPSB2XG5cblx0XHRpZiBfLmlzRXF1YWwgc3RhdGVBLCBzdGF0ZUJcblx0XHRcdGNvbnNvbGUud2FybiBcIk5vdGhpbmcgdG8gYW5pbWF0ZVwiXG5cblx0XHRpZiBAb3B0aW9ucy5kZWJ1Z1xuXHRcdFx0Y29uc29sZS5sb2cgXCJBbmltYXRpb24uc3RhcnRcIlxuXHRcdFx0Y29uc29sZS5sb2cgXCJcXHQje2t9OiAje3N0YXRlQVtrXX0gLT4gI3tzdGF0ZUJba119XCIgZm9yIGssIHYgb2Ygc3RhdGVCXG5cblx0XHRAX2FuaW1hdG9yLm9uIFwic3RhcnRcIiwgPT4gQGVtaXQgXCJzdGFydFwiXG5cdFx0QF9hbmltYXRvci5vbiBcInN0b3BcIiwgID0+IEBlbWl0IFwic3RvcFwiXG5cdFx0QF9hbmltYXRvci5vbiBcImVuZFwiLCAgID0+IEBlbWl0IFwiZW5kXCJcblxuXHRcdCMgU2VlIGlmIHdlIG5lZWQgdG8gcmVwZWF0IHRoaXMgYW5pbWF0aW9uXG5cdFx0IyBUb2RvOiBtb3JlIHJlcGVhdCBiZWhhdmlvdXJzOlxuXHRcdCMgMSkgYWRkIChmcm9tIGVuZCBwb3NpdGlvbikgMikgcmV2ZXJzZSAobG9vcCBiZXR3ZWVuIGEgYW5kIGIpXG5cdFx0aWYgQF9yZXBlYXRDb3VudGVyID4gMFxuXHRcdFx0QF9hbmltYXRvci5vbiBcImVuZFwiLCA9PlxuXHRcdFx0XHRmb3IgaywgdiBvZiBzdGF0ZUFcblx0XHRcdFx0XHR0YXJnZXRba10gPSB2XG5cdFx0XHRcdEBfcmVwZWF0Q291bnRlci0tXG5cdFx0XHRcdEBzdGFydCgpXG5cblx0XHQjIFRoaXMgaXMgdGhlIGZ1bmN0aW9uIHRoYXQgc2V0cyB0aGUgYWN0dWFsIHZhbHVlIHRvIHRoZSBsYXllciBpbiB0aGVcblx0XHQjIGFuaW1hdGlvbiBsb29wLiBJdCBuZWVkcyB0byBiZSB2ZXJ5IGZhc3QuXG5cdFx0QF9hbmltYXRvci5vbiBcInRpY2tcIiwgKHZhbHVlKSAtPlxuXHRcdFx0Zm9yIGssIHYgb2Ygc3RhdGVCXG5cdFx0XHRcdHRhcmdldFtrXSA9IFV0aWxzLm1hcFJhbmdlIHZhbHVlLCAwLCAxLCBzdGF0ZUFba10sIHN0YXRlQltrXVxuXHRcdFx0cmV0dXJuICMgRm9yIHBlcmZvcm1hbmNlXG5cblx0XHRzdGFydCA9ID0+XG5cdFx0XHRfcnVubmluZ0FuaW1hdGlvbnMucHVzaCBAXG5cdFx0XHRAX2FuaW1hdG9yLnN0YXJ0KClcblxuXHRcdCMgSWYgd2UgaGF2ZSBhIGRlbGF5LCB3ZSB3YWl0IGEgYml0IGZvciBpdCB0byBzdGFydFxuXHRcdGlmIEBvcHRpb25zLmRlbGF5XG5cdFx0XHRVdGlscy5kZWxheSBAb3B0aW9ucy5kZWxheSwgc3RhcnRcblx0XHRlbHNlXG5cdFx0XHRzdGFydCgpXG5cblxuXHRzdG9wOiAtPlxuXHRcdEBfYW5pbWF0b3I/LnN0b3AoKVxuXHRcdF9ydW5uaW5nQW5pbWF0aW9ucyA9IF8ud2l0aG91dCBfcnVubmluZ0FuaW1hdGlvbnMsIEBcblxuXHRyZXZlcnNlOiAtPlxuXHRcdCMgVE9ETzogQWRkIHNvbWUgdGVzdHNcblx0XHRvcHRpb25zID0gXy5jbG9uZSBAb3B0aW9uc1xuXHRcdG9wdGlvbnMucHJvcGVydGllcyA9IEBfb3JpZ2luYWxTdGF0ZVxuXHRcdGFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb24gb3B0aW9uc1xuXHRcdGFuaW1hdGlvblxuXG5cdCMgQSBidW5jaCBvZiBjb21tb24gYWxpYXNlcyB0byBtaW5pbWl6ZSBmcnVzdHJhdGlvblxuXHRyZXZlcnQ6IC0+IFx0QHJldmVyc2UoKVxuXHRpbnZlcnNlOiAtPiBAcmV2ZXJzZSgpXG5cdGludmVydDogLT4gXHRAcmV2ZXJzZSgpXG5cblx0ZW1pdDogKGV2ZW50KSAtPlxuXHRcdHN1cGVyXG5cdFx0IyBBbHNvIGVtaXQgdGhpcyB0byB0aGUgbGF5ZXIgd2l0aCBzZWxmIGFzIGFyZ3VtZW50XG5cdFx0QG9wdGlvbnMubGF5ZXIuZW1pdCBldmVudCwgQFxuIiwie199ID0gcmVxdWlyZSBcIi4vVW5kZXJzY29yZVwiXG5cblV0aWxzID0gcmVxdWlyZSBcIi4vVXRpbHNcIlxuXG57Q29uZmlnfSA9IHJlcXVpcmUgXCIuL0NvbmZpZ1wiXG57RXZlbnRFbWl0dGVyfSA9IHJlcXVpcmUgXCIuL0V2ZW50RW1pdHRlclwiXG5cbiMgTm90ZTogdGhpcyBpcyBub3QgYW4gb2JqZWN0IGJlY2F1c2UgdGhlcmUgc2hvdWxkIHJlYWxseSBvbmx5IGJlIG9uZVxuXG5BbmltYXRpb25Mb29wSW5kZXhLZXkgPSBcIl9hbmltYXRpb25Mb29wSW5kZXhcIlxuXG5BbmltYXRpb25Mb29wID0gXG5cblx0ZGVidWc6IGZhbHNlXG5cblx0X2FuaW1hdG9yczogW11cblx0X3J1bm5pbmc6IGZhbHNlXG5cdF9mcmFtZUNvdW50ZXI6IDBcblx0X3Nlc3Npb25UaW1lOiAwXG5cdFxuXHRfc3RhcnQ6IC0+XG5cblx0XHRpZiBBbmltYXRpb25Mb29wLl9ydW5uaW5nXG5cdFx0XHRyZXR1cm5cblxuXHRcdGlmIG5vdCBBbmltYXRpb25Mb29wLl9hbmltYXRvcnMubGVuZ3RoXG5cdFx0XHRyZXR1cm5cblxuXHRcdEFuaW1hdGlvbkxvb3AuX3J1bm5pbmcgPSB0cnVlXG5cdFx0QW5pbWF0aW9uTG9vcC5fdGltZSA9IFV0aWxzLmdldFRpbWUoKVxuXHRcdEFuaW1hdGlvbkxvb3AuX3Nlc3Npb25UaW1lID0gMFxuXG5cdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSBBbmltYXRpb25Mb29wLl90aWNrXG5cblx0X3N0b3A6IC0+XG5cdFx0IyBjb25zb2xlLmxvZyBcIkFuaW1hdGlvbkxvb3AuX3N0b3BcIlxuXHRcdEFuaW1hdGlvbkxvb3AuX3J1bm5pbmcgPSBmYWxzZVxuXG5cblx0X3RpY2s6IC0+XG5cblx0XHRpZiBub3QgQW5pbWF0aW9uTG9vcC5fYW5pbWF0b3JzLmxlbmd0aFxuXHRcdFx0cmV0dXJuIEFuaW1hdGlvbkxvb3AuX3N0b3AoKVxuXG5cdFx0IyBpZiBBbmltYXRpb25Mb29wLl9zZXNzaW9uVGltZSA9PSAwXG5cdFx0IyBcdGNvbnNvbGUubG9nIFwiQW5pbWF0aW9uTG9vcC5fc3RhcnRcIlxuXG5cdFx0QW5pbWF0aW9uTG9vcC5fZnJhbWVDb3VudGVyKytcblx0XHRcblx0XHR0aW1lICA9IFV0aWxzLmdldFRpbWUoKVxuXHRcdGRlbHRhID0gdGltZSAtIEFuaW1hdGlvbkxvb3AuX3RpbWVcblxuXHRcdEFuaW1hdGlvbkxvb3AuX3Nlc3Npb25UaW1lICs9IGRlbHRhXG5cblx0XHQjIGNvbnNvbGUuZGVidWcgW1xuXHRcdCMgXHRcIl90aWNrICN7QW5pbWF0aW9uTG9vcC5fZnJhbWVDb3VudGVyfSBcIixcblx0XHQjIFx0XCIje1V0aWxzLnJvdW5kKGRlbHRhLCA1KX1tcyBcIixcblx0XHQjIFx0XCIje1V0aWxzLnJvdW5kKEFuaW1hdGlvbkxvb3AuX3Nlc3Npb25UaW1lLCA1KX1cIixcblx0XHQjIFx0XCJhbmltYXRvcnM6I3tBbmltYXRpb25Mb29wLl9hbmltYXRvcnMubGVuZ3RofVwiXG5cdFx0IyBdLmpvaW4gXCIgXCJcblxuXHRcdHJlbW92ZUFuaW1hdG9ycyA9IFtdXG5cblx0XHRmb3IgYW5pbWF0b3IgaW4gQW5pbWF0aW9uTG9vcC5fYW5pbWF0b3JzXG5cblx0XHRcdGFuaW1hdG9yLmVtaXQgXCJ0aWNrXCIsIGFuaW1hdG9yLm5leHQoZGVsdGEpXG5cblx0XHRcdGlmIGFuaW1hdG9yLmZpbmlzaGVkKClcblx0XHRcdFx0YW5pbWF0b3IuZW1pdCBcInRpY2tcIiwgMSAjIFRoaXMgbWFrZXMgc3VyZSB3ZSBhbmQgYXQgYSBwZXJmZWN0IHZhbHVlXG5cdFx0XHRcdHJlbW92ZUFuaW1hdG9ycy5wdXNoIGFuaW1hdG9yXG5cblx0XHRBbmltYXRpb25Mb29wLl90aW1lID0gdGltZVxuXG5cdFx0Zm9yIGFuaW1hdG9yIGluIHJlbW92ZUFuaW1hdG9yc1xuXHRcdFx0QW5pbWF0aW9uTG9vcC5yZW1vdmUgYW5pbWF0b3Jcblx0XHRcdGFuaW1hdG9yLmVtaXQgXCJlbmRcIlxuXG5cdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSBBbmltYXRpb25Mb29wLl90aWNrXG5cblx0XHRyZXR1cm4gIyBJbXBvcnRhbnQgZm9yIHBlcmZvcm1hbmNlXG5cblx0YWRkOiAoYW5pbWF0b3IpIC0+XG5cblx0XHRpZiBhbmltYXRvci5oYXNPd25Qcm9wZXJ0eSBBbmltYXRpb25Mb29wSW5kZXhLZXlcblx0XHRcdHJldHVyblxuXG5cdFx0YW5pbWF0b3JbQW5pbWF0aW9uTG9vcEluZGV4S2V5XSA9IEFuaW1hdGlvbkxvb3AuX2FuaW1hdG9ycy5wdXNoIGFuaW1hdG9yXG5cdFx0YW5pbWF0b3IuZW1pdCBcInN0YXJ0XCJcblx0XHRBbmltYXRpb25Mb29wLl9zdGFydCgpXG5cblx0cmVtb3ZlOiAoYW5pbWF0b3IpIC0+XG5cdFx0QW5pbWF0aW9uTG9vcC5fYW5pbWF0b3JzID0gXy53aXRob3V0IEFuaW1hdGlvbkxvb3AuX2FuaW1hdG9ycywgYW5pbWF0b3Jcblx0XHRhbmltYXRvci5lbWl0IFwic3RvcFwiXG5cbmV4cG9ydHMuQW5pbWF0aW9uTG9vcCA9IEFuaW1hdGlvbkxvb3BcbiIsIlV0aWxzID0gcmVxdWlyZSBcIi4vVXRpbHNcIlxuXG57Q29uZmlnfSA9IHJlcXVpcmUgXCIuL0NvbmZpZ1wiXG57RXZlbnRFbWl0dGVyfSA9IHJlcXVpcmUgXCIuL0V2ZW50RW1pdHRlclwiXG57QW5pbWF0aW9uTG9vcH0gPSByZXF1aXJlIFwiLi9BbmltYXRpb25Mb29wXCJcblxuY2xhc3MgZXhwb3J0cy5BbmltYXRvciBleHRlbmRzIEV2ZW50RW1pdHRlclxuXG5cdFwiXCJcIlxuXHRUaGUgYW5pbWF0b3IgY2xhc3MgaXMgYSB2ZXJ5IHNpbXBsZSBjbGFzcyB0aGF0XG5cdFx0LSBUYWtlcyBhIHNldCBvZiBpbnB1dCB2YWx1ZXMgYXQgc2V0dXAoe2lucHV0IHZhbHVlc30pXG5cdFx0LSBFbWl0cyBhbiBvdXRwdXQgdmFsdWUgZm9yIHByb2dyZXNzICgwIC0+IDEpIGluIHZhbHVlKHByb2dyZXNzKVxuXHRcIlwiXCJcblx0XG5cdGNvbnN0cnVjdG9yOiAob3B0aW9ucz17fSkgLT5cblx0XHRAc2V0dXAgb3B0aW9uc1xuXG5cdHNldHVwOiAob3B0aW9ucykgLT5cblx0XHR0aHJvdyBFcnJvciBcIk5vdCBpbXBsZW1lbnRlZFwiXG5cblx0bmV4dDogKGRlbHRhKSAtPlxuXHRcdHRocm93IEVycm9yIFwiTm90IGltcGxlbWVudGVkXCJcblxuXHRmaW5pc2hlZDogLT5cblx0XHR0aHJvdyBFcnJvciBcIk5vdCBpbXBsZW1lbnRlZFwiXG5cblx0c3RhcnQ6IC0+IEFuaW1hdGlvbkxvb3AuYWRkIEBcblx0c3RvcDogLT4gQW5pbWF0aW9uTG9vcC5yZW1vdmUgQFxuIiwie199ID0gcmVxdWlyZSBcIi4uL1VuZGVyc2NvcmVcIlxuVXRpbHMgPSByZXF1aXJlIFwiLi4vVXRpbHNcIlxuXG57QW5pbWF0b3J9ID0gcmVxdWlyZSBcIi4uL0FuaW1hdG9yXCJcblxuQmV6aWVyQ3VydmVEZWZhdWx0cyA9XG5cdFwibGluZWFyXCI6IFswLCAwLCAxLCAxXVxuXHRcImVhc2VcIjogWy4yNSwgLjEsIC4yNSwgMV1cblx0XCJlYXNlLWluXCI6IFsuNDIsIDAsIDEsIDFdXG5cdFwiZWFzZS1vdXRcIjogWzAsIDAsIC41OCwgMV1cblx0XCJlYXNlLWluLW91dFwiOiBbLjQyLCAwLCAuNTgsIDFdXG5cbmNsYXNzIGV4cG9ydHMuQmV6aWVyQ3VydmVBbmltYXRvciBleHRlbmRzIEFuaW1hdG9yXG5cblx0c2V0dXA6IChvcHRpb25zKSAtPlxuXG5cdFx0IyBJbnB1dCBpcyBhIG9uZSBvZiB0aGUgbmFtZWQgYmV6aWVyIGN1cnZlc1xuXHRcdGlmIF8uaXNTdHJpbmcob3B0aW9ucykgYW5kIEJlemllckN1cnZlRGVmYXVsdHMuaGFzT3duUHJvcGVydHkgb3B0aW9ucy50b0xvd2VyQ2FzZSgpXG5cdFx0XHRvcHRpb25zID0geyB2YWx1ZXM6IEJlemllckN1cnZlRGVmYXVsdHNbb3B0aW9ucy50b0xvd2VyQ2FzZSgpXSB9XG5cblx0XHQjIElucHV0IHZhbHVlcyBpcyBvbmUgb2YgdGhlIG5hbWVkIGJlemllciBjdXJ2ZXNcblx0XHRpZiBvcHRpb25zLnZhbHVlcyBhbmQgXy5pc1N0cmluZyhvcHRpb25zLnZhbHVlcykgYW5kIEJlemllckN1cnZlRGVmYXVsdHMuaGFzT3duUHJvcGVydHkgb3B0aW9ucy52YWx1ZXMudG9Mb3dlckNhc2UoKVxuXHRcdFx0b3B0aW9ucyA9IHsgdmFsdWVzOiBCZXppZXJDdXJ2ZURlZmF1bHRzW29wdGlvbnMudmFsdWVzLnRvTG93ZXJDYXNlKCldLCB0aW1lOiBvcHRpb25zLnRpbWUgfVxuXG5cdFx0IyBJbnB1dCBpcyBhIHNpbmdsZSBhcnJheSBvZiA0IHZhbHVlc1xuXHRcdGlmIF8uaXNBcnJheShvcHRpb25zKSBhbmQgb3B0aW9ucy5sZW5ndGggaXMgNFxuXHRcdFx0b3B0aW9ucyA9IHsgdmFsdWVzOiBvcHRpb25zIH1cblxuXHRcdEBvcHRpb25zID0gVXRpbHMuc2V0RGVmYXVsdFByb3BlcnRpZXMgb3B0aW9ucyxcblx0XHRcdHZhbHVlczogQmV6aWVyQ3VydmVEZWZhdWx0c1tcImVhc2UtaW4tb3V0XCJdXG5cdFx0XHR0aW1lOiAxXG5cblx0XHRAX3VuaXRCZXppZXIgPSBuZXcgVW5pdEJlemllciBcXFxuXHRcdFx0QG9wdGlvbnMudmFsdWVzWzBdLFxuXHRcdFx0QG9wdGlvbnMudmFsdWVzWzFdLFxuXHRcdFx0QG9wdGlvbnMudmFsdWVzWzJdLFxuXHRcdFx0QG9wdGlvbnMudmFsdWVzWzNdLFxuXG5cdFx0QF90aW1lID0gMFxuXG5cblx0bmV4dDogKGRlbHRhKSAtPlxuXG5cdFx0QF90aW1lICs9IGRlbHRhXG5cblx0XHRpZiBAZmluaXNoZWQoKVxuXHRcdFx0cmV0dXJuIDFcblxuXHRcdEBfdW5pdEJlemllci5zb2x2ZSBAX3RpbWUgLyBAb3B0aW9ucy50aW1lXG5cblx0ZmluaXNoZWQ6IC0+XG5cdFx0QF90aW1lID49IEBvcHRpb25zLnRpbWVcblxuXG4jIFdlYktpdCBpbXBsZW1lbnRhdGlvbiBmb3VuZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMTY5NzkwOVxuXG5jbGFzcyBVbml0QmV6aWVyXG5cblx0ZXBzaWxvbjogMWUtNiAjIFByZWNpc2lvblxuXG5cdGNvbnN0cnVjdG9yOiAocDF4LCBwMXksIHAyeCwgcDJ5KSAtPlxuXG5cdFx0IyBwcmUtY2FsY3VsYXRlIHRoZSBwb2x5bm9taWFsIGNvZWZmaWNpZW50c1xuXHRcdCMgRmlyc3QgYW5kIGxhc3QgY29udHJvbCBwb2ludHMgYXJlIGltcGxpZWQgdG8gYmUgKDAsMCkgYW5kICgxLjAsIDEuMClcblx0XHRAY3ggPSAzLjAgKiBwMXhcblx0XHRAYnggPSAzLjAgKiAocDJ4IC0gcDF4KSAtIEBjeFxuXHRcdEBheCA9IDEuMCAtIEBjeCAtIEBieFxuXHRcdEBjeSA9IDMuMCAqIHAxeVxuXHRcdEBieSA9IDMuMCAqIChwMnkgLSBwMXkpIC0gQGN5XG5cdFx0QGF5ID0gMS4wIC0gQGN5IC0gQGJ5XG5cblx0c2FtcGxlQ3VydmVYOiAodCkgLT5cblx0XHQoKEBheCAqIHQgKyBAYngpICogdCArIEBjeCkgKiB0XG5cblx0c2FtcGxlQ3VydmVZOiAodCkgLT5cblx0XHQoKEBheSAqIHQgKyBAYnkpICogdCArIEBjeSkgKiB0XG5cblx0c2FtcGxlQ3VydmVEZXJpdmF0aXZlWDogKHQpIC0+XG5cdFx0KDMuMCAqIEBheCAqIHQgKyAyLjAgKiBAYngpICogdCArIEBjeFxuXG5cdHNvbHZlQ3VydmVYOiAoeCkgLT5cblxuXHRcdCMgRmlyc3QgdHJ5IGEgZmV3IGl0ZXJhdGlvbnMgb2YgTmV3dG9uJ3MgbWV0aG9kIC0tIG5vcm1hbGx5IHZlcnkgZmFzdC5cblx0XHR0MiA9IHhcblx0XHRpID0gMFxuXG5cdFx0d2hpbGUgaSA8IDhcblx0XHRcdHgyID0gQHNhbXBsZUN1cnZlWCh0MikgLSB4XG5cdFx0XHRyZXR1cm4gdDJcdGlmIE1hdGguYWJzKHgyKSA8IEBlcHNpbG9uXG5cdFx0XHRkMiA9IEBzYW1wbGVDdXJ2ZURlcml2YXRpdmVYKHQyKVxuXHRcdFx0YnJlYWtcdGlmIE1hdGguYWJzKGQyKSA8IEBlcHNpbG9uXG5cdFx0XHR0MiA9IHQyIC0geDIgLyBkMlxuXHRcdFx0aSsrXG5cblx0XHQjIE5vIHNvbHV0aW9uIGZvdW5kIC0gdXNlIGJpLXNlY3Rpb25cblx0XHR0MCA9IDAuMFxuXHRcdHQxID0gMS4wXG5cdFx0dDIgPSB4XG5cdFx0cmV0dXJuIHQwXHRpZiB0MiA8IHQwXG5cdFx0cmV0dXJuIHQxXHRpZiB0MiA+IHQxXG5cdFx0d2hpbGUgdDAgPCB0MVxuXHRcdFx0eDIgPSBAc2FtcGxlQ3VydmVYKHQyKVxuXHRcdFx0cmV0dXJuIHQyXHRpZiBNYXRoLmFicyh4MiAtIHgpIDwgQGVwc2lsb25cblx0XHRcdGlmIHggPiB4MlxuXHRcdFx0XHR0MCA9IHQyXG5cdFx0XHRlbHNlXG5cdFx0XHRcdHQxID0gdDJcblx0XHRcdHQyID0gKHQxIC0gdDApICogLjUgKyB0MFxuXG5cdFx0IyBHaXZlIHVwXG5cdFx0dDJcblxuXHRzb2x2ZTogKHgpIC0+XG5cdFx0QHNhbXBsZUN1cnZlWSBAc29sdmVDdXJ2ZVgoeClcbiIsIlV0aWxzID0gcmVxdWlyZSBcIi4uL1V0aWxzXCJcblxue0FuaW1hdG9yfSA9IHJlcXVpcmUgXCIuLi9BbmltYXRvclwiXG5cbmNsYXNzIGV4cG9ydHMuTGluZWFyQW5pbWF0b3IgZXh0ZW5kcyBBbmltYXRvclxuXHRcblx0c2V0dXA6IChvcHRpb25zKSAtPlxuXG5cdFx0QG9wdGlvbnMgPSBVdGlscy5zZXREZWZhdWx0UHJvcGVydGllcyBvcHRpb25zLFxuXHRcdFx0dGltZTogMVxuXG5cdFx0QF90aW1lID0gMFxuXG5cdG5leHQ6IChkZWx0YSkgLT5cblxuXHRcdGlmIEBmaW5pc2hlZCgpXG5cdFx0XHRyZXR1cm4gMVxuXHRcdFxuXHRcdEBfdGltZSArPSBkZWx0YVxuXHRcdEBfdGltZSAvIEBvcHRpb25zLnRpbWVcblxuXHRmaW5pc2hlZDogLT5cblx0XHRAX3RpbWUgPj0gQG9wdGlvbnMudGltZSIsIlV0aWxzID0gcmVxdWlyZSBcIi4uL1V0aWxzXCJcblxue0FuaW1hdG9yfSA9IHJlcXVpcmUgXCIuLi9BbmltYXRvclwiXG5cbmNsYXNzIGV4cG9ydHMuU3ByaW5nREhPQW5pbWF0b3IgZXh0ZW5kcyBBbmltYXRvclxuXG5cdHNldHVwOiAob3B0aW9ucykgLT5cblxuXHRcdEBvcHRpb25zID0gVXRpbHMuc2V0RGVmYXVsdFByb3BlcnRpZXMgb3B0aW9ucyxcblx0XHRcdHZlbG9jaXR5OiAwXG5cdFx0XHR0b2xlcmFuY2U6IDEvMTAwMDBcblx0XHRcdHN0aWZmbmVzczogNTBcblx0XHRcdGRhbXBpbmc6IDJcblx0XHRcdG1hc3M6IDAuMlxuXHRcdFx0dGltZTogbnVsbCAjIEhhY2tcblxuXHRcdGNvbnNvbGUubG9nIFwiU3ByaW5nREhPQW5pbWF0b3Iub3B0aW9uc1wiLCBAb3B0aW9ucywgb3B0aW9uc1xuXG5cdFx0QF90aW1lID0gMFxuXHRcdEBfdmFsdWUgPSAwXG5cdFx0QF92ZWxvY2l0eSA9IEBvcHRpb25zLnZlbG9jaXR5XG5cblx0bmV4dDogKGRlbHRhKSAtPlxuXG5cdFx0aWYgQGZpbmlzaGVkKClcblx0XHRcdHJldHVybiAxXG5cblx0XHRAX3RpbWUgKz0gZGVsdGFcblxuXHRcdCMgU2VlIHRoZSBub3Qgc2NpZW5jZSBjb21tZW50IGFib3ZlXG5cdFx0ayA9IDAgLSBAb3B0aW9ucy5zdGlmZm5lc3Ncblx0XHRiID0gMCAtIEBvcHRpb25zLmRhbXBpbmdcblxuXHRcdEZfc3ByaW5nID0gayAqICgoQF92YWx1ZSkgLSAxKVxuXHRcdEZfZGFtcGVyID0gYiAqIChAX3ZlbG9jaXR5KVxuXG5cdFx0QF92ZWxvY2l0eSArPSAoKEZfc3ByaW5nICsgRl9kYW1wZXIpIC8gQG9wdGlvbnMubWFzcykgKiBkZWx0YVxuXHRcdEBfdmFsdWUgKz0gQF92ZWxvY2l0eSAqIGRlbHRhXG5cblx0XHRAX3ZhbHVlXG5cblx0ZmluaXNoZWQ6ID0+XG5cdFx0QF90aW1lID4gMCBhbmQgTWF0aC5hYnMoQF92ZWxvY2l0eSkgPCBAb3B0aW9ucy50b2xlcmFuY2UiLCJVdGlscyA9IHJlcXVpcmUgXCIuLi9VdGlsc1wiXG5cbntBbmltYXRvcn0gPSByZXF1aXJlIFwiLi4vQW5pbWF0b3JcIlxuXG5jbGFzcyBleHBvcnRzLlNwcmluZ1JLNEFuaW1hdG9yIGV4dGVuZHMgQW5pbWF0b3JcblxuXHRzZXR1cDogKG9wdGlvbnMpIC0+XG5cblx0XHRAb3B0aW9ucyA9IFV0aWxzLnNldERlZmF1bHRQcm9wZXJ0aWVzIG9wdGlvbnMsXG5cdFx0XHR0ZW5zaW9uOiA1MDBcblx0XHRcdGZyaWN0aW9uOiAxMFxuXHRcdFx0dmVsb2NpdHk6IDBcblx0XHRcdHRvbGVyYW5jZTogMS8xMDAwMFxuXHRcdFx0dGltZTogbnVsbCAjIEhhY2tcblxuXHRcdEBfdGltZSA9IDBcblx0XHRAX3ZhbHVlID0gMFxuXHRcdEBfdmVsb2NpdHkgPSBAb3B0aW9ucy52ZWxvY2l0eVxuXHRcdEBfc3RvcFNwcmluZyA9IGZhbHNlXG5cblx0bmV4dDogKGRlbHRhKSAtPlxuXG5cdFx0aWYgQGZpbmlzaGVkKClcblx0XHRcdHJldHVybiAxXG5cblx0XHRAX3RpbWUgKz0gZGVsdGFcblxuXHRcdHN0YXRlQmVmb3JlID0ge31cblx0XHRzdGF0ZUFmdGVyID0ge31cblx0XHRcblx0XHQjIENhbGN1bGF0ZSBwcmV2aW91cyBzdGF0ZVxuXHRcdHN0YXRlQmVmb3JlLnggPSBAX3ZhbHVlIC0gMVxuXHRcdHN0YXRlQmVmb3JlLnYgPSBAX3ZlbG9jaXR5XG5cdFx0c3RhdGVCZWZvcmUudGVuc2lvbiA9IEBvcHRpb25zLnRlbnNpb25cblx0XHRzdGF0ZUJlZm9yZS5mcmljdGlvbiA9IEBvcHRpb25zLmZyaWN0aW9uXG5cdFx0XG5cdFx0IyBDYWxjdWxhdGUgbmV3IHN0YXRlXG5cdFx0c3RhdGVBZnRlciA9IHNwcmluZ0ludGVncmF0ZVN0YXRlIHN0YXRlQmVmb3JlLCBkZWx0YVxuXHRcdEBfdmFsdWUgPSAxICsgc3RhdGVBZnRlci54XG5cdFx0ZmluYWxWZWxvY2l0eSA9IHN0YXRlQWZ0ZXIudlxuXHRcdG5ldEZsb2F0ID0gc3RhdGVBZnRlci54XG5cdFx0bmV0MURWZWxvY2l0eSA9IHN0YXRlQWZ0ZXIudlxuXG5cdFx0IyBTZWUgaWYgd2UgcmVhY2hlZCB0aGUgZW5kIHN0YXRlXG5cdFx0bmV0VmFsdWVJc0xvdyA9IE1hdGguYWJzKG5ldEZsb2F0KSA8IEBvcHRpb25zLnRvbGVyYW5jZVxuXHRcdG5ldFZlbG9jaXR5SXNMb3cgPSBNYXRoLmFicyhuZXQxRFZlbG9jaXR5KSA8IEBvcHRpb25zLnRvbGVyYW5jZVxuXHRcdFx0XHRcblx0XHRAX3N0b3BTcHJpbmcgPSBuZXRWYWx1ZUlzTG93IGFuZCBuZXRWZWxvY2l0eUlzTG93XG5cdFx0QF92ZWxvY2l0eSA9IGZpbmFsVmVsb2NpdHlcblxuXHRcdEBfdmFsdWVcblxuXHRmaW5pc2hlZDogPT5cblx0XHRAX3N0b3BTcHJpbmdcblxuXG5zcHJpbmdBY2NlbGVyYXRpb25Gb3JTdGF0ZSA9IChzdGF0ZSkgLT5cblx0cmV0dXJuIC0gc3RhdGUudGVuc2lvbiAqIHN0YXRlLnggLSBzdGF0ZS5mcmljdGlvbiAqIHN0YXRlLnZcblxuc3ByaW5nRXZhbHVhdGVTdGF0ZSA9IChpbml0aWFsU3RhdGUpIC0+XG5cblx0b3V0cHV0ID0ge31cblx0b3V0cHV0LmR4ID0gaW5pdGlhbFN0YXRlLnZcblx0b3V0cHV0LmR2ID0gc3ByaW5nQWNjZWxlcmF0aW9uRm9yU3RhdGUgaW5pdGlhbFN0YXRlXG5cblx0cmV0dXJuIG91dHB1dFxuXG5zcHJpbmdFdmFsdWF0ZVN0YXRlV2l0aERlcml2YXRpdmUgPSAoaW5pdGlhbFN0YXRlLCBkdCwgZGVyaXZhdGl2ZSkgLT5cblxuXHRzdGF0ZSA9IHt9XG5cdHN0YXRlLnggPSBpbml0aWFsU3RhdGUueCArIGRlcml2YXRpdmUuZHggKiBkdFxuXHRzdGF0ZS52ID0gaW5pdGlhbFN0YXRlLnYgKyBkZXJpdmF0aXZlLmR2ICogZHRcblx0c3RhdGUudGVuc2lvbiA9IGluaXRpYWxTdGF0ZS50ZW5zaW9uXG5cdHN0YXRlLmZyaWN0aW9uID0gaW5pdGlhbFN0YXRlLmZyaWN0aW9uXG5cblx0b3V0cHV0ID0ge31cblx0b3V0cHV0LmR4ID0gc3RhdGUudlxuXHRvdXRwdXQuZHYgPSBzcHJpbmdBY2NlbGVyYXRpb25Gb3JTdGF0ZSBzdGF0ZVxuXG5cdHJldHVybiBvdXRwdXRcblxuc3ByaW5nSW50ZWdyYXRlU3RhdGUgPSAoc3RhdGUsIHNwZWVkKSAtPlxuXG5cdGEgPSBzcHJpbmdFdmFsdWF0ZVN0YXRlIHN0YXRlXG5cdGIgPSBzcHJpbmdFdmFsdWF0ZVN0YXRlV2l0aERlcml2YXRpdmUgc3RhdGUsIHNwZWVkICogMC41LCBhXG5cdGMgPSBzcHJpbmdFdmFsdWF0ZVN0YXRlV2l0aERlcml2YXRpdmUgc3RhdGUsIHNwZWVkICogMC41LCBiXG5cdGQgPSBzcHJpbmdFdmFsdWF0ZVN0YXRlV2l0aERlcml2YXRpdmUgc3RhdGUsIHNwZWVkLCBjXG5cblx0ZHhkdCA9IDEuMC82LjAgKiAoYS5keCArIDIuMCAqIChiLmR4ICsgYy5keCkgKyBkLmR4KVxuXHRkdmR0ID0gMS4wLzYuMCAqIChhLmR2ICsgMi4wICogKGIuZHYgKyBjLmR2KSArIGQuZHYpXG5cblx0c3RhdGUueCA9IHN0YXRlLnggKyBkeGR0ICogc3BlZWRcblx0c3RhdGUudiA9IHN0YXRlLnYgKyBkdmR0ICogc3BlZWRcblxuXHRyZXR1cm4gc3RhdGVcblxuIiwie0xheWVyfSA9IHJlcXVpcmUgXCIuL0xheWVyXCJcblxuXCJcIlwiXG5Ub2RvOiBtYWtlIGl0IHdvcmsgaW4gYSBwYXJlbnQgbGF5ZXJcblwiXCJcIlxuXG5jbGFzcyBleHBvcnRzLkJhY2tncm91bmRMYXllciBleHRlbmRzIExheWVyXG5cdFxuXHRjb25zdHJ1Y3RvcjogKG9wdGlvbnM9e30pIC0+XG5cdFx0XG5cdFx0b3B0aW9ucy5iYWNrZ3JvdW5kQ29sb3IgPz0gXCIjZmZmXCJcblx0XHRvcHRpb25zLm5hbWUgPSBcIkJhY2tncm91bmRcIlxuXHRcdFxuXHRcdHN1cGVyIG9wdGlvbnNcblx0XHRcblx0XHRAc2VuZFRvQmFjaygpXG5cdFx0QGxheW91dCgpXG5cdFx0XG5cdFx0U2NyZWVuLm9uIFwicmVzaXplXCIsIEBsYXlvdXRcblx0XG5cdGxheW91dDogPT5cblx0XHRAd2lkdGggPSAgU2NyZWVuLndpZHRoXG5cdFx0QGhlaWdodCA9IFNjcmVlbi5oZWlnaHQiLCJ7X30gPSByZXF1aXJlIFwiLi9VbmRlcnNjb3JlXCJcblxuVXRpbHMgPSByZXF1aXJlIFwiLi9VdGlsc1wiXG5cbntFdmVudEVtaXR0ZXJ9ID0gcmVxdWlyZSBcIi4vRXZlbnRFbWl0dGVyXCJcblxuQ291bnRlcktleSA9IFwiX09iamVjdENvdW50ZXJcIlxuRGVmaW5lZFByb3BlcnRpZXNLZXkgPSBcIl9EZWZpbmVkUHJvcGVydGllc0tleVwiXG5EZWZpbmVkUHJvcGVydGllc1ZhbHVlc0tleSA9IFwiX0RlZmluZWRQcm9wZXJ0aWVzVmFsdWVzS2V5XCJcblxuXG5jbGFzcyBleHBvcnRzLkJhc2VDbGFzcyBleHRlbmRzIEV2ZW50RW1pdHRlclxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMgRnJhbWVyIG9iamVjdCBwcm9wZXJ0aWVzXG5cblx0QGRlZmluZSA9IChwcm9wZXJ0eU5hbWUsIGRlc2NyaXB0b3IpIC0+XG5cblx0XHRpZiBAIGlzbnQgQmFzZUNsYXNzIGFuZCBkZXNjcmlwdG9yLmV4cG9ydGFibGUgPT0gdHJ1ZVxuXHRcdFx0IyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSB0cnVlXG5cdFx0XHRkZXNjcmlwdG9yLnByb3BlcnR5TmFtZSA9IHByb3BlcnR5TmFtZVxuXG5cdFx0XHRAW0RlZmluZWRQcm9wZXJ0aWVzS2V5XSA/PSB7fVxuXHRcdFx0QFtEZWZpbmVkUHJvcGVydGllc0tleV1bcHJvcGVydHlOYW1lXSA9IGRlc2NyaXB0b3JcblxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBAcHJvdG90eXBlLCBwcm9wZXJ0eU5hbWUsIGRlc2NyaXB0b3Jcblx0XHRPYmplY3QuX19cblxuXHRAc2ltcGxlUHJvcGVydHkgPSAobmFtZSwgZmFsbGJhY2ssIGV4cG9ydGFibGU9dHJ1ZSkgLT5cblx0XHRleHBvcnRhYmxlOiBleHBvcnRhYmxlXG5cdFx0ZGVmYXVsdDogZmFsbGJhY2tcblx0XHRnZXQ6IC0+ICBAX2dldFByb3BlcnR5VmFsdWUgbmFtZVxuXHRcdHNldDogKHZhbHVlKSAtPiBAX3NldFByb3BlcnR5VmFsdWUgbmFtZSwgdmFsdWVcblxuXHRfc2V0UHJvcGVydHlWYWx1ZTogKGssIHYpID0+XG5cdFx0QFtEZWZpbmVkUHJvcGVydGllc1ZhbHVlc0tleV1ba10gPSB2XG5cblx0X2dldFByb3BlcnR5VmFsdWU6IChrKSA9PlxuXHRcdFV0aWxzLnZhbHVlT3JEZWZhdWx0IEBbRGVmaW5lZFByb3BlcnRpZXNWYWx1ZXNLZXldW2tdLFxuXHRcdFx0QF9nZXRQcm9wZXJ0eURlZmF1bHRWYWx1ZSBrXG5cblx0X2dldFByb3BlcnR5RGVmYXVsdFZhbHVlOiAoaykgLT5cblx0XHRAY29uc3RydWN0b3JbRGVmaW5lZFByb3BlcnRpZXNLZXldW2tdW1wiZGVmYXVsdFwiXVxuXG5cdF9wcm9wZXJ0eUxpc3Q6IC0+XG5cdFx0QGNvbnN0cnVjdG9yW0RlZmluZWRQcm9wZXJ0aWVzS2V5XVxuXG5cdGtleXM6IC0+XG5cdFx0Xy5rZXlzIEBwcm9wZXJ0aWVzXG5cblx0QGRlZmluZSBcInByb3BlcnRpZXNcIixcblx0XHRnZXQ6IC0+XG5cdFx0XHRwcm9wZXJ0aWVzID0ge31cblxuXHRcdFx0Zm9yIGssIHYgb2YgQGNvbnN0cnVjdG9yW0RlZmluZWRQcm9wZXJ0aWVzS2V5XVxuXHRcdFx0XHRpZiB2LmV4cG9ydGFibGUgaXNudCBmYWxzZVxuXHRcdFx0XHRcdHByb3BlcnRpZXNba10gPSBAW2tdXG5cblx0XHRcdHByb3BlcnRpZXNcblxuXHRcdHNldDogKHZhbHVlKSAtPlxuXHRcdFx0Zm9yIGssIHYgb2YgdmFsdWVcblx0XHRcdFx0aWYgQGNvbnN0cnVjdG9yW0RlZmluZWRQcm9wZXJ0aWVzS2V5XS5oYXNPd25Qcm9wZXJ0eSBrXG5cdFx0XHRcdFx0aWYgQGNvbnN0cnVjdG9yW0RlZmluZWRQcm9wZXJ0aWVzS2V5XS5leHBvcnRhYmxlIGlzbnQgZmFsc2Vcblx0XHRcdFx0XHRcdEBba10gPSB2XG5cblx0QGRlZmluZSBcImlkXCIsXG5cdFx0Z2V0OiAtPiBAX2lkXG5cblx0dG9TdHJpbmc6ID0+XG5cdFx0cHJvcGVydGllcyA9IF8ubWFwKEBwcm9wZXJ0aWVzLCAoKHYsIGspIC0+IFwiI3trfToje3Z9XCIpLCA0KVxuXHRcdFwiWyN7QGNvbnN0cnVjdG9yLm5hbWV9IGlkOiN7QGlkfSAje3Byb3BlcnRpZXMuam9pbiBcIiBcIn1dXCJcblxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMgQmFzZSBjb25zdHJ1Y3RvciBtZXRob2RcblxuXHRjb25zdHJ1Y3RvcjogKG9wdGlvbnM9e30pIC0+XG5cblx0XHRzdXBlclxuXG5cdFx0IyBDcmVhdGUgYSBob2xkZXIgZm9yIHRoZSBwcm9wZXJ0eSB2YWx1ZXNcblx0XHRAW0RlZmluZWRQcm9wZXJ0aWVzVmFsdWVzS2V5XSA9IHt9XG5cblx0XHQjIENvdW50IHRoZSBjcmVhdGlvbiBmb3IgdGhlc2Ugb2JqZWN0cyBhbmQgc2V0IHRoZSBpZFxuXHRcdEBjb25zdHJ1Y3RvcltDb3VudGVyS2V5XSA/PSAwXG5cdFx0QGNvbnN0cnVjdG9yW0NvdW50ZXJLZXldICs9IDFcblxuXHRcdEBfaWQgPSBAY29uc3RydWN0b3JbQ291bnRlcktleV1cblxuXHRcdCMgU2V0IHRoZSBkZWZhdWx0IHZhbHVlcyBmb3IgdGhpcyBvYmplY3Rcblx0XHRfLm1hcCBAY29uc3RydWN0b3JbRGVmaW5lZFByb3BlcnRpZXNLZXldLCAoZGVzY3JpcHRvciwgbmFtZSkgPT5cblx0XHRcdEBbbmFtZV0gPSBVdGlscy52YWx1ZU9yRGVmYXVsdCBvcHRpb25zW25hbWVdLCBAX2dldFByb3BlcnR5RGVmYXVsdFZhbHVlIG5hbWVcblxuIiwie0xheWVyfSA9IHJlcXVpcmUgXCIuL0xheWVyXCJcblxuY29tcGF0V2FybmluZyA9IChtc2cpIC0+XG5cdGNvbnNvbGUud2FybiBtc2dcblxuY29tcGF0UHJvcGVydHkgPSAobmFtZSwgb3JpZ2luYWxOYW1lKSAtPlxuXHRleHBvcnRhYmxlOiBmYWxzZVxuXHRnZXQ6IC0+IFxuXHRcdGNvbXBhdFdhcm5pbmcgXCIje29yaWdpbmFsTmFtZX0gaXMgYSBkZXByZWNhdGVkIHByb3BlcnR5XCJcblx0XHRAW25hbWVdXG5cdHNldDogKHZhbHVlKSAtPiBcblx0XHRjb21wYXRXYXJuaW5nIFwiI3tvcmlnaW5hbE5hbWV9IGlzIGEgZGVwcmVjYXRlZCBwcm9wZXJ0eVwiXG5cdFx0QFtuYW1lXSA9IHZhbHVlXG5cbmNsYXNzIENvbXBhdExheWVyIGV4dGVuZHMgTGF5ZXJcblxuXHRjb25zdHJ1Y3RvcjogKG9wdGlvbnM9e30pIC0+XG5cblx0XHRpZiBvcHRpb25zLmhhc093blByb3BlcnR5IFwic3VwZXJWaWV3XCJcblx0XHRcdG9wdGlvbnMuc3VwZXJMYXllciA9IG9wdGlvbnMuc3VwZXJWaWV3XG5cblx0XHRzdXBlciBvcHRpb25zXG5cblx0QGRlZmluZSBcInN1cGVyVmlld1wiLCBjb21wYXRQcm9wZXJ0eSBcInN1cGVyTGF5ZXJcIiwgXCJzdXBlclZpZXdcIlxuXHRAZGVmaW5lIFwic3ViVmlld3NcIiwgY29tcGF0UHJvcGVydHkgXCJzdWJMYXllcnNcIiwgXCJzdWJWaWV3c1wiXG5cdEBkZWZpbmUgXCJzaWJsaW5nVmlld3NcIiwgY29tcGF0UHJvcGVydHkgXCJzaWJsaW5nTGF5ZXJzXCIsIFwic2libGluZ1ZpZXdzXCJcblxuXHRhZGRTdWJWaWV3ID0gKGxheWVyKSAtPiBAYWRkU3ViTGF5ZXIgbGF5ZXJcblx0cmVtb3ZlU3ViVmlldyA9IChsYXllcikgLT4gQHJlbW92ZVN1YkxheWVyIGxheWVyXG5cbmNsYXNzIENvbXBhdFZpZXcgZXh0ZW5kcyBDb21wYXRMYXllclxuXG5cdGNvbnN0cnVjdG9yOiAob3B0aW9ucz17fSkgLT5cblx0XHRjb21wYXRXYXJuaW5nIFwiVmlld3MgYXJlIG5vdyBjYWxsZWQgTGF5ZXJzXCJcblx0XHRzdXBlciBvcHRpb25zXG5cbmNsYXNzIENvbXBhdEltYWdlVmlldyBleHRlbmRzIENvbXBhdFZpZXdcblxuY2xhc3MgQ29tcGF0U2Nyb2xsVmlldyBleHRlbmRzIENvbXBhdFZpZXdcblx0Y29uc3RydWN0b3I6IC0+XG5cdFx0c3VwZXJcblx0XHRAc2Nyb2xsID0gdHJ1ZVxuXG53aW5kb3cuTGF5ZXIgPSBDb21wYXRMYXllclxud2luZG93LkZyYW1lci5MYXllciA9IENvbXBhdExheWVyXG5cbndpbmRvdy5WaWV3ID0gQ29tcGF0Vmlld1xud2luZG93LkltYWdlVmlldyA9IENvbXBhdEltYWdlVmlld1xud2luZG93LlNjcm9sbFZpZXcgPSBDb21wYXRTY3JvbGxWaWV3XG5cbiMgVXRpbHMgd2VyZSB1dGlscyBpbiBGcmFtZXIgMlxud2luZG93LnV0aWxzID0gd2luZG93LlV0aWxzXG5cblx0XG5cbiIsIlV0aWxzID0gcmVxdWlyZSBcIi4vVXRpbHNcIlxuXG5leHBvcnRzLkNvbmZpZyA9XG5cdFxuXHQjIEFuaW1hdGlvblxuXHR0YXJnZXRGUFM6IDYwXG5cblx0cm9vdEJhc2VDU1M6XG5cdFx0XCItd2Via2l0LXBlcnNwZWN0aXZlXCI6IDEwMDBcblx0XHRcInBvc2l0aW9uXCI6IFwiYWJzb2x1dGVcIlxuXHRcdFwibGVmdFwiOiAwXG5cdFx0XCJ0b3BcIjogMFxuXHRcdFwicmlnaHRcIjogMFxuXHRcdFwiYm90dG9tXCI6IDBcblx0XHRcblx0bGF5ZXJCYXNlQ1NTOlxuXHRcdFwiZGlzcGxheVwiOiBcImJsb2NrXCJcblx0XHQjXCJ2aXNpYmlsaXR5XCI6IFwidmlzaWJsZVwiXG5cdFx0XCJwb3NpdGlvblwiOiBcImFic29sdXRlXCJcblx0XHQjIFwidG9wXCI6IFwiYXV0b1wiXG5cdFx0IyBcInJpZ2h0XCI6IFwiYXV0b1wiXG5cdFx0IyBcImJvdHRvbVwiOiBcImF1dG9cIlxuXHRcdCMgXCJsZWZ0XCI6IFwiYXV0b1wiXG5cdFx0IyBcIndpZHRoXCI6IFwiYXV0b1wiXG5cdFx0IyBcImhlaWdodFwiOiBcImF1dG9cIlxuXHRcdCNcIm92ZXJmbG93XCI6IFwidmlzaWJsZVwiXG5cdFx0I1wiei1pbmRleFwiOiAwXG5cdFx0XCItd2Via2l0LWJveC1zaXppbmdcIjogXCJib3JkZXItYm94XCJcblx0XHRcIi13ZWJraXQtdXNlci1zZWxlY3RcIjogXCJub25lXCJcblx0XHQjIFwiY3Vyc29yXCI6IFwiZGVmYXVsdFwiXG5cdFx0IyBcIi13ZWJraXQtdHJhbnNmb3JtLXN0eWxlXCI6IFwicHJlc2VydmUtM2RcIlxuXHRcdCMgXCItd2Via2l0LWJhY2tmYWNlLXZpc2liaWxpdHlcIjogXCJ2aXNpYmxlXCJcblx0XHQjXCItd2Via2l0LWJhY2tmYWNlLXZpc2liaWxpdHlcIjogXCJcIlxuXHRcdCNcIi13ZWJraXQtcGVyc3BlY3RpdmVcIjogNTAwXG5cdFx0IyBcInBvaW50ZXItZXZlbnRzXCI6IFwibm9uZVwiXG5cdFx0XCJiYWNrZ3JvdW5kLXJlcGVhdFwiOiBcIm5vLXJlcGVhdFwiXG5cdFx0XCJiYWNrZ3JvdW5kLXNpemVcIjogXCJjb3ZlclwiXG5cdFx0XCItd2Via2l0LW92ZXJmbG93LXNjcm9sbGluZ1wiOiBcInRvdWNoXCIiLCJVdGlscyA9IHJlcXVpcmUgXCIuL1V0aWxzXCJcblxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIERlYnVnIG92ZXJ2aWV3XG5cbl9kZWJ1Z0xheWVycyA9IG51bGxcblxuY3JlYXRlRGVidWdMYXllciA9IChsYXllcikgLT5cblxuXHRvdmVyTGF5ZXIgPSBuZXcgTGF5ZXJcblx0XHRmcmFtZTogbGF5ZXIuc2NyZWVuRnJhbWVcblx0XHRiYWNrZ3JvdW5kQ29sb3I6IFwicmdiYSg1MCwxNTAsMjAwLC4zNSlcIlxuXG5cdG92ZXJMYXllci5zdHlsZSA9XG5cdFx0dGV4dEFsaWduOiBcImNlbnRlclwiXG5cdFx0Y29sb3I6IFwid2hpdGVcIlxuXHRcdGZvbnQ6IFwiMTBweC8xZW0gTW9uYWNvXCJcblx0XHRsaW5lSGVpZ2h0OiBcIiN7b3ZlckxheWVyLmhlaWdodCArIDF9cHhcIlxuXHRcdGJveFNoYWRvdzogXCJpbnNldCAwIDAgMCAxcHggcmdiYSgyNTUsMjU1LDI1NSwuNSlcIlxuXG5cdG92ZXJMYXllci5odG1sID0gbGF5ZXIubmFtZSBvciBsYXllci5pZFxuXG5cdG92ZXJMYXllci5vbiBFdmVudHMuQ2xpY2ssIChldmVudCwgbGF5ZXIpIC0+XG5cdFx0bGF5ZXIuc2NhbGUgPSAwLjhcblx0XHRsYXllci5hbmltYXRlIFxuXHRcdFx0cHJvcGVydGllczoge3NjYWxlOjF9XG5cdFx0XHRjdXJ2ZTogXCJzcHJpbmcoMTAwMCwxMCwwKVwiXG5cblx0b3ZlckxheWVyXG5cbnNob3dEZWJ1ZyA9IC0+IF9kZWJ1Z0xheWVycyA9IExheWVyLkxheWVycygpLm1hcCBjcmVhdGVEZWJ1Z0xheWVyXG5oaWRlRGVidWcgPSAtPiBfZGVidWdMYXllcnMubWFwIChsYXllcikgLT4gbGF5ZXIuZGVzdHJveSgpXG5cbnRvZ2dsZURlYnVnID0gVXRpbHMudG9nZ2xlIHNob3dEZWJ1ZywgaGlkZURlYnVnXG5cbkV2ZW50S2V5cyA9XG5cdFNoaWZ0OiAxNlxuXHRFc2NhcGU6IDI3XG5cbndpbmRvdy5kb2N1bWVudC5vbmtleXVwID0gKGV2ZW50KSAtPlxuXHRpZiBldmVudC5rZXlDb2RlID09IEV2ZW50S2V5cy5Fc2NhcGVcblx0XHR0b2dnbGVEZWJ1ZygpKClcblxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIEVycm9yIHdhcm5pbmdcblxuX2Vycm9yV2FybmluZ0xheWVyID0gbnVsbFxuXG5lcnJvcldhcm5pbmcgPSAtPlxuXG5cdHJldHVybiBpZiBfZXJyb3JXYXJuaW5nTGF5ZXJcblxuXHRsYXllciA9IG5ldyBMYXllciB7eDoyMCwgeTotNTAsIHdpZHRoOjMwMCwgaGVpZ2h0OjQwfVxuXG5cdGxheWVyLnN0YXRlcy5hZGRcblx0XHR2aXNpYmxlOiB7eDoyMCwgeToyMCwgd2lkdGg6MzAwLCBoZWlnaHQ6NDB9XG5cblx0bGF5ZXIuaHRtbCA9IFwiSmF2YXNjcmlwdCBFcnJvciwgc2VlIHRoZSBjb25zb2xlXCJcblx0bGF5ZXIuc3R5bGUgPVxuXHRcdGZvbnQ6IFwiMTJweC8xLjM1ZW0gTWVubG9cIlxuXHRcdGNvbG9yOiBcIndoaXRlXCJcblx0XHR0ZXh0QWxpZ246IFwiY2VudGVyXCJcblx0XHRsaW5lSGVpZ2h0OiBcIiN7bGF5ZXIuaGVpZ2h0fXB4XCJcblx0XHRib3JkZXJSYWRpdXM6IFwiNXB4XCJcblx0XHRiYWNrZ3JvdW5kQ29sb3I6IFwicmdiYSgyNTUsMCwwLC44KVwiXG5cblx0bGF5ZXIuc3RhdGVzLmFuaW1hdGlvbk9wdGlvbnMgPVxuXHRcdGN1cnZlOiBcInNwcmluZ1wiXG5cdFx0Y3VydmVPcHRpb25zOlxuXHRcdFx0dGVuc2lvbjogMTAwMFxuXHRcdFx0ZnJpY3Rpb246IDMwXG5cblx0bGF5ZXIuc3RhdGVzLnN3aXRjaCBcInZpc2libGVcIlxuXG5cdGxheWVyLm9uIEV2ZW50cy5DbGljaywgLT5cblx0XHRAc3RhdGVzLnN3aXRjaCBcImRlZmF1bHRcIlxuXG5cdF9lcnJvcldhcm5pbmdMYXllciA9IGxheWVyXG5cbndpbmRvdy5vbmVycm9yID0gZXJyb3JXYXJuaW5nXG4iLCJ7X30gPSByZXF1aXJlIFwiLi9VbmRlcnNjb3JlXCJcblxuVXRpbHMgPSByZXF1aXJlIFwiLi9VdGlsc1wiXG5cbk9yaWdpbmFscyA9IFxuXHRMYXllcjpcblx0XHRiYWNrZ3JvdW5kQ29sb3I6IFwicmdiYSgwLDEyNCwyNTUsLjUpXCJcblx0XHR3aWR0aDogMTAwXG5cdFx0aGVpZ2h0OiAxMDBcblx0QW5pbWF0aW9uOlxuXHRcdGN1cnZlOiBcImxpbmVhclwiXG5cdFx0dGltZTogMVxuXG5leHBvcnRzLkRlZmF1bHRzID1cblxuXHRnZXREZWZhdWx0czogKGNsYXNzTmFtZSwgb3B0aW9ucykgLT5cblxuXHRcdCMgQWx3YXlzIHN0YXJ0IHdpdGggdGhlIG9yaWdpbmFsc1xuXHRcdGRlZmF1bHRzID0gXy5jbG9uZSBPcmlnaW5hbHNbY2xhc3NOYW1lXVxuXG5cdFx0IyBDb3B5IG92ZXIgdGhlIHVzZXIgZGVmaW5lZCBvcHRpb25zXG5cdFx0Zm9yIGssIHYgb2YgRnJhbWVyLkRlZmF1bHRzW2NsYXNzTmFtZV1cblx0XHRcdGRlZmF1bHRzW2tdID0gaWYgXy5pc0Z1bmN0aW9uKHYpIHRoZW4gdigpIGVsc2UgdlxuXG5cdFx0IyBUaGVuIGNvcHkgb3ZlciB0aGUgZGVmYXVsdCBrZXlzIHRvIHRoZSBvcHRpb25zXG5cdFx0Zm9yIGssIHYgb2YgZGVmYXVsdHNcblx0XHRcdGlmIG5vdCBvcHRpb25zLmhhc093blByb3BlcnR5IGtcblx0XHRcdFx0b3B0aW9uc1trXSA9IHZcblxuXHRcdCMgSW5jbHVkZSBhIHNlY3JldCBwcm9wZXJ0eSB3aXRoIHRoZSBkZWZhdWx0IGtleXNcblx0XHQjIG9wdGlvbnMuX2RlZmF1bHRWYWx1ZXMgPSBkZWZhdWx0c1xuXHRcdFxuXHRcdG9wdGlvbnNcblxuXHRyZXNldDogLT5cblx0XHR3aW5kb3cuRnJhbWVyLkRlZmF1bHRzID0gXy5jbG9uZSBPcmlnaW5hbHMiLCJ7X30gPSByZXF1aXJlIFwiLi9VbmRlcnNjb3JlXCJcblxuRXZlbnRFbWl0dGVyRXZlbnRzS2V5ID0gXCJfZXZlbnRzXCJcblxuY2xhc3MgZXhwb3J0cy5FdmVudEVtaXR0ZXJcblx0XG5cdGNvbnN0cnVjdG9yOiAtPlxuXHRcdEBbRXZlbnRFbWl0dGVyRXZlbnRzS2V5XSA9IHt9XG5cblx0X2V2ZW50Q2hlY2s6IChldmVudCwgbWV0aG9kKSAtPlxuXHRcdGlmIG5vdCBldmVudFxuXHRcdFx0Y29uc29sZS53YXJuIFwiI3tAY29uc3RydWN0b3IubmFtZX0uI3ttZXRob2R9IG1pc3NpbmcgZXZlbnQgKGxpa2UgJ2NsaWNrJylcIlxuXG5cdGVtaXQ6IChldmVudCwgYXJncy4uLikgLT5cblx0XHRcblx0XHQjIFdlIHNraXAgaXQgaGVyZSBiZWNhdXNlIHdlIG5lZWQgYWxsIHRoZSBwZXJmIHdlIGNhbiBnZXRcblx0XHQjIEBfZXZlbnRDaGVjayBldmVudCwgXCJlbWl0XCJcblxuXHRcdGlmIG5vdCBAW0V2ZW50RW1pdHRlckV2ZW50c0tleV0/W2V2ZW50XVxuXHRcdFx0cmV0dXJuXG5cdFx0XG5cdFx0Zm9yIGxpc3RlbmVyIGluIEBbRXZlbnRFbWl0dGVyRXZlbnRzS2V5XVtldmVudF1cblx0XHRcdGxpc3RlbmVyIGFyZ3MuLi5cblx0XHRcblx0XHRyZXR1cm5cblxuXHRhZGRMaXN0ZW5lcjogKGV2ZW50LCBsaXN0ZW5lcikgLT5cblx0XHRcblx0XHRAX2V2ZW50Q2hlY2sgZXZlbnQsIFwiYWRkTGlzdGVuZXJcIlxuXHRcdFxuXHRcdEBbRXZlbnRFbWl0dGVyRXZlbnRzS2V5XSA/PSB7fVxuXHRcdEBbRXZlbnRFbWl0dGVyRXZlbnRzS2V5XVtldmVudF0gPz0gW11cblx0XHRAW0V2ZW50RW1pdHRlckV2ZW50c0tleV1bZXZlbnRdLnB1c2ggbGlzdGVuZXJcblxuXHRyZW1vdmVMaXN0ZW5lcjogKGV2ZW50LCBsaXN0ZW5lcikgLT5cblx0XHRcblx0XHRAX2V2ZW50Q2hlY2sgZXZlbnQsIFwicmVtb3ZlTGlzdGVuZXJcIlxuXHRcdFxuXHRcdHJldHVybiB1bmxlc3MgQFtFdmVudEVtaXR0ZXJFdmVudHNLZXldXG5cdFx0cmV0dXJuIHVubGVzcyBAW0V2ZW50RW1pdHRlckV2ZW50c0tleV1bZXZlbnRdXG5cdFx0XG5cdFx0QFtFdmVudEVtaXR0ZXJFdmVudHNLZXldW2V2ZW50XSA9IF8ud2l0aG91dCBAW0V2ZW50RW1pdHRlckV2ZW50c0tleV1bZXZlbnRdLCBsaXN0ZW5lclxuXG5cdFx0cmV0dXJuXG5cblx0b25jZTogKGV2ZW50LCBsaXN0ZW5lcikgLT5cblxuXHRcdGZuID0gPT5cblx0XHRcdEByZW1vdmVMaXN0ZW5lciBldmVudCwgZm5cblx0XHRcdGxpc3RlbmVyIGFyZ3VtZW50cy4uLlxuXG5cdFx0QG9uIGV2ZW50LCBmblxuXG5cdHJlbW92ZUFsbExpc3RlbmVyczogKGV2ZW50KSAtPlxuXHRcdFxuXHRcdHJldHVybiB1bmxlc3MgQFtFdmVudEVtaXR0ZXJFdmVudHNLZXldXG5cdFx0cmV0dXJuIHVubGVzcyBAW0V2ZW50RW1pdHRlckV2ZW50c0tleV1bZXZlbnRdXG5cdFx0XG5cdFx0Zm9yIGxpc3RlbmVyIGluIEBbRXZlbnRFbWl0dGVyRXZlbnRzS2V5XVtldmVudF1cblx0XHRcdEByZW1vdmVMaXN0ZW5lciBldmVudCwgbGlzdGVuZXJcblxuXHRcdHJldHVyblxuXHRcblx0b246IEA6OmFkZExpc3RlbmVyXG5cdG9mZjogQDo6cmVtb3ZlTGlzdGVuZXIiLCJ7X30gPSByZXF1aXJlIFwiLi9VbmRlcnNjb3JlXCJcblxuVXRpbHMgPSByZXF1aXJlIFwiLi9VdGlsc1wiXG5cbkV2ZW50cyA9IHt9XG5cbmlmIFV0aWxzLmlzVG91Y2goKVxuXHRFdmVudHMuVG91Y2hTdGFydCA9IFwidG91Y2hzdGFydFwiXG5cdEV2ZW50cy5Ub3VjaEVuZCA9IFwidG91Y2hlbmRcIlxuXHRFdmVudHMuVG91Y2hNb3ZlID0gXCJ0b3VjaG1vdmVcIlxuZWxzZVxuXHRFdmVudHMuVG91Y2hTdGFydCA9IFwibW91c2Vkb3duXCJcblx0RXZlbnRzLlRvdWNoRW5kID0gXCJtb3VzZXVwXCJcblx0RXZlbnRzLlRvdWNoTW92ZSA9IFwibW91c2Vtb3ZlXCJcblxuRXZlbnRzLkNsaWNrID0gRXZlbnRzLlRvdWNoRW5kXG5cbiMgU3RhbmRhcmQgZG9tIGV2ZW50c1xuRXZlbnRzLk1vdXNlT3ZlciA9IFwibW91c2VvdmVyXCJcbkV2ZW50cy5Nb3VzZU91dCA9IFwibW91c2VvdXRcIlxuXG4jIEFuaW1hdGlvbiBldmVudHNcbkV2ZW50cy5BbmltYXRpb25TdGFydCA9IFwic3RhcnRcIlxuRXZlbnRzLkFuaW1hdGlvblN0b3AgPSBcInN0b3BcIlxuRXZlbnRzLkFuaW1hdGlvbkVuZCA9IFwiZW5kXCJcblxuIyBTY3JvbGwgZXZlbnRzXG5FdmVudHMuU2Nyb2xsID0gXCJzY3JvbGxcIlxuXG4jIEV4dHJhY3QgdG91Y2ggZXZlbnRzIGZvciBhbnkgZXZlbnRcbkV2ZW50cy50b3VjaEV2ZW50ID0gKGV2ZW50KSAtPlxuXHR0b3VjaEV2ZW50ID0gZXZlbnQudG91Y2hlcz9bMF1cblx0dG91Y2hFdmVudCA/PSBldmVudC5jaGFuZ2VkVG91Y2hlcz9bMF1cblx0dG91Y2hFdmVudCA/PSBldmVudFxuXHR0b3VjaEV2ZW50XG5cdFxuZXhwb3J0cy5FdmVudHMgPSBFdmVudHMiLCIjIGV4cG9ydHMuSGludHMgPSByZXF1aXJlIFwiLi9IaW50c1wiXG5leHBvcnRzLk1vYmlsZVNjcm9sbEZpeCA9IHJlcXVpcmUgXCIuL01vYmlsZVNjcm9sbEZpeFwiXG5leHBvcnRzLk9taXROZXcgPSByZXF1aXJlIFwiLi9PbWl0TmV3XCIiLCJVdGlscyA9IHJlcXVpcmUgXCIuLi9VdGlsc1wiXG5cbmV4cG9ydHMuZW5hYmxlID0gLT5cblxuXHRoYW5kbGVTY3JvbGxpbmdMYXllclRvdWNoTW92ZSA9IChldmVudCkgLT5cblx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKVxuXG5cdGhhbmRsZVNjcm9sbGluZ0xheWVyVG91Y2hTdGFydCA9IChldmVudCkgLT5cblx0XHRcblx0XHRlbGVtZW50ID0gQF9lbGVtZW50XG5cdFx0XG5cdFx0c3RhcnRUb3BTY3JvbGwgPSBlbGVtZW50LnNjcm9sbFRvcFxuXG5cdFx0aWYgc3RhcnRUb3BTY3JvbGwgPD0gMFxuXHRcdFx0ZWxlbWVudC5zY3JvbGxUb3AgPSAxXG5cdFx0XG5cdFx0aWYgc3RhcnRUb3BTY3JvbGwgKyBlbGVtZW50Lm9mZnNldEhlaWdodCA+PSBlbGVtZW50LnNjcm9sbEhlaWdodFxuXHRcdFx0ZWxlbWVudC5zY3JvbGxUb3AgPSBlbGVtZW50LnNjcm9sbEhlaWdodCAtIGVsZW1lbnQub2Zmc2V0SGVpZ2h0IC0gMVxuXG5cblx0Y2xhc3MgTW9iaWxlU2Nyb2xsRml4TGF5ZXIgZXh0ZW5kcyBGcmFtZXIuTGF5ZXJcblxuXHRcdGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cblx0XHRcdHN1cGVyIG9wdGlvbnNcblxuXHRcdFx0QG9uIFwiY2hhbmdlOnNjcm9sbFZlcnRpY2FsXCIsIEBfdXBkYXRlU2Nyb2xsTGlzdGVuZXJzXG5cdFx0XHRAX3VwZGF0ZVNjcm9sbExpc3RlbmVycygpXG5cblx0XHRfdXBkYXRlU2Nyb2xsTGlzdGVuZXJzOiA9PlxuXHRcdFx0aWYgQHNjcm9sbFZlcnRpY2FsIGlzIHRydWVcblx0XHRcdFx0QG9uIFwidG91Y2htb3ZlXCIsIGhhbmRsZVNjcm9sbGluZ0xheWVyVG91Y2hNb3ZlXG5cdFx0XHRcdEBvbiBcInRvdWNoc3RhcnRcIiwgaGFuZGxlU2Nyb2xsaW5nTGF5ZXJUb3VjaFN0YXJ0XG5cdFx0XHRlbHNlXG5cdFx0XHRcdEBvZmYgXCJ0b3VjaG1vdmVcIiwgaGFuZGxlU2Nyb2xsaW5nTGF5ZXJUb3VjaE1vdmVcblx0XHRcdFx0QG9mZiBcInRvdWNoc3RhcnRcIiwgaGFuZGxlU2Nyb2xsaW5nTGF5ZXJUb3VjaFN0YXJ0XG5cblx0XHRfX2NyZWF0ZVJvb3RFbGVtZW50OiA9PlxuXHRcdFx0XG5cdFx0XHRyb290RWxlbWVudCA9IHN1cGVyXG5cblx0XHRcdHJvb3RFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIgXCJ0b3VjaG1vdmVcIiwgKGV2ZW50KSAtPlxuXHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpXG5cblx0XHRcdHJldHVybiByb290RWxlbWVudFxuXG5cdCMgT3ZlcnJpZGUgdGhlIHN0YW5kYXJkIHdpbmRvdyBMYXllciB3aXRoIHRoaXMgcGF0Y2hlZCBvbmVcblx0d2luZG93LkxheWVyID0gd2luZG93LkZyYW1lci5MYXllciA9IE1vYmlsZVNjcm9sbEZpeExheWVyXG4iLCJleHBvcnRzLmVuYWJsZSA9IChtb2R1bGU9d2luZG93KSAtPlxuXG5cdENsYXNzV3JhcHBlciA9IChLbGFzcykgLT4gKGFyZ3MuLi4pIC0+XG5cdFx0QHByb3RvdHlwZSA9IG5ldyBLbGFzcyhhcmdzLi4uKVxuXG5cdG1vZHVsZS5GcmFtZSA9IENsYXNzV3JhcHBlcihGcmFtZXIuRnJhbWUpXG5cdG1vZHVsZS5MYXllciA9IENsYXNzV3JhcHBlcihGcmFtZXIuTGF5ZXIpXG5cdG1vZHVsZS5CYWNrZ3JvdW5kTGF5ZXIgPSBDbGFzc1dyYXBwZXIoRnJhbWVyLkJhY2tncm91bmRMYXllcilcblx0bW9kdWxlLlZpZGVvTGF5ZXIgPSBDbGFzc1dyYXBwZXIoRnJhbWVyLlZpZGVvTGF5ZXIpXG5cdG1vZHVsZS5BbmltYXRpb24gPSBDbGFzc1dyYXBwZXIoRnJhbWVyLkFuaW1hdGlvbikiLCJ7QmFzZUNsYXNzfSA9IHJlcXVpcmUgXCIuL0Jhc2VDbGFzc1wiXG5cbmNsYXNzIGV4cG9ydHMuRnJhbWUgZXh0ZW5kcyBCYXNlQ2xhc3NcblxuXHRAZGVmaW5lIFwieFwiLCBAc2ltcGxlUHJvcGVydHkgXCJ4XCIsIDBcblx0QGRlZmluZSBcInlcIiwgQHNpbXBsZVByb3BlcnR5IFwieVwiLCAwXG5cdEBkZWZpbmUgXCJ3aWR0aFwiLCBAc2ltcGxlUHJvcGVydHkgXCJ3aWR0aFwiLCAwXG5cdEBkZWZpbmUgXCJoZWlnaHRcIiwgQHNpbXBsZVByb3BlcnR5IFwiaGVpZ2h0XCIsIDBcblxuXHRAZGVmaW5lIFwibWluWFwiLCBAc2ltcGxlUHJvcGVydHkgXCJ4XCIsIDAsIGZhbHNlXG5cdEBkZWZpbmUgXCJtaW5ZXCIsIEBzaW1wbGVQcm9wZXJ0eSBcInlcIiwgMCwgZmFsc2VcblxuXHRjb25zdHJ1Y3RvcjogKG9wdGlvbnM9e30pIC0+XG5cblx0XHRzdXBlciBvcHRpb25zXG5cblx0XHRmb3IgayBpbiBbXCJtaW5YXCIsIFwibWlkWFwiLCBcIm1heFhcIiwgXCJtaW5ZXCIsIFwibWlkWVwiLCBcIm1heFlcIl1cblx0XHRcdGlmIG9wdGlvbnMuaGFzT3duUHJvcGVydHkga1xuXHRcdFx0XHRAW2tdID0gb3B0aW9uc1trXVxuXG5cdEBkZWZpbmUgXCJtaWRYXCIsXG5cdFx0Z2V0OiAtPiBVdGlscy5mcmFtZUdldE1pZFggQFxuXHRcdHNldDogKHZhbHVlKSAtPiBVdGlscy5mcmFtZVNldE1pZFggQCwgdmFsdWVcblxuXHRAZGVmaW5lIFwibWF4WFwiLFxuXHRcdGdldDogLT4gVXRpbHMuZnJhbWVHZXRNYXhYIEBcblx0XHRzZXQ6ICh2YWx1ZSkgLT4gVXRpbHMuZnJhbWVTZXRNYXhYIEAsIHZhbHVlXG5cblx0QGRlZmluZSBcIm1pZFlcIixcblx0XHRnZXQ6IC0+IFV0aWxzLmZyYW1lR2V0TWlkWSBAXG5cdFx0c2V0OiAodmFsdWUpIC0+IFV0aWxzLmZyYW1lU2V0TWlkWSBALCB2YWx1ZVxuXG5cdEBkZWZpbmUgXCJtYXhZXCIsXG5cdFx0Z2V0OiAtPiBVdGlscy5mcmFtZUdldE1heFkgQFxuXHRcdHNldDogKHZhbHVlKSAtPiBVdGlscy5mcmFtZVNldE1heFkgQCwgdmFsdWUiLCJ7X30gPSByZXF1aXJlIFwiLi9VbmRlcnNjb3JlXCJcblxuRnJhbWVyID0ge31cblxuIyBSb290IGxldmVsIG1vZHVsZXNcbkZyYW1lci5fID0gX1xuRnJhbWVyLlV0aWxzID0gKHJlcXVpcmUgXCIuL1V0aWxzXCIpXG5GcmFtZXIuRnJhbWUgPSAocmVxdWlyZSBcIi4vRnJhbWVcIikuRnJhbWVcbkZyYW1lci5MYXllciA9IChyZXF1aXJlIFwiLi9MYXllclwiKS5MYXllclxuRnJhbWVyLkJhY2tncm91bmRMYXllciA9IChyZXF1aXJlIFwiLi9CYWNrZ3JvdW5kTGF5ZXJcIikuQmFja2dyb3VuZExheWVyXG5GcmFtZXIuVmlkZW9MYXllciA9IChyZXF1aXJlIFwiLi9WaWRlb0xheWVyXCIpLlZpZGVvTGF5ZXJcbkZyYW1lci5FdmVudHMgPSAocmVxdWlyZSBcIi4vRXZlbnRzXCIpLkV2ZW50c1xuRnJhbWVyLkFuaW1hdGlvbiA9IChyZXF1aXJlIFwiLi9BbmltYXRpb25cIikuQW5pbWF0aW9uXG5GcmFtZXIuU2NyZWVuID0gKHJlcXVpcmUgXCIuL1NjcmVlblwiKS5TY3JlZW5cbkZyYW1lci5wcmludCA9IChyZXF1aXJlIFwiLi9QcmludFwiKS5wcmludFxuXG5fLmV4dGVuZCB3aW5kb3csIEZyYW1lciBpZiB3aW5kb3dcblxuIyBGcmFtZXIgbGV2ZWwgbW9kdWxlc1xuRnJhbWVyLkNvbmZpZyA9IChyZXF1aXJlIFwiLi9Db25maWdcIikuQ29uZmlnXG5GcmFtZXIuRXZlbnRFbWl0dGVyID0gKHJlcXVpcmUgXCIuL0V2ZW50RW1pdHRlclwiKS5FdmVudEVtaXR0ZXJcbkZyYW1lci5CYXNlQ2xhc3MgPSAocmVxdWlyZSBcIi4vQmFzZUNsYXNzXCIpLkJhc2VDbGFzc1xuRnJhbWVyLkxheWVyU3R5bGUgPSAocmVxdWlyZSBcIi4vTGF5ZXJTdHlsZVwiKS5MYXllclN0eWxlXG5GcmFtZXIuQW5pbWF0aW9uTG9vcCA9IChyZXF1aXJlIFwiLi9BbmltYXRpb25Mb29wXCIpLkFuaW1hdGlvbkxvb3BcbkZyYW1lci5MaW5lYXJBbmltYXRvciA9IChyZXF1aXJlIFwiLi9BbmltYXRvcnMvTGluZWFyQW5pbWF0b3JcIikuTGluZWFyQW5pbWF0b3JcbkZyYW1lci5CZXppZXJDdXJ2ZUFuaW1hdG9yID0gKHJlcXVpcmUgXCIuL0FuaW1hdG9ycy9CZXppZXJDdXJ2ZUFuaW1hdG9yXCIpLkJlemllckN1cnZlQW5pbWF0b3JcbkZyYW1lci5TcHJpbmdESE9BbmltYXRvciA9IChyZXF1aXJlIFwiLi9BbmltYXRvcnMvU3ByaW5nREhPQW5pbWF0b3JcIikuU3ByaW5nREhPQW5pbWF0b3JcbkZyYW1lci5TcHJpbmdSSzRBbmltYXRvciA9IChyZXF1aXJlIFwiLi9BbmltYXRvcnMvU3ByaW5nUks0QW5pbWF0b3JcIikuU3ByaW5nUks0QW5pbWF0b3JcbkZyYW1lci5JbXBvcnRlciA9IChyZXF1aXJlIFwiLi9JbXBvcnRlclwiKS5JbXBvcnRlclxuRnJhbWVyLkRlYnVnID0gKHJlcXVpcmUgXCIuL0RlYnVnXCIpLkRlYnVnXG5GcmFtZXIuU2Vzc2lvbiA9IChyZXF1aXJlIFwiLi9TZXNzaW9uXCIpLlNlc3Npb25cbkZyYW1lci5FeHRyYXMgPSByZXF1aXJlIFwiLi9FeHRyYXMvRXh0cmFzXCJcblxud2luZG93LkZyYW1lciA9IEZyYW1lciBpZiB3aW5kb3dcblxuIyBDb21wYXRpYmlsaXR5IGZvciBGcmFtZXIgMlxucmVxdWlyZSBcIi4vQ29tcGF0XCJcblxuIyBGaXggZm9yIG1vYmlsZSBzY3JvbGxpbmdcbkZyYW1lci5FeHRyYXMuTW9iaWxlU2Nyb2xsRml4LmVuYWJsZSgpIGlmIFV0aWxzLmlzTW9iaWxlKClcblxuIyBTZXQgdGhlIGRlZmF1bHRzXG5EZWZhdWx0cyA9IChyZXF1aXJlIFwiLi9EZWZhdWx0c1wiKS5EZWZhdWx0c1xuRnJhbWVyLnJlc2V0RGVmYXVsdHMgPSBEZWZhdWx0cy5yZXNldFxuRnJhbWVyLnJlc2V0RGVmYXVsdHMoKSIsIntffSA9IHJlcXVpcmUgXCIuL1VuZGVyc2NvcmVcIlxuVXRpbHMgPSByZXF1aXJlIFwiLi9VdGlsc1wiXG5cbkNocm9tZUFsZXJ0ID0gXCJcIlwiXG5JbXBvcnRpbmcgbGF5ZXJzIGlzIGN1cnJlbnRseSBvbmx5IHN1cHBvcnRlZCBvbiBTYWZhcmkuIElmIHlvdSByZWFsbHkgd2FudCBpdCB0byB3b3JrIHdpdGggQ2hyb21lIHF1aXQgaXQsIG9wZW4gYSB0ZXJtaW5hbCBhbmQgcnVuOlxub3BlbiAtYSBHb29nbGVcXCBDaHJvbWUgLeKAk2FsbG93LWZpbGUtYWNjZXNzLWZyb20tZmlsZXNcblwiXCJcIlxuXG5jbGFzcyBleHBvcnRzLkltcG9ydGVyXG5cblx0Y29uc3RydWN0b3I6IChAcGF0aCwgQGV4dHJhTGF5ZXJQcm9wZXJ0aWVzPXt9KSAtPlxuXG5cdFx0QHBhdGhzID1cblx0XHRcdGxheWVySW5mbzogVXRpbHMucGF0aEpvaW4gQHBhdGgsIFwibGF5ZXJzLmpzb25cIlxuXHRcdFx0aW1hZ2VzOiBVdGlscy5wYXRoSm9pbiBAcGF0aCwgXCJpbWFnZXNcIlxuXHRcdFx0ZG9jdW1lbnROYW1lOiBAcGF0aC5zcGxpdChcIi9cIikucG9wKClcblxuXHRcdEBfY3JlYXRlZExheWVycyA9IFtdXG5cdFx0QF9jcmVhdGVkTGF5ZXJzQnlOYW1lID0ge31cblxuXHRsb2FkOiAtPlxuXG5cdFx0bGF5ZXJzQnlOYW1lID0ge31cblx0XHRsYXllckluZm8gPSBAX2xvYWRsYXllckluZm8oKVxuXHRcdFxuXHRcdCMgUGFzcyBvbmUuIENyZWF0ZSBhbGwgbGF5ZXJzIGJ1aWxkIHRoZSBoaWVyYXJjaHlcblx0XHRsYXllckluZm8ubWFwIChsYXllckl0ZW1JbmZvKSA9PlxuXHRcdFx0QF9jcmVhdGVMYXllciBsYXllckl0ZW1JbmZvXG5cblx0XHQjIFBhc3MgdHdvLiBBZGp1c3QgcG9zaXRpb24gb24gc2NyZWVuIGZvciBhbGwgbGF5ZXJzXG5cdFx0IyBiYXNlZCBvbiB0aGUgaGllcmFyY2h5LlxuXHRcdGZvciBsYXllciBpbiBAX2NyZWF0ZWRMYXllcnNcblx0XHRcdEBfY29ycmVjdExheWVyIGxheWVyXG5cblx0XHQjIFBhc3MgdGhyZWUsIGluc2VydCB0aGUgbGF5ZXJzIGludG8gdGhlIGRvbVxuXHRcdCMgKHRoZXkgd2VyZSBub3QgaW5zZXJ0ZWQgeWV0IGJlY2F1c2Ugb2YgdGhlIHNoYWRvdyBrZXl3b3JkKVxuXHRcdGZvciBsYXllciBpbiBAX2NyZWF0ZWRMYXllcnNcblx0XHRcdGlmIG5vdCBsYXllci5zdXBlckxheWVyXG5cdFx0XHRcdGxheWVyLnN1cGVyTGF5ZXIgPSBudWxsXG5cblx0XHRAX2NyZWF0ZWRMYXllcnNCeU5hbWVcblxuXHRfbG9hZGxheWVySW5mbzogLT5cblxuXHRcdCMgQ2hyb21lIGlzIGEgcGFpbiBpbiB0aGUgYXNzIGFuZCB3b24ndCBhbGxvdyBsb2NhbCBmaWxlIGFjY2Vzc1xuXHRcdCMgdGhlcmVmb3JlIEkgYWRkIGEgLmpzIGZpbGUgd2hpY2ggYWRkcyB0aGUgZGF0YSB0byBcblx0XHQjIHdpbmRvdy5fX2ltcG9ydGVkX19bXCI8cGF0aD5cIl1cblxuXHRcdGltcG9ydGVkS2V5ID0gXCIje0BwYXRocy5kb2N1bWVudE5hbWV9L2xheWVycy5qc29uLmpzXCJcblxuXHRcdGlmIHdpbmRvdy5fX2ltcG9ydGVkX18/Lmhhc093blByb3BlcnR5IGltcG9ydGVkS2V5XG5cdFx0XHRyZXR1cm4gd2luZG93Ll9faW1wb3J0ZWRfX1tpbXBvcnRlZEtleV1cblxuXHRcdCMgIyBGb3Igbm93IHRoaXMgZG9lcyBub3Qgd29yayBpbiBDaHJvbWUgYW5kIHdlIHRocm93IGFuIGVycm9yXG5cdFx0IyB0cnlcblx0XHQjIFx0cmV0dXJuIEZyYW1lci5VdGlscy5kb21Mb2FkSlNPTlN5bmMgQHBhdGhzLmxheWVySW5mb1xuXHRcdCMgY2F0Y2ggZVxuXHRcdCMgXHRpZiBVdGlscy5pc0Nocm9tZVxuXHRcdCMgXHRcdGFsZXJ0IENocm9tZUFsZXJ0XG5cdFx0IyBcdGVsc2Vcblx0XHQjIFx0XHR0aHJvdyBlXG5cblx0XHRyZXR1cm4gRnJhbWVyLlV0aWxzLmRvbUxvYWRKU09OU3luYyBAcGF0aHMubGF5ZXJJbmZvXG5cblx0X2NyZWF0ZUxheWVyOiAoaW5mbywgc3VwZXJMYXllcikgLT5cblx0XHRcblx0XHRMYXllckNsYXNzID0gTGF5ZXJcblxuXHRcdGxheWVySW5mbyA9XG5cdFx0XHRzaGFkb3c6IHRydWVcblx0XHRcdG5hbWU6IGluZm8ubmFtZVxuXHRcdFx0ZnJhbWU6IGluZm8ubGF5ZXJGcmFtZVxuXHRcdFx0Y2xpcDogZmFsc2Vcblx0XHRcdGJhY2tncm91bmRDb2xvcjogbnVsbFxuXHRcdFx0dmlzaWJsZTogaW5mby52aXNpYmxlID8gdHJ1ZVxuXG5cdFx0Xy5leHRlbmQgbGF5ZXJJbmZvLCBAZXh0cmFMYXllclByb3BlcnRpZXNcblxuXHRcdCMgTW9zdCBsYXllcnMgd2lsbCBoYXZlIGFuIGltYWdlLCBhZGQgdGhhdCBoZXJlXG5cdFx0aWYgaW5mby5pbWFnZVxuXHRcdFx0bGF5ZXJJbmZvLmZyYW1lID0gaW5mby5pbWFnZS5mcmFtZVxuXHRcdFx0bGF5ZXJJbmZvLmltYWdlID0gVXRpbHMucGF0aEpvaW4gQHBhdGgsIGluZm8uaW1hZ2UucGF0aFxuXHRcdFx0XG5cdFx0IyBJZiB0aGVyZSBpcyBhIG1hc2sgb24gdGhpcyBsYXllciBncm91cCwgdGFrZSBpdHMgZnJhbWVcblx0XHRpZiBpbmZvLm1hc2tGcmFtZVxuXHRcdFx0bGF5ZXJJbmZvLmZyYW1lID0gaW5mby5tYXNrRnJhbWVcblx0XHRcdGxheWVySW5mby5jbGlwID0gdHJ1ZVxuXG5cdFx0IyBUb2RvOiBzbWFydCBzdHVmZiBmb3IgcGFnaW5nIGFuZCBzY3JvbGwgdmlld3NcblxuXHRcdCMgRmlndXJlIG91dCB3aGF0IHRoZSBzdXBlciBsYXllciBzaG91bGQgYmUuIElmIHRoaXMgbGF5ZXIgaGFzIGEgY29udGVudExheWVyXG5cdFx0IyAobGlrZSBhIHNjcm9sbCB2aWV3KSB3ZSBhdHRhY2ggaXQgdG8gdGhhdCBpbnN0ZWFkLlxuXHRcdGlmIHN1cGVyTGF5ZXI/LmNvbnRlbnRMYXllclxuXHRcdFx0bGF5ZXJJbmZvLnN1cGVyTGF5ZXIgPSBzdXBlckxheWVyLmNvbnRlbnRMYXllclxuXHRcdGVsc2UgaWYgc3VwZXJMYXllclxuXHRcdFx0bGF5ZXJJbmZvLnN1cGVyTGF5ZXIgPSBzdXBlckxheWVyXG5cblx0XHQjIFdlIGNhbiBjcmVhdGUgdGhlIGxheWVyIGhlcmVcblx0XHRsYXllciA9IG5ldyBMYXllckNsYXNzIGxheWVySW5mb1xuXHRcdGxheWVyLm5hbWUgPSBsYXllckluZm8ubmFtZVxuXG5cdFx0IyBBIGxheWVyIHdpdGhvdXQgYW4gaW1hZ2UsIG1hc2sgb3Igc3VibGF5ZXJzIHNob3VsZCBiZSB6ZXJvXG5cdFx0aWYgbm90IGxheWVyLmltYWdlIGFuZCBub3QgaW5mby5jaGlsZHJlbi5sZW5ndGggYW5kIG5vdCBpbmZvLm1hc2tGcmFtZVxuXHRcdFx0bGF5ZXIuZnJhbWUgPSBuZXcgRnJhbWVcblxuXHRcdGluZm8uY2hpbGRyZW4ucmV2ZXJzZSgpLm1hcCAoaW5mbykgPT4gQF9jcmVhdGVMYXllciBpbmZvLCBsYXllclxuXG5cdFx0IyBUT0RPRE9ET0RPRFxuXHRcdGlmIG5vdCBsYXllci5pbWFnZSBhbmQgbm90IGluZm8ubWFza0ZyYW1lXG5cdFx0XHRsYXllci5mcmFtZSA9IGxheWVyLmNvbnRlbnRGcmFtZSgpXG5cblx0XHRsYXllci5faW5mbyA9IGluZm9cblxuXHRcdEBfY3JlYXRlZExheWVycy5wdXNoIGxheWVyXG5cdFx0QF9jcmVhdGVkTGF5ZXJzQnlOYW1lW2xheWVyLm5hbWVdID0gbGF5ZXJcblxuXHRfY29ycmVjdExheWVyOiAobGF5ZXIpIC0+XG5cblx0XHR0cmF2ZXJzZSA9IChsYXllcikgLT5cblxuXHRcdFx0aWYgbGF5ZXIuc3VwZXJMYXllclxuXHRcdFx0XHRsYXllci5mcmFtZSA9IFV0aWxzLmNvbnZlcnRQb2ludCBsYXllci5mcmFtZSwgbnVsbCwgbGF5ZXIuc3VwZXJMYXllclxuXG5cdFx0XHRmb3Igc3ViTGF5ZXIgaW4gbGF5ZXIuc3ViTGF5ZXJzXG5cdFx0XHRcdHRyYXZlcnNlIHN1YkxheWVyXG5cblx0XHRpZiBub3QgbGF5ZXIuc3VwZXJMYXllclxuXHRcdFx0dHJhdmVyc2UgbGF5ZXJcblxuZXhwb3J0cy5JbXBvcnRlci5sb2FkID0gKHBhdGgpIC0+XG5cdGltcG9ydGVyID0gbmV3IGV4cG9ydHMuSW1wb3J0ZXIgcGF0aFxuXHRpbXBvcnRlci5sb2FkKCkiLCJ7X30gPSByZXF1aXJlIFwiLi9VbmRlcnNjb3JlXCJcblxuVXRpbHMgPSByZXF1aXJlIFwiLi9VdGlsc1wiXG5cbntDb25maWd9ID0gcmVxdWlyZSBcIi4vQ29uZmlnXCJcbntEZWZhdWx0c30gPSByZXF1aXJlIFwiLi9EZWZhdWx0c1wiXG57U2Vzc2lvbn0gPSByZXF1aXJlIFwiLi9TZXNzaW9uXCJcbntCYXNlQ2xhc3N9ID0gcmVxdWlyZSBcIi4vQmFzZUNsYXNzXCJcbntFdmVudEVtaXR0ZXJ9ID0gcmVxdWlyZSBcIi4vRXZlbnRFbWl0dGVyXCJcbntBbmltYXRpb259ID0gcmVxdWlyZSBcIi4vQW5pbWF0aW9uXCJcbntGcmFtZX0gPSByZXF1aXJlIFwiLi9GcmFtZVwiXG57TGF5ZXJTdHlsZX0gPSByZXF1aXJlIFwiLi9MYXllclN0eWxlXCJcbntMYXllclN0YXRlc30gPSByZXF1aXJlIFwiLi9MYXllclN0YXRlc1wiXG57TGF5ZXJEcmFnZ2FibGV9ID0gcmVxdWlyZSBcIi4vTGF5ZXJEcmFnZ2FibGVcIlxuXG5TZXNzaW9uLl9Sb290RWxlbWVudCA9IG51bGxcblNlc3Npb24uX0xheWVyTGlzdCA9IFtdXG5cbmxheWVyUHJvcGVydHkgPSAobmFtZSwgY3NzUHJvcGVydHksIGZhbGxiYWNrLCB2YWxpZGF0b3IsIHNldCkgLT5cblx0ZXhwb3J0YWJsZTogdHJ1ZVxuXHRkZWZhdWx0OiBmYWxsYmFja1xuXHRnZXQ6IC0+XG5cdFx0QF9nZXRQcm9wZXJ0eVZhbHVlIG5hbWVcblx0c2V0OiAodmFsdWUpIC0+XG5cblx0XHQjIGlmIG5vdCB2YWxpZGF0b3Jcblx0XHQjIFx0Y29uc29sZS5sb2cgXCJNaXNzaW5nIHZhbGlkYXRvciBmb3IgTGF5ZXIuI3tuYW1lfVwiLCB2YWxpZGF0b3JcblxuXHRcdGlmIHZhbGlkYXRvcj8odmFsdWUpIGlzIGZhbHNlXG5cdFx0XHR0aHJvdyBFcnJvciBcInZhbHVlICcje3ZhbHVlfScgb2YgdHlwZSAje3R5cGVvZiB2YWx1ZX0gaXMgbm90IHZhbGlkIGZvciBhIExheWVyLiN7bmFtZX0gcHJvcGVydHlcIlxuXG5cdFx0QF9zZXRQcm9wZXJ0eVZhbHVlIG5hbWUsIHZhbHVlXG5cdFx0QHN0eWxlW2Nzc1Byb3BlcnR5XSA9IExheWVyU3R5bGVbY3NzUHJvcGVydHldKEApXG5cdFx0QGVtaXQgXCJjaGFuZ2U6I3tuYW1lfVwiLCB2YWx1ZVxuXHRcdHNldCBALCB2YWx1ZSBpZiBzZXRcblxubGF5ZXJTdHlsZVByb3BlcnR5ID0gKGNzc1Byb3BlcnR5KSAtPlxuXHRleHBvcnRhYmxlOiB0cnVlXG5cdCMgZGVmYXVsdDogZmFsbGJhY2tcblx0Z2V0OiAtPiBAc3R5bGVbY3NzUHJvcGVydHldXG5cdHNldDogKHZhbHVlKSAtPlxuXHRcdEBzdHlsZVtjc3NQcm9wZXJ0eV0gPSB2YWx1ZVxuXHRcdEBlbWl0IFwiY2hhbmdlOiN7Y3NzUHJvcGVydHl9XCIsIHZhbHVlXG5cbmNsYXNzIGV4cG9ydHMuTGF5ZXIgZXh0ZW5kcyBCYXNlQ2xhc3NcblxuXHRjb25zdHJ1Y3RvcjogKG9wdGlvbnM9e30pIC0+XG5cblx0XHRTZXNzaW9uLl9MYXllckxpc3QucHVzaCBAXG5cblx0XHQjIFNwZWNpYWwgcG93ZXIgc2V0dGluZyBmb3IgMmQgcmVuZGVyaW5nIHBhdGguIE9ubHkgZW5hYmxlIHRoaXNcblx0XHQjIGlmIHlvdSBrbm93IHdoYXQgeW91IGFyZSBkb2luZy4gU2VlIExheWVyU3R5bGUgZm9yIG1vcmUgaW5mby5cblx0XHRAX3ByZWZlcjJkID0gZmFsc2VcblxuXHRcdCMgV2UgaGF2ZSB0byBjcmVhdGUgdGhlIGVsZW1lbnQgYmVmb3JlIHdlIHNldCB0aGUgZGVmYXVsdHNcblx0XHRAX2NyZWF0ZUVsZW1lbnQoKVxuXHRcdEBfc2V0RGVmYXVsdENTUygpXG5cblx0XHRpZiBvcHRpb25zLmhhc093blByb3BlcnR5IFwiZnJhbWVcIlxuXHRcdFx0b3B0aW9ucyA9IF8uZXh0ZW5kKG9wdGlvbnMsIG9wdGlvbnMuZnJhbWUpXG5cblx0XHRvcHRpb25zID0gRGVmYXVsdHMuZ2V0RGVmYXVsdHMgXCJMYXllclwiLCBvcHRpb25zXG5cblx0XHRzdXBlciBvcHRpb25zXG5cblx0XHQjIEtlZXAgdHJhY2sgb2YgdGhlIGRlZmF1bHQgdmFsdWVzXG5cdFx0IyBAX2RlZmF1bHRWYWx1ZXMgPSBvcHRpb25zLl9kZWZhdWx0VmFsdWVzXG5cblx0XHQjIFdlIG5lZWQgdG8gZXhwbGljaXRseSBzZXQgdGhlIGVsZW1lbnQgaWQgYWdhaW4sIGJlY3Vhc2UgaXQgd2FzIG1hZGUgYnkgdGhlIHN1cGVyXG5cdFx0QF9lbGVtZW50LmlkID0gXCJGcmFtZXJMYXllci0je0BpZH1cIlxuXG5cdFx0Zm9yIGsgaW4gW1wibWluWFwiLCBcIm1pZFhcIiwgXCJtYXhYXCIsIFwibWluWVwiLCBcIm1pZFlcIiwgXCJtYXhZXCJdXG5cdFx0XHRpZiBvcHRpb25zLmhhc093blByb3BlcnR5IGtcblx0XHRcdFx0QFtrXSA9IG9wdGlvbnNba11cblxuXHRcdCMgSW5zZXJ0IHRoZSBsYXllciBpbnRvIHRoZSBkb20gb3IgdGhlIHN1cGVyTGF5ZXIgZWxlbWVudFxuXHRcdGlmIG5vdCBvcHRpb25zLnN1cGVyTGF5ZXJcblx0XHRcdEBicmluZ1RvRnJvbnQoKVxuXHRcdFx0QF9pbnNlcnRFbGVtZW50KCkgaWYgbm90IG9wdGlvbnMuc2hhZG93XG5cdFx0ZWxzZVxuXHRcdFx0QHN1cGVyTGF5ZXIgPSBvcHRpb25zLnN1cGVyTGF5ZXJcblxuXHRcdCMgU2V0IG5lZWRlZCBwcml2YXRlIHZhcmlhYmxlc1xuXHRcdEBfc3ViTGF5ZXJzID0gW11cblxuXHQjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXHQjIFByb3BlcnRpZXNcblxuXHQjIENzcyBwcm9wZXJ0aWVzXG5cdEBkZWZpbmUgXCJ3aWR0aFwiLCAgbGF5ZXJQcm9wZXJ0eSBcIndpZHRoXCIsICBcIndpZHRoXCIsIDEwMCwgXy5pc051bWJlclxuXHRAZGVmaW5lIFwiaGVpZ2h0XCIsIGxheWVyUHJvcGVydHkgXCJoZWlnaHRcIiwgXCJoZWlnaHRcIiwgMTAwLCBfLmlzTnVtYmVyXG5cblx0QGRlZmluZSBcInZpc2libGVcIiwgbGF5ZXJQcm9wZXJ0eSBcInZpc2libGVcIiwgXCJkaXNwbGF5XCIsIHRydWUsIF8uaXNCb29sXG5cdEBkZWZpbmUgXCJvcGFjaXR5XCIsIGxheWVyUHJvcGVydHkgXCJvcGFjaXR5XCIsIFwib3BhY2l0eVwiLCAxLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJpbmRleFwiLCBsYXllclByb3BlcnR5IFwiaW5kZXhcIiwgXCJ6SW5kZXhcIiwgMCwgXy5pc051bWJlclxuXHRAZGVmaW5lIFwiY2xpcFwiLCBsYXllclByb3BlcnR5IFwiY2xpcFwiLCBcIm92ZXJmbG93XCIsIHRydWUsIF8uaXNCb29sXG5cdFxuXHRAZGVmaW5lIFwic2Nyb2xsSG9yaXpvbnRhbFwiLCBsYXllclByb3BlcnR5IFwic2Nyb2xsSG9yaXpvbnRhbFwiLCBcIm92ZXJmbG93WFwiLCBmYWxzZSwgXy5pc0Jvb2wsIChsYXllciwgdmFsdWUpIC0+XG5cdFx0bGF5ZXIuaWdub3JlRXZlbnRzID0gZmFsc2UgaWYgdmFsdWUgaXMgdHJ1ZVxuXHRcblx0QGRlZmluZSBcInNjcm9sbFZlcnRpY2FsXCIsIGxheWVyUHJvcGVydHkgXCJzY3JvbGxWZXJ0aWNhbFwiLCBcIm92ZXJmbG93WVwiLCBmYWxzZSwgXy5pc0Jvb2wsIChsYXllciwgdmFsdWUpIC0+XG5cdFx0bGF5ZXIuaWdub3JlRXZlbnRzID0gZmFsc2UgaWYgdmFsdWUgaXMgdHJ1ZVxuXG5cdEBkZWZpbmUgXCJzY3JvbGxcIixcblx0XHRnZXQ6IC0+IEBzY3JvbGxIb3Jpem9udGFsIGlzIHRydWUgb3IgQHNjcm9sbFZlcnRpY2FsIGlzIHRydWVcblx0XHRzZXQ6ICh2YWx1ZSkgLT4gQHNjcm9sbEhvcml6b250YWwgPSBAc2Nyb2xsVmVydGljYWwgPSB0cnVlXG5cblx0IyBCZWhhdmlvdXIgcHJvcGVydGllc1xuXHRAZGVmaW5lIFwiaWdub3JlRXZlbnRzXCIsIGxheWVyUHJvcGVydHkgXCJpZ25vcmVFdmVudHNcIiwgXCJwb2ludGVyRXZlbnRzXCIsIHRydWUsIF8uaXNCb29sXG5cblx0IyBNYXRyaXggcHJvcGVydGllc1xuXHRAZGVmaW5lIFwieFwiLCBsYXllclByb3BlcnR5IFwieFwiLCBcIndlYmtpdFRyYW5zZm9ybVwiLCAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJ5XCIsIGxheWVyUHJvcGVydHkgXCJ5XCIsIFwid2Via2l0VHJhbnNmb3JtXCIsIDAsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcInpcIiwgbGF5ZXJQcm9wZXJ0eSBcInpcIiwgXCJ3ZWJraXRUcmFuc2Zvcm1cIiwgMCwgXy5pc051bWJlclxuXG5cdEBkZWZpbmUgXCJzY2FsZVhcIiwgbGF5ZXJQcm9wZXJ0eSBcInNjYWxlWFwiLCBcIndlYmtpdFRyYW5zZm9ybVwiLCAxLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJzY2FsZVlcIiwgbGF5ZXJQcm9wZXJ0eSBcInNjYWxlWVwiLCBcIndlYmtpdFRyYW5zZm9ybVwiLCAxLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJzY2FsZVpcIiwgbGF5ZXJQcm9wZXJ0eSBcInNjYWxlWlwiLCBcIndlYmtpdFRyYW5zZm9ybVwiLCAxLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJzY2FsZVwiLCBsYXllclByb3BlcnR5IFwic2NhbGVcIiwgXCJ3ZWJraXRUcmFuc2Zvcm1cIiwgMSwgXy5pc051bWJlclxuXG5cdEBkZWZpbmUgXCJza2V3WFwiLCBsYXllclByb3BlcnR5IFwic2tld1hcIiwgXCJ3ZWJraXRUcmFuc2Zvcm1cIiwgMCwgXy5pc051bWJlclxuXHRAZGVmaW5lIFwic2tld1lcIiwgbGF5ZXJQcm9wZXJ0eSBcInNrZXdZXCIsIFwid2Via2l0VHJhbnNmb3JtXCIsIDAsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcInNrZXdcIiwgbGF5ZXJQcm9wZXJ0eSBcInNrZXdcIiwgXCJ3ZWJraXRUcmFuc2Zvcm1cIiwgMCwgXy5pc051bWJlclxuXG5cdCMgQGRlZmluZSBcInNjYWxlXCIsXG5cdCMgXHRnZXQ6IC0+IChAc2NhbGVYICsgQHNjYWxlWSArIEBzY2FsZVopIC8gMy4wXG5cdCMgXHRzZXQ6ICh2YWx1ZSkgLT4gQHNjYWxlWCA9IEBzY2FsZVkgPSBAc2NhbGVaID0gdmFsdWVcblxuXHRAZGVmaW5lIFwib3JpZ2luWFwiLCBsYXllclByb3BlcnR5IFwib3JpZ2luWFwiLCBcIndlYmtpdFRyYW5zZm9ybU9yaWdpblwiLCAwLjUsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcIm9yaWdpbllcIiwgbGF5ZXJQcm9wZXJ0eSBcIm9yaWdpbllcIiwgXCJ3ZWJraXRUcmFuc2Zvcm1PcmlnaW5cIiwgMC41LCBfLmlzTnVtYmVyXG5cdCMgQGRlZmluZSBcIm9yaWdpblpcIiwgbGF5ZXJQcm9wZXJ0eSBcIm9yaWdpblpcIiwgXCJ3ZWJraXRUcmFuc2Zvcm1PcmlnaW5cIiwgMC41XG5cblx0QGRlZmluZSBcInJvdGF0aW9uWFwiLCBsYXllclByb3BlcnR5IFwicm90YXRpb25YXCIsIFwid2Via2l0VHJhbnNmb3JtXCIsIDAsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcInJvdGF0aW9uWVwiLCBsYXllclByb3BlcnR5IFwicm90YXRpb25ZXCIsIFwid2Via2l0VHJhbnNmb3JtXCIsIDAsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcInJvdGF0aW9uWlwiLCBsYXllclByb3BlcnR5IFwicm90YXRpb25aXCIsIFwid2Via2l0VHJhbnNmb3JtXCIsIDAsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcInJvdGF0aW9uXCIsICBsYXllclByb3BlcnR5IFwicm90YXRpb25aXCIsIFwid2Via2l0VHJhbnNmb3JtXCIsIDAsIF8uaXNOdW1iZXJcblxuXHQjIEZpbHRlciBwcm9wZXJ0aWVzXG5cdEBkZWZpbmUgXCJibHVyXCIsIGxheWVyUHJvcGVydHkgXCJibHVyXCIsIFwid2Via2l0RmlsdGVyXCIsIDAsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcImJyaWdodG5lc3NcIiwgbGF5ZXJQcm9wZXJ0eSBcImJyaWdodG5lc3NcIiwgXCJ3ZWJraXRGaWx0ZXJcIiwgMTAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJzYXR1cmF0ZVwiLCBsYXllclByb3BlcnR5IFwic2F0dXJhdGVcIiwgXCJ3ZWJraXRGaWx0ZXJcIiwgMTAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJodWVSb3RhdGVcIiwgbGF5ZXJQcm9wZXJ0eSBcImh1ZVJvdGF0ZVwiLCBcIndlYmtpdEZpbHRlclwiLCAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJjb250cmFzdFwiLCBsYXllclByb3BlcnR5IFwiY29udHJhc3RcIiwgXCJ3ZWJraXRGaWx0ZXJcIiwgMTAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJpbnZlcnRcIiwgbGF5ZXJQcm9wZXJ0eSBcImludmVydFwiLCBcIndlYmtpdEZpbHRlclwiLCAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJncmF5c2NhbGVcIiwgbGF5ZXJQcm9wZXJ0eSBcImdyYXlzY2FsZVwiLCBcIndlYmtpdEZpbHRlclwiLCAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJzZXBpYVwiLCBsYXllclByb3BlcnR5IFwic2VwaWFcIiwgXCJ3ZWJraXRGaWx0ZXJcIiwgMCwgXy5pc051bWJlclxuXG5cdCMgU2hhZG93IHByb3BlcnRpZXNcblx0QGRlZmluZSBcInNoYWRvd1hcIiwgbGF5ZXJQcm9wZXJ0eSBcInNoYWRvd1hcIiwgXCJib3hTaGFkb3dcIiwgMCwgXy5pc051bWJlclxuXHRAZGVmaW5lIFwic2hhZG93WVwiLCBsYXllclByb3BlcnR5IFwic2hhZG93WVwiLCBcImJveFNoYWRvd1wiLCAwLCBfLmlzTnVtYmVyXG5cdEBkZWZpbmUgXCJzaGFkb3dCbHVyXCIsIGxheWVyUHJvcGVydHkgXCJzaGFkb3dCbHVyXCIsIFwiYm94U2hhZG93XCIsIDAsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcInNoYWRvd1NwcmVhZFwiLCBsYXllclByb3BlcnR5IFwic2hhZG93U3ByZWFkXCIsIFwiYm94U2hhZG93XCIsIDAsIF8uaXNOdW1iZXJcblx0QGRlZmluZSBcInNoYWRvd0NvbG9yXCIsIGxheWVyUHJvcGVydHkgXCJzaGFkb3dDb2xvclwiLCBcImJveFNoYWRvd1wiLCBcIlwiXG5cblx0IyBNYXBwZWQgc3R5bGUgcHJvcGVydGllc1xuXG5cdEBkZWZpbmUgXCJiYWNrZ3JvdW5kQ29sb3JcIiwgbGF5ZXJTdHlsZVByb3BlcnR5IFwiYmFja2dyb3VuZENvbG9yXCJcblx0QGRlZmluZSBcImNvbG9yXCIsIGxheWVyU3R5bGVQcm9wZXJ0eSBcImNvbG9yXCJcblxuXHQjIEJvcmRlciBwcm9wZXJ0aWVzXG5cdEBkZWZpbmUgXCJib3JkZXJSYWRpdXNcIiwgbGF5ZXJTdHlsZVByb3BlcnR5IFwiYm9yZGVyUmFkaXVzXCJcblx0QGRlZmluZSBcImJvcmRlckNvbG9yXCIsIGxheWVyU3R5bGVQcm9wZXJ0eSBcImJvcmRlckNvbG9yXCJcblx0QGRlZmluZSBcImJvcmRlcldpZHRoXCIsIGxheWVyU3R5bGVQcm9wZXJ0eSBcImJvcmRlcldpZHRoXCJcblxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMgSWRlbnRpdHlcblxuXHRAZGVmaW5lIFwibmFtZVwiLFxuXHRcdGV4cG9ydGFibGU6IHRydWVcblx0XHRkZWZhdWx0OiBcIlwiXG5cdFx0Z2V0OiAtPiBcblx0XHRcdEBfZ2V0UHJvcGVydHlWYWx1ZSBcIm5hbWVcIlxuXHRcdHNldDogKHZhbHVlKSAtPlxuXHRcdFx0QF9zZXRQcm9wZXJ0eVZhbHVlIFwibmFtZVwiLCB2YWx1ZVxuXHRcdFx0IyBTZXQgdGhlIG5hbWUgYXR0cmlidXRlIG9mIHRoZSBkb20gZWxlbWVudCB0b29cblx0XHRcdCMgU2VlOiBodHRwczovL2dpdGh1Yi5jb20va29lbmJvay9GcmFtZXIvaXNzdWVzLzYzXG5cdFx0XHRAX2VsZW1lbnQuc2V0QXR0cmlidXRlIFwibmFtZVwiLCB2YWx1ZVxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMgR2VvbWV0cnlcblxuXHRAZGVmaW5lIFwiZnJhbWVcIixcblx0XHRnZXQ6IC0+IF8ucGljayhALCBbXCJ4XCIsIFwieVwiLCBcIndpZHRoXCIsIFwiaGVpZ2h0XCJdKVxuXHRcdHNldDogKGZyYW1lKSAtPlxuXHRcdFx0cmV0dXJuIGlmIG5vdCBmcmFtZVxuXHRcdFx0Zm9yIGsgaW4gW1wieFwiLCBcInlcIiwgXCJ3aWR0aFwiLCBcImhlaWdodFwiXVxuXHRcdFx0XHRpZiBmcmFtZS5oYXNPd25Qcm9wZXJ0eShrKVxuXHRcdFx0XHRcdEBba10gPSBmcmFtZVtrXVxuXG5cdEBkZWZpbmUgXCJtaW5YXCIsXG5cdFx0Z2V0OiAtPiBAeFxuXHRcdHNldDogKHZhbHVlKSAtPiBAeCA9IHZhbHVlXG5cblx0QGRlZmluZSBcIm1pZFhcIixcblx0XHRnZXQ6IC0+IFV0aWxzLmZyYW1lR2V0TWlkWCBAXG5cdFx0c2V0OiAodmFsdWUpIC0+IFV0aWxzLmZyYW1lU2V0TWlkWCBALCB2YWx1ZVxuXG5cdEBkZWZpbmUgXCJtYXhYXCIsXG5cdFx0Z2V0OiAtPiBVdGlscy5mcmFtZUdldE1heFggQFxuXHRcdHNldDogKHZhbHVlKSAtPiBVdGlscy5mcmFtZVNldE1heFggQCwgdmFsdWVcblxuXHRAZGVmaW5lIFwibWluWVwiLFxuXHRcdGdldDogLT4gQHlcblx0XHRzZXQ6ICh2YWx1ZSkgLT4gQHkgPSB2YWx1ZVxuXG5cdEBkZWZpbmUgXCJtaWRZXCIsXG5cdFx0Z2V0OiAtPiBVdGlscy5mcmFtZUdldE1pZFkgQFxuXHRcdHNldDogKHZhbHVlKSAtPiBVdGlscy5mcmFtZVNldE1pZFkgQCwgdmFsdWVcblxuXHRAZGVmaW5lIFwibWF4WVwiLFxuXHRcdGdldDogLT4gVXRpbHMuZnJhbWVHZXRNYXhZIEBcblx0XHRzZXQ6ICh2YWx1ZSkgLT4gVXRpbHMuZnJhbWVTZXRNYXhZIEAsIHZhbHVlXG5cblx0Y29udmVydFBvaW50OiAocG9pbnQpIC0+XG5cdFx0IyBDb252ZXJ0IGEgcG9pbnQgb24gc2NyZWVuIHRvIHRoaXMgdmlld3MgY29vcmRpbmF0ZSBzeXN0ZW1cblx0XHQjIFRPRE86IG5lZWRzIHRlc3RzXG5cdFx0VXRpbHMuY29udmVydFBvaW50IHBvaW50LCBudWxsLCBAXG5cblx0QGRlZmluZSBcInNjcmVlbkZyYW1lXCIsXG5cdFx0Z2V0OiAtPlxuXHRcdFx0VXRpbHMuY29udmVydFBvaW50KEBmcmFtZSwgQCwgbnVsbClcblx0XHRzZXQ6IChmcmFtZSkgLT5cblx0XHRcdGlmIG5vdCBAc3VwZXJMYXllclxuXHRcdFx0XHRAZnJhbWUgPSBmcmFtZVxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRAZnJhbWUgPSBVdGlscy5jb252ZXJ0UG9pbnQoZnJhbWUsIG51bGwsIEBzdXBlckxheWVyKVxuXG5cdGNvbnRlbnRGcmFtZTogLT5cblx0XHRVdGlscy5mcmFtZU1lcmdlKF8ucGx1Y2soQHN1YkxheWVycywgXCJmcmFtZVwiKSlcblxuXHRjZW50ZXJGcmFtZTogLT5cblx0XHQjIEdldCB0aGUgY2VudGVyZWQgZnJhbWUgZm9yIGl0cyBzdXBlckxheWVyXG5cdFx0aWYgQHN1cGVyTGF5ZXJcblx0XHRcdGZyYW1lID0gQGZyYW1lXG5cdFx0XHRVdGlscy5mcmFtZVNldE1pZFgoZnJhbWUsIHBhcnNlSW50KEBzdXBlckxheWVyLndpZHRoICAvIDIuMCkpXG5cdFx0XHRVdGlscy5mcmFtZVNldE1pZFkoZnJhbWUsIHBhcnNlSW50KEBzdXBlckxheWVyLmhlaWdodCAvIDIuMCkpXG5cdFx0XHRyZXR1cm4gZnJhbWVcblx0XHRlbHNlXG5cdFx0XHRmcmFtZSA9IEBmcmFtZVxuXHRcdFx0VXRpbHMuZnJhbWVTZXRNaWRYKGZyYW1lLCBwYXJzZUludCh3aW5kb3cuaW5uZXJXaWR0aCAgLyAyLjApKVxuXHRcdFx0VXRpbHMuZnJhbWVTZXRNaWRZKGZyYW1lLCBwYXJzZUludCh3aW5kb3cuaW5uZXJIZWlnaHQgLyAyLjApKVxuXHRcdFx0cmV0dXJuIGZyYW1lXG5cblx0Y2VudGVyOiAtPlxuXHRcdEBmcmFtZSA9IEBjZW50ZXJGcmFtZSgpICMgQ2VudGVyICBpbiBzdXBlckxheWVyXG5cdFx0QFxuXHRcblx0Y2VudGVyWDogKG9mZnNldD0wKSAtPlxuXHRcdEB4ID0gQGNlbnRlckZyYW1lKCkueCArIG9mZnNldCAjIENlbnRlciB4IGluIHN1cGVyTGF5ZXJcblx0XHRAXG5cdFxuXHRjZW50ZXJZOiAob2Zmc2V0PTApIC0+XG5cdFx0QHkgPSBAY2VudGVyRnJhbWUoKS55ICsgb2Zmc2V0ICMgQ2VudGVyIHkgaW4gc3VwZXJMYXllclxuXHRcdEBcblxuXHRwaXhlbEFsaWduOiAtPlxuXHRcdEB4ID0gcGFyc2VJbnQgQHhcblx0XHRAeSA9IHBhcnNlSW50IEB5XG5cblxuXHQjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXHQjIENTU1xuXG5cdEBkZWZpbmUgXCJzdHlsZVwiLFxuXHRcdGdldDogLT4gQF9lbGVtZW50LnN0eWxlXG5cdFx0c2V0OiAodmFsdWUpIC0+XG5cdFx0XHRfLmV4dGVuZCBAX2VsZW1lbnQuc3R5bGUsIHZhbHVlXG5cdFx0XHRAZW1pdCBcImNoYW5nZTpzdHlsZVwiXG5cblx0QGRlZmluZSBcImh0bWxcIixcblx0XHRnZXQ6IC0+XG5cdFx0XHRAX2VsZW1lbnRIVE1MPy5pbm5lckhUTUxcblxuXHRcdHNldDogKHZhbHVlKSAtPlxuXG5cdFx0XHQjIEluc2VydCBzb21lIGh0bWwgZGlyZWN0bHkgaW50byB0aGlzIGxheWVyLiBXZSBhY3R1YWxseSBjcmVhdGVcblx0XHRcdCMgYSBjaGlsZCBub2RlIHRvIGluc2VydCBpdCBpbiwgc28gaXQgd29uJ3QgbWVzcyB3aXRoIEZyYW1lcnNcblx0XHRcdCMgbGF5ZXIgaGllcmFyY2h5LlxuXG5cdFx0XHRpZiBub3QgQF9lbGVtZW50SFRNTFxuXHRcdFx0XHRAX2VsZW1lbnRIVE1MID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCBcImRpdlwiXG5cdFx0XHRcdEBfZWxlbWVudC5hcHBlbmRDaGlsZCBAX2VsZW1lbnRIVE1MXG5cblx0XHRcdEBfZWxlbWVudEhUTUwuaW5uZXJIVE1MID0gdmFsdWVcblxuXHRcdFx0IyBJZiB0aGUgY29udGVudHMgY29udGFpbnMgc29tZXRoaW5nIGVsc2UgdGhhbiBwbGFpbiB0ZXh0XG5cdFx0XHQjIHRoZW4gd2UgdHVybiBvZmYgaWdub3JlRXZlbnRzIHNvIGJ1dHRvbnMgZXRjIHdpbGwgd29yay5cblxuXHRcdFx0aWYgbm90IChcblx0XHRcdFx0QF9lbGVtZW50SFRNTC5jaGlsZE5vZGVzLmxlbmd0aCA9PSAxIGFuZFxuXHRcdFx0XHRAX2VsZW1lbnRIVE1MLmNoaWxkTm9kZXNbMF0ubm9kZU5hbWUgPT0gXCIjdGV4dFwiKVxuXHRcdFx0XHRAaWdub3JlRXZlbnRzID0gZmFsc2VcblxuXHRcdFx0QGVtaXQgXCJjaGFuZ2U6aHRtbFwiXG5cblx0Y29tcHV0ZWRTdHlsZTogLT5cblx0XHRkb2N1bWVudC5kZWZhdWx0Vmlldy5nZXRDb21wdXRlZFN0eWxlIEBfZWxlbWVudFxuXG5cdF9zZXREZWZhdWx0Q1NTOiAtPlxuXHRcdEBzdHlsZSA9IENvbmZpZy5sYXllckJhc2VDU1NcblxuXHRAZGVmaW5lIFwiY2xhc3NMaXN0XCIsXG5cdFx0Z2V0OiAtPiBAX2VsZW1lbnQuY2xhc3NMaXN0XG5cblxuXHQjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXHQjIERPTSBFTEVNRU5UU1xuXG5cdF9jcmVhdGVFbGVtZW50OiAtPlxuXHRcdHJldHVybiBpZiBAX2VsZW1lbnQ/XG5cdFx0QF9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCBcImRpdlwiXG5cblx0X2luc2VydEVsZW1lbnQ6IC0+XG5cdFx0VXRpbHMuZG9tQ29tcGxldGUgQF9faW5zZXJ0RWxlbWVudFxuXG5cdF9fY3JlYXRlUm9vdEVsZW1lbnQ6ID0+XG5cdFx0ZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQgXCJkaXZcIlxuXHRcdGVsZW1lbnQuaWQgPSBcIkZyYW1lclJvb3RcIlxuXHRcdF8uZXh0ZW5kIGVsZW1lbnQuc3R5bGUsIENvbmZpZy5yb290QmFzZUNTU1xuXHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQgZWxlbWVudFxuXHRcdGVsZW1lbnRcblxuXHRfX2luc2VydEVsZW1lbnQ6ID0+XG5cdFx0U2Vzc2lvbi5fUm9vdEVsZW1lbnQgPz0gQF9fY3JlYXRlUm9vdEVsZW1lbnQoKVxuXHRcdFNlc3Npb24uX1Jvb3RFbGVtZW50LmFwcGVuZENoaWxkIEBfZWxlbWVudFxuXG5cdGRlc3Ryb3k6IC0+XG5cblx0XHRpZiBAc3VwZXJMYXllclxuXHRcdFx0QHN1cGVyTGF5ZXIuX3N1YkxheWVycyA9IF8ud2l0aG91dCBAc3VwZXJMYXllci5fc3ViTGF5ZXJzLCBAXG5cblx0XHRAX2VsZW1lbnQucGFyZW50Tm9kZT8ucmVtb3ZlQ2hpbGQgQF9lbGVtZW50XG5cdFx0QHJlbW92ZUFsbExpc3RlbmVycygpXG5cblx0XHRTZXNzaW9uLl9MYXllckxpc3QgPSBfLndpdGhvdXQgU2Vzc2lvbi5fTGF5ZXJMaXN0LCBAXG5cblxuXHQjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXHQjIyBDT1BZSU5HXG5cblx0Y29weTogLT5cblxuXHRcdCMgVG9kbzogd2hhdCBhYm91dCBldmVudHMsIHN0YXRlcywgZXRjLlxuXG5cdFx0bGF5ZXIgPSBAY29weVNpbmdsZSgpXG5cblx0XHRmb3Igc3ViTGF5ZXIgaW4gQHN1YkxheWVyc1xuXHRcdFx0Y29waWVkU3VibGF5ZXIgPSBzdWJMYXllci5jb3B5KClcblx0XHRcdGNvcGllZFN1YmxheWVyLnN1cGVyTGF5ZXIgPSBsYXllclxuXG5cdFx0bGF5ZXJcblxuXHRjb3B5U2luZ2xlOiAtPiBuZXcgTGF5ZXIgQHByb3BlcnRpZXNcblxuXHQjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXHQjIyBBTklNQVRJT05cblxuXHRhbmltYXRlOiAob3B0aW9ucykgLT5cblxuXHRcdG9wdGlvbnMubGF5ZXIgPSBAXG5cdFx0b3B0aW9ucy5jdXJ2ZU9wdGlvbnMgPSBvcHRpb25zXG5cblx0XHRhbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uIG9wdGlvbnNcblx0XHRhbmltYXRpb24uc3RhcnQoKVxuXG5cdFx0YW5pbWF0aW9uXG5cblx0IyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblx0IyMgSU1BR0VcblxuXHRAZGVmaW5lIFwiaW1hZ2VcIixcblx0XHRleHBvcnRhYmxlOiB0cnVlXG5cdFx0ZGVmYXVsdDogXCJcIlxuXHRcdGdldDogLT5cblx0XHRcdEBfZ2V0UHJvcGVydHlWYWx1ZSBcImltYWdlXCJcblx0XHRzZXQ6ICh2YWx1ZSkgLT5cblxuXHRcdFx0Y3VycmVudFZhbHVlID0gQF9nZXRQcm9wZXJ0eVZhbHVlIFwiaW1hZ2VcIlxuXG5cdFx0XHRpZiBjdXJyZW50VmFsdWUgPT0gdmFsdWVcblx0XHRcdFx0cmV0dXJuIEBlbWl0IFwibG9hZFwiXG5cblx0XHRcdCMgVG9kbzogdGhpcyBpcyBub3QgdmVyeSBuaWNlIGJ1dCBJIHdhbnRlZCB0byBoYXZlIGl0IGZpeGVkXG5cdFx0XHQjIGRlZmF1bHRzID0gRGVmYXVsdHMuZ2V0RGVmYXVsdHMgXCJMYXllclwiLCB7fVxuXG5cdFx0XHQjIGNvbnNvbGUubG9nIGRlZmF1bHRzLmJhY2tncm91bmRDb2xvclxuXHRcdFx0IyBjb25zb2xlLmxvZyBAX2RlZmF1bHRWYWx1ZXM/LmJhY2tncm91bmRDb2xvclxuXG5cdFx0XHQjIGlmIGRlZmF1bHRzLmJhY2tncm91bmRDb2xvciA9PSBAX2RlZmF1bHRWYWx1ZXM/LmJhY2tncm91bmRDb2xvclxuXHRcdFx0IyBcdEBiYWNrZ3JvdW5kQ29sb3IgPSBudWxsXG5cblx0XHRcdEBiYWNrZ3JvdW5kQ29sb3IgPSBudWxsXG5cblx0XHRcdCMgU2V0IHRoZSBwcm9wZXJ0eSB2YWx1ZVxuXHRcdFx0QF9zZXRQcm9wZXJ0eVZhbHVlIFwiaW1hZ2VcIiwgdmFsdWVcblxuXHRcdFx0aW1hZ2VVcmwgPSB2YWx1ZVxuXG5cdFx0XHQjIE9wdGlvbmFsIGJhc2UgaW1hZ2UgdmFsdWVcblx0XHRcdCMgaW1hZ2VVcmwgPSBDb25maWcuYmFzZVVybCArIGltYWdlVXJsXG5cblx0XHRcdCMgSWYgdGhlIGZpbGUgaXMgbG9jYWwsIHdlIHdhbnQgdG8gYXZvaWQgY2FjaGluZ1xuXHRcdFx0IyBpZiBVdGlscy5pc0xvY2FsKCkgYW5kIG5vdCAoXy5zdGFydHNXaXRoKGltYWdlVXJsLCBcImh0dHA6Ly9cIikgb3IgXy5zdGFydHNXaXRoKGltYWdlVXJsLCBcImh0dHBzOi8vXCIpKVxuXHRcdFx0aWYgVXRpbHMuaXNMb2NhbCgpIGFuZCBub3QgaW1hZ2VVcmwubWF0Y2goL15odHRwcz86XFwvXFwvLylcblx0XHRcdFx0aW1hZ2VVcmwgKz0gXCI/bm9jYWNoZT0je0RhdGUubm93KCl9XCJcblxuXHRcdFx0IyBBcyBhbiBvcHRpbWl6YXRpb24sIHdlIHdpbGwgb25seSB1c2UgYSBsb2FkZXJcblx0XHRcdCMgaWYgc29tZXRoaW5nIGlzIGV4cGxpY2l0bHkgbGlzdGVuaW5nIHRvIHRoZSBsb2FkIGV2ZW50XG5cblx0XHRcdGlmIEBldmVudHM/Lmhhc093blByb3BlcnR5IFwibG9hZFwiIG9yIEBldmVudHM/Lmhhc093blByb3BlcnR5IFwiZXJyb3JcIlxuXG5cdFx0XHRcdGxvYWRlciA9IG5ldyBJbWFnZSgpXG5cdFx0XHRcdGxvYWRlci5uYW1lID0gaW1hZ2VVcmxcblx0XHRcdFx0bG9hZGVyLnNyYyA9IGltYWdlVXJsXG5cblx0XHRcdFx0bG9hZGVyLm9ubG9hZCA9ID0+XG5cdFx0XHRcdFx0QHN0eWxlW1wiYmFja2dyb3VuZC1pbWFnZVwiXSA9IFwidXJsKCcje2ltYWdlVXJsfScpXCJcblx0XHRcdFx0XHRAZW1pdCBcImxvYWRcIiwgbG9hZGVyXG5cblx0XHRcdFx0bG9hZGVyLm9uZXJyb3IgPSA9PlxuXHRcdFx0XHRcdEBlbWl0IFwiZXJyb3JcIiwgbG9hZGVyXG5cblx0XHRcdGVsc2Vcblx0XHRcdFx0QHN0eWxlW1wiYmFja2dyb3VuZC1pbWFnZVwiXSA9IFwidXJsKCcje2ltYWdlVXJsfScpXCJcblxuXHQjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXHQjIyBISUVSQVJDSFlcblxuXHRAZGVmaW5lIFwic3VwZXJMYXllclwiLFxuXHRcdGV4cG9ydGFibGU6IGZhbHNlXG5cdFx0Z2V0OiAtPlxuXHRcdFx0QF9zdXBlckxheWVyIG9yIG51bGxcblx0XHRzZXQ6IChsYXllcikgLT5cblxuXHRcdFx0cmV0dXJuIGlmIGxheWVyIGlzIEBfc3VwZXJMYXllclxuXG5cdFx0XHQjIENoZWNrIHRoZSB0eXBlXG5cdFx0XHRpZiBub3QgbGF5ZXIgaW5zdGFuY2VvZiBMYXllclxuXHRcdFx0XHR0aHJvdyBFcnJvciBcIkxheWVyLnN1cGVyTGF5ZXIgbmVlZHMgdG8gYmUgYSBMYXllciBvYmplY3RcIlxuXG5cdFx0XHQjIENhbmNlbCBwcmV2aW91cyBwZW5kaW5nIGluc2VydGlvbnNcblx0XHRcdFV0aWxzLmRvbUNvbXBsZXRlQ2FuY2VsIEBfX2luc2VydEVsZW1lbnRcblxuXHRcdFx0IyBSZW1vdmUgZnJvbSBwcmV2aW91cyBzdXBlcmxheWVyIHN1YmxheWVyc1xuXHRcdFx0aWYgQF9zdXBlckxheWVyXG5cdFx0XHRcdEBfc3VwZXJMYXllci5fc3ViTGF5ZXJzID0gXy53aXRob3V0IEBfc3VwZXJMYXllci5fc3ViTGF5ZXJzLCBAXG5cdFx0XHRcdEBfc3VwZXJMYXllci5fZWxlbWVudC5yZW1vdmVDaGlsZCBAX2VsZW1lbnRcblx0XHRcdFx0QF9zdXBlckxheWVyLmVtaXQgXCJjaGFuZ2U6c3ViTGF5ZXJzXCIsIHthZGRlZDpbXSwgcmVtb3ZlZDpbQF19XG5cblx0XHRcdCMgRWl0aGVyIGluc2VydCB0aGUgZWxlbWVudCB0byB0aGUgbmV3IHN1cGVybGF5ZXIgZWxlbWVudCBvciBpbnRvIGRvbVxuXHRcdFx0aWYgbGF5ZXJcblx0XHRcdFx0bGF5ZXIuX2VsZW1lbnQuYXBwZW5kQ2hpbGQgQF9lbGVtZW50XG5cdFx0XHRcdGxheWVyLl9zdWJMYXllcnMucHVzaCBAXG5cdFx0XHRcdGxheWVyLmVtaXQgXCJjaGFuZ2U6c3ViTGF5ZXJzXCIsIHthZGRlZDpbQF0sIHJlbW92ZWQ6W119XG5cdFx0XHRlbHNlXG5cdFx0XHRcdEBfaW5zZXJ0RWxlbWVudCgpXG5cblx0XHRcdCMgU2V0IHRoZSBzdXBlcmxheWVyXG5cdFx0XHRAX3N1cGVyTGF5ZXIgPSBsYXllclxuXG5cdFx0XHQjIFBsYWNlIHRoaXMgbGF5ZXIgb24gdG9wIG9mIGl0cyBzaWJsaW5nc1xuXHRcdFx0QGJyaW5nVG9Gcm9udCgpXG5cblx0XHRcdEBlbWl0IFwiY2hhbmdlOnN1cGVyTGF5ZXJcIlxuXG5cdHN1cGVyTGF5ZXJzOiAtPlxuXG5cdFx0c3VwZXJMYXllcnMgPSBbXVxuXG5cdFx0cmVjdXJzZSA9IChsYXllcikgLT5cblx0XHRcdHJldHVybiBpZiBub3QgbGF5ZXIuc3VwZXJMYXllclxuXHRcdFx0c3VwZXJMYXllcnMucHVzaCBsYXllci5zdXBlckxheWVyXG5cdFx0XHRyZWN1cnNlIGxheWVyLnN1cGVyTGF5ZXJcblxuXHRcdHJlY3Vyc2UgQFxuXG5cdFx0c3VwZXJMYXllcnNcblxuXHQjIFRvZG86IHNob3VsZCB3ZSBoYXZlIGEgcmVjdXJzaXZlIHN1YkxheWVycyBmdW5jdGlvbj9cblx0IyBMZXQncyBtYWtlIGl0IHdoZW4gd2UgbmVlZCBpdC5cblxuXHRAZGVmaW5lIFwic3ViTGF5ZXJzXCIsXG5cdFx0ZXhwb3J0YWJsZTogZmFsc2Vcblx0XHRnZXQ6IC0+IF8uY2xvbmUgQF9zdWJMYXllcnNcblxuXHRAZGVmaW5lIFwic2libGluZ0xheWVyc1wiLFxuXHRcdGV4cG9ydGFibGU6IGZhbHNlXG5cdFx0Z2V0OiAtPlxuXG5cdFx0XHQjIElmIHRoZXJlIGlzIG5vIHN1cGVyTGF5ZXIgd2UgbmVlZCB0byB3YWxrIHRocm91Z2ggdGhlIHJvb3Rcblx0XHRcdGlmIEBzdXBlckxheWVyIGlzIG51bGxcblx0XHRcdFx0cmV0dXJuIF8uZmlsdGVyIFNlc3Npb24uX0xheWVyTGlzdCwgKGxheWVyKSA9PlxuXHRcdFx0XHRcdGxheWVyIGlzbnQgQCBhbmQgbGF5ZXIuc3VwZXJMYXllciBpcyBudWxsXG5cblx0XHRcdHJldHVybiBfLndpdGhvdXQgQHN1cGVyTGF5ZXIuc3ViTGF5ZXJzLCBAXG5cblx0YWRkU3ViTGF5ZXI6IChsYXllcikgLT5cblx0XHRsYXllci5zdXBlckxheWVyID0gQFxuXG5cdHJlbW92ZVN1YkxheWVyOiAobGF5ZXIpIC0+XG5cblx0XHRpZiBsYXllciBub3QgaW4gQHN1YkxheWVyc1xuXHRcdFx0cmV0dXJuXG5cblx0XHRsYXllci5zdXBlckxheWVyID0gbnVsbFxuXG5cdHN1YkxheWVyc0J5TmFtZTogKG5hbWUpIC0+XG5cdFx0Xy5maWx0ZXIgQHN1YkxheWVycywgKGxheWVyKSAtPiBsYXllci5uYW1lID09IG5hbWVcblxuXHQjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXHQjIyBBTklNQVRJT05cblxuXHRhbmltYXRlOiAob3B0aW9ucykgLT5cblxuXHRcdHN0YXJ0ID0gb3B0aW9ucy5zdGFydFxuXHRcdHN0YXJ0ID89IHRydWVcblx0XHRkZWxldGUgb3B0aW9ucy5zdGFydFxuXG5cdFx0b3B0aW9ucy5sYXllciA9IEBcblx0XHRhbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uIG9wdGlvbnNcblx0XHRhbmltYXRpb24uc3RhcnQoKSBpZiBzdGFydFxuXHRcdGFuaW1hdGlvblxuXG5cdGFuaW1hdGlvbnM6IC0+XG5cdFx0IyBDdXJyZW50IHJ1bm5pbmcgYW5pbWF0aW9ucyBvbiB0aGlzIGxheWVyXG5cdFx0Xy5maWx0ZXIgQW5pbWF0aW9uLnJ1bm5pbmdBbmltYXRpb25zKCksIChhKSA9PlxuXHRcdFx0YS5vcHRpb25zLmxheWVyID09IEBcblxuXHRhbmltYXRlU3RvcDogLT5cblx0XHRfLmludm9rZSBAYW5pbWF0aW9ucygpLCBcInN0b3BcIlxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMjIElOREVYIE9SREVSSU5HXG5cblx0YnJpbmdUb0Zyb250OiAtPlxuXHRcdEBpbmRleCA9IF8ubWF4KF8udW5pb24oWzBdLCBAc2libGluZ0xheWVycy5tYXAgKGxheWVyKSAtPiBsYXllci5pbmRleCkpICsgMVxuXG5cdHNlbmRUb0JhY2s6IC0+XG5cdFx0QGluZGV4ID0gXy5taW4oXy51bmlvbihbMF0sIEBzaWJsaW5nTGF5ZXJzLm1hcCAobGF5ZXIpIC0+IGxheWVyLmluZGV4KSkgLSAxXG5cblx0cGxhY2VCZWZvcmU6IChsYXllcikgLT5cblx0XHRyZXR1cm4gaWYgbGF5ZXIgbm90IGluIEBzaWJsaW5nTGF5ZXJzXG5cblx0XHRmb3IgbCBpbiBAc2libGluZ0xheWVyc1xuXHRcdFx0aWYgbC5pbmRleCA8PSBsYXllci5pbmRleFxuXHRcdFx0XHRsLmluZGV4IC09IDFcblxuXHRcdEBpbmRleCA9IGxheWVyLmluZGV4ICsgMVxuXG5cdHBsYWNlQmVoaW5kOiAobGF5ZXIpIC0+XG5cdFx0cmV0dXJuIGlmIGxheWVyIG5vdCBpbiBAc2libGluZ0xheWVyc1xuXG5cdFx0Zm9yIGwgaW4gQHNpYmxpbmdMYXllcnNcblx0XHRcdGlmIGwuaW5kZXggPj0gbGF5ZXIuaW5kZXhcblx0XHRcdFx0bC5pbmRleCArPSAxXG5cblx0XHRAaW5kZXggPSBsYXllci5pbmRleCAtIDFcblxuXHQjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXHQjIyBTVEFURVNcblxuXHRAZGVmaW5lIFwic3RhdGVzXCIsXG5cdFx0Z2V0OiAtPiBAX3N0YXRlcyA/PSBuZXcgTGF5ZXJTdGF0ZXMgQFxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMjIERyYWdnYWJsZVxuXG5cdEBkZWZpbmUgXCJkcmFnZ2FibGVcIixcblx0XHRnZXQ6IC0+XG5cdFx0XHRAX2RyYWdnYWJsZSA/PSBuZXcgTGF5ZXJEcmFnZ2FibGUgQFxuXHRcdFx0QF9kcmFnZ2FibGVcblxuXHQjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXHQjIyBTQ1JPTExJTkdcblxuXHQjIFRPRE86IFRlc3RzXG5cblx0QGRlZmluZSBcInNjcm9sbEZyYW1lXCIsXG5cdFx0Z2V0OiAtPlxuXHRcdFx0cmV0dXJuIG5ldyBGcmFtZVxuXHRcdFx0XHR4OiBAc2Nyb2xsWFxuXHRcdFx0XHR5OiBAc2Nyb2xsWVxuXHRcdFx0XHR3aWR0aDogQHdpZHRoXG5cdFx0XHRcdGhlaWdodDogQGhlaWdodFxuXHRcdHNldDogKGZyYW1lKSAtPlxuXHRcdFx0QHNjcm9sbFggPSBmcmFtZS54XG5cdFx0XHRAc2Nyb2xsWSA9IGZyYW1lLnlcblxuXHRAZGVmaW5lIFwic2Nyb2xsWFwiLFxuXHRcdGdldDogLT4gQF9lbGVtZW50LnNjcm9sbExlZnRcblx0XHRzZXQ6ICh2YWx1ZSkgLT4gQF9lbGVtZW50LnNjcm9sbExlZnQgPSB2YWx1ZVxuXG5cdEBkZWZpbmUgXCJzY3JvbGxZXCIsXG5cdFx0Z2V0OiAtPiBAX2VsZW1lbnQuc2Nyb2xsVG9wXG5cdFx0c2V0OiAodmFsdWUpIC0+IEBfZWxlbWVudC5zY3JvbGxUb3AgPSB2YWx1ZVxuXG5cdCMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cdCMjIEVWRU5UU1xuXG5cdGFkZExpc3RlbmVyOiAoZXZlbnROYW1lLCBvcmlnaW5hbExpc3RlbmVyKSA9PlxuXG5cdFx0IyAjIE1vZGlmeSB0aGUgc2NvcGUgdG8gYmUgdGhlIGNhbGxpbmcgb2JqZWN0LCBqdXN0IGxpa2UganF1ZXJ5XG5cdFx0IyAjIGFsc28gYWRkIHRoZSBvYmplY3QgYXMgdGhlIGxhc3QgYXJndW1lbnRcblx0XHRsaXN0ZW5lciA9IChhcmdzLi4uKSA9PlxuXHRcdFx0b3JpZ2luYWxMaXN0ZW5lci5jYWxsIEAsIGFyZ3MuLi4sIEBcblxuXHRcdCMgQmVjYXVzZSB3ZSBtb2RpZnkgdGhlIGxpc3RlbmVyIHdlIG5lZWQgdG8ga2VlcCB0cmFjayBvZiBpdFxuXHRcdCMgc28gd2UgY2FuIGZpbmQgaXQgYmFjayB3aGVuIHdlIHdhbnQgdG8gdW5saXN0ZW4gYWdhaW5cblx0XHRvcmlnaW5hbExpc3RlbmVyLm1vZGlmaWVkTGlzdGVuZXIgPSBsaXN0ZW5lclxuXG5cdFx0IyBMaXN0ZW4gdG8gZG9tIGV2ZW50cyBvbiB0aGUgZWxlbWVudFxuXHRcdHN1cGVyIGV2ZW50TmFtZSwgbGlzdGVuZXJcblx0XHRAX2VsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lciBldmVudE5hbWUsIGxpc3RlbmVyXG5cblx0XHRAX2V2ZW50TGlzdGVuZXJzID89IHt9XG5cdFx0QF9ldmVudExpc3RlbmVyc1tldmVudE5hbWVdID89IFtdXG5cdFx0QF9ldmVudExpc3RlbmVyc1tldmVudE5hbWVdLnB1c2ggbGlzdGVuZXJcblxuXHRcdCMgV2Ugd2FudCB0byBtYWtlIHN1cmUgd2UgbGlzdGVuIHRvIHRoZXNlIGV2ZW50cywgYnV0IHdlIGNhbiBzYWZlbHlcblx0XHQjIGlnbm9yZSBpdCBmb3IgY2hhbmdlIGV2ZW50c1xuXHRcdGlmIG5vdCBfLnN0YXJ0c1dpdGggZXZlbnROYW1lLCBcImNoYW5nZTpcIlxuXHRcdFx0QGlnbm9yZUV2ZW50cyA9IGZhbHNlXG5cblx0cmVtb3ZlTGlzdGVuZXI6IChldmVudE5hbWUsIGxpc3RlbmVyKSAtPlxuXG5cdFx0IyBJZiB0aGUgb3JpZ2luYWwgbGlzdGVuZXIgd2FzIG1vZGlmaWVkLCByZW1vdmUgdGhhdFxuXHRcdCMgb25lIGluc3RlYWRcblx0XHRpZiBsaXN0ZW5lci5tb2RpZmllZExpc3RlbmVyXG5cdFx0XHRsaXN0ZW5lciA9IGxpc3RlbmVyLm1vZGlmaWVkTGlzdGVuZXJcblxuXHRcdHN1cGVyIGV2ZW50TmFtZSwgbGlzdGVuZXJcblx0XHRcblx0XHRAX2VsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lciBldmVudE5hbWUsIGxpc3RlbmVyXG5cblx0XHRpZiBAX2V2ZW50TGlzdGVuZXJzXG5cdFx0XHRAX2V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0gPSBfLndpdGhvdXQgQF9ldmVudExpc3RlbmVyc1tldmVudE5hbWVdLCBsaXN0ZW5lclxuXG5cdHJlbW92ZUFsbExpc3RlbmVyczogLT5cblxuXHRcdHJldHVybiBpZiBub3QgQF9ldmVudExpc3RlbmVyc1xuXG5cdFx0Zm9yIGV2ZW50TmFtZSwgbGlzdGVuZXJzIG9mIEBfZXZlbnRMaXN0ZW5lcnNcblx0XHRcdGZvciBsaXN0ZW5lciBpbiBsaXN0ZW5lcnNcblx0XHRcdFx0QHJlbW92ZUxpc3RlbmVyIGV2ZW50TmFtZSwgbGlzdGVuZXJcblxuXHRvbjogQDo6YWRkTGlzdGVuZXJcblx0b2ZmOiBAOjpyZW1vdmVMaXN0ZW5lclxuXG5leHBvcnRzLkxheWVyLkxheWVycyA9IC0+IF8uY2xvbmUgU2Vzc2lvbi5fTGF5ZXJMaXN0XG4iLCJ7X30gPSByZXF1aXJlIFwiLi9VbmRlcnNjb3JlXCJcblxuVXRpbHMgPSByZXF1aXJlIFwiLi9VdGlsc1wiXG57RXZlbnRFbWl0dGVyfSA9IHJlcXVpcmUgXCIuL0V2ZW50RW1pdHRlclwiXG57RXZlbnRzfSA9IHJlcXVpcmUgXCIuL0V2ZW50c1wiXG5cbiMgQWRkIHNwZWNpZmljIGV2ZW50cyBmb3IgZHJhZ2dhYmxlXG5FdmVudHMuRHJhZ1N0YXJ0ID0gXCJkcmFnc3RhcnRcIlxuRXZlbnRzLkRyYWdNb3ZlID0gXCJkcmFnbW92ZVwiXG5FdmVudHMuRHJhZ0VuZCA9IFwiZHJhZ2VuZFwiXG5cblwiXCJcIlxuVGhpcyB0YWtlcyBhbnkgbGF5ZXIgYW5kIG1ha2VzIGl0IGRyYWdnYWJsZSBieSB0aGUgdXNlciBvbiBtb2JpbGUgb3IgZGVza3RvcC5cblxuU29tZSBpbnRlcmVzdGluZyB0aGluZ3MgYXJlOlxuXG4tIFRoZSBkcmFnZ2FibGUuY2FsY3VsYXRlVmVsb2NpdHkoKS54fHkgY29udGFpbnMgdGhlIGN1cnJlbnQgYXZlcmFnZSBzcGVlZCBcbiAgaW4gdGhlIGxhc3QgMTAwbXMgKGRlZmluZWQgd2l0aCBWZWxvY2l0eVRpbWVPdXQpLlxuLSBZb3UgY2FuIGVuYWJsZS9kaXNhYmxlIG9yIHNsb3dkb3duL3NwZWVkdXAgc2Nyb2xsaW5nIHdpdGhcbiAgZHJhZ2dhYmxlLnNwZWVkLnh8eVxuXG5cIlwiXCJcblxuY2xhc3MgZXhwb3J0cy5MYXllckRyYWdnYWJsZSBleHRlbmRzIEV2ZW50RW1pdHRlclxuXG5cdEBWZWxvY2l0eVRpbWVPdXQgPSAxMDBcblxuXHRjb25zdHJ1Y3RvcjogKEBsYXllcikgLT5cblxuXHRcdEBfZGVsdGFzID0gW11cblx0XHRAX2lzRHJhZ2dpbmcgPSBmYWxzZVxuXG5cdFx0QGVuYWJsZWQgPSB0cnVlXG5cdFx0QHNwZWVkWCA9IDEuMFxuXHRcdEBzcGVlZFkgPSAxLjBcblx0XHRcblx0XHRAbWF4RHJhZ0ZyYW1lID0gbnVsbFxuXG5cdFx0IyBAcmVzaXN0YW5jZVBvaW50WCA9IG51bGxcblx0XHQjIEByZXNpc3RhbmNlUG9pbnRZID0gbnVsbFxuXHRcdCMgQHJlc2lzdGFuY2VEaXN0YW5jZSA9IG51bGxcblxuXHRcdEBhdHRhY2goKVxuXG5cdGF0dGFjaDogLT4gQGxheWVyLm9uICBFdmVudHMuVG91Y2hTdGFydCwgQF90b3VjaFN0YXJ0XG5cdHJlbW92ZTogLT4gQGxheWVyLm9mZiBFdmVudHMuVG91Y2hTdGFydCwgQF90b3VjaFN0YXJ0XG5cblx0ZW1pdDogKGV2ZW50TmFtZSwgZXZlbnQpIC0+XG5cdFx0IyBXZSBvdmVycmlkZSB0aGlzIHRvIGdldCBhbGwgZXZlbnRzIGJvdGggb24gdGhlIGRyYWdnYWJsZVxuXHRcdCMgYW5kIHRoZSBlbmNhcHN1bGF0ZWQgbGF5ZXIuXG5cdFx0QGxheWVyLmVtaXQgZXZlbnROYW1lLCBldmVudFxuXG5cdFx0c3VwZXIgZXZlbnROYW1lLCBldmVudFxuXG5cblx0Y2FsY3VsYXRlVmVsb2NpdHk6IC0+XG5cblx0XHRpZiBAX2RlbHRhcy5sZW5ndGggPCAyXG5cdFx0XHRyZXR1cm4ge3g6MCwgeTowfVxuXG5cdFx0Y3VyciA9IEBfZGVsdGFzWy0xLi4tMV1bMF1cblx0XHRwcmV2ID0gQF9kZWx0YXNbLTIuLi0yXVswXVxuXHRcdHRpbWUgPSBjdXJyLnQgLSBwcmV2LnRcblxuXHRcdCMgQmFpbCBvdXQgaWYgdGhlIGxhc3QgbW92ZSB1cGRhdGVzIHdoZXJlIGEgd2hpbGUgYWdvXG5cdFx0dGltZVNpbmNlTGFzdE1vdmUgPSAobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBwcmV2LnQpXG5cblx0XHRpZiB0aW1lU2luY2VMYXN0TW92ZSA+IEBWZWxvY2l0eVRpbWVPdXRcblx0XHRcdHJldHVybiB7eDowLCB5OjB9XG5cblx0XHR2ZWxvY2l0eSA9XG5cdFx0XHR4OiAoY3Vyci54IC0gcHJldi54KSAvIHRpbWVcblx0XHRcdHk6IChjdXJyLnkgLSBwcmV2LnkpIC8gdGltZVxuXG5cdFx0dmVsb2NpdHkueCA9IDAgaWYgdmVsb2NpdHkueCBpcyBJbmZpbml0eVxuXHRcdHZlbG9jaXR5LnkgPSAwIGlmIHZlbG9jaXR5LnkgaXMgSW5maW5pdHlcblxuXHRcdHZlbG9jaXR5XG5cblx0X3VwZGF0ZVBvc2l0aW9uOiAoZXZlbnQpID0+XG5cblx0XHRpZiBAZW5hYmxlZCBpcyBmYWxzZVxuXHRcdFx0cmV0dXJuXG5cblx0XHRAZW1pdCBFdmVudHMuRHJhZ01vdmUsIGV2ZW50XG5cblx0XHR0b3VjaEV2ZW50ID0gRXZlbnRzLnRvdWNoRXZlbnQgZXZlbnRcblxuXHRcdGRlbHRhID1cblx0XHRcdHg6IHRvdWNoRXZlbnQuY2xpZW50WCAtIEBfc3RhcnQueFxuXHRcdFx0eTogdG91Y2hFdmVudC5jbGllbnRZIC0gQF9zdGFydC55XG5cblx0XHQjIENvcnJlY3QgZm9yIGN1cnJlbnQgZHJhZyBzcGVlZFxuXHRcdGNvcnJlY3RlZERlbHRhID1cblx0XHRcdHg6IGRlbHRhLnggKiBAc3BlZWRYXG5cdFx0XHR5OiBkZWx0YS55ICogQHNwZWVkWVxuXHRcdFx0dDogZXZlbnQudGltZVN0YW1wXG5cblx0XHRuZXdYID0gQF9zdGFydC54ICsgY29ycmVjdGVkRGVsdGEueCAtIEBfb2Zmc2V0Lnhcblx0XHRuZXdZID0gQF9zdGFydC55ICsgY29ycmVjdGVkRGVsdGEueSAtIEBfb2Zmc2V0LnlcblxuXHRcdGlmIEBtYXhEcmFnRnJhbWVcblxuXHRcdFx0bWF4RHJhZ0ZyYW1lID0gQG1heERyYWdGcmFtZVxuXHRcdFx0bWF4RHJhZ0ZyYW1lID0gbWF4RHJhZ0ZyYW1lKCkgaWYgXy5pc0Z1bmN0aW9uIG1heERyYWdGcmFtZVxuXG5cdFx0XHRtaW5YID0gVXRpbHMuZnJhbWVHZXRNaW5YKEBtYXhEcmFnRnJhbWUpXG5cdFx0XHRtYXhYID0gVXRpbHMuZnJhbWVHZXRNYXhYKEBtYXhEcmFnRnJhbWUpIC0gQGxheWVyLndpZHRoXG5cdFx0XHRtaW5ZID0gVXRpbHMuZnJhbWVHZXRNaW5ZKEBtYXhEcmFnRnJhbWUpXG5cdFx0XHRtYXhZID0gVXRpbHMuZnJhbWVHZXRNYXhZKEBtYXhEcmFnRnJhbWUpIC0gQGxheWVyLmhlaWdodFxuXG5cdFx0XHRuZXdYID0gbWluWCBpZiBuZXdYIDwgbWluWFxuXHRcdFx0bmV3WCA9IG1heFggaWYgbmV3WCA+IG1heFhcblx0XHRcdG5ld1kgPSBtaW5ZIGlmIG5ld1kgPCBtaW5ZXG5cdFx0XHRuZXdZID0gbWF4WSBpZiBuZXdZID4gbWF4WVxuXG5cblx0XHQjIFdlIHVzZSB0aGUgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHRvIHVwZGF0ZSB0aGUgcG9zaXRpb25cblx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0+XG5cdFx0XHRAbGF5ZXIueCA9IG5ld1hcblx0XHRcdEBsYXllci55ID0gbmV3WVxuXG5cdFx0QF9kZWx0YXMucHVzaCBjb3JyZWN0ZWREZWx0YVxuXG5cdFx0QGVtaXQgRXZlbnRzLkRyYWdNb3ZlLCBldmVudFxuXG5cdF90b3VjaFN0YXJ0OiAoZXZlbnQpID0+XG5cblx0XHRAbGF5ZXIuYW5pbWF0ZVN0b3AoKVxuXG5cdFx0QF9pc0RyYWdnaW5nID0gdHJ1ZVxuXG5cdFx0dG91Y2hFdmVudCA9IEV2ZW50cy50b3VjaEV2ZW50IGV2ZW50XG5cblx0XHRAX3N0YXJ0ID1cblx0XHRcdHg6IHRvdWNoRXZlbnQuY2xpZW50WFxuXHRcdFx0eTogdG91Y2hFdmVudC5jbGllbnRZXG5cblx0XHRAX29mZnNldCA9XG5cdFx0XHR4OiB0b3VjaEV2ZW50LmNsaWVudFggLSBAbGF5ZXIueFxuXHRcdFx0eTogdG91Y2hFdmVudC5jbGllbnRZIC0gQGxheWVyLnlcblxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIgRXZlbnRzLlRvdWNoTW92ZSwgQF91cGRhdGVQb3NpdGlvblxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIgRXZlbnRzLlRvdWNoRW5kLCBAX3RvdWNoRW5kXG5cblx0XHRAZW1pdCBFdmVudHMuRHJhZ1N0YXJ0LCBldmVudFxuXG5cdF90b3VjaEVuZDogKGV2ZW50KSA9PlxuXG5cdFx0QF9pc0RyYWdnaW5nID0gZmFsc2VcblxuXHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIgRXZlbnRzLlRvdWNoTW92ZSwgQF91cGRhdGVQb3NpdGlvblxuXHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIgRXZlbnRzLlRvdWNoRW5kLCBAX3RvdWNoRW5kXG5cblx0XHRAZW1pdCBFdmVudHMuRHJhZ0VuZCwgZXZlbnRcblxuXHRcdEBfZGVsdGFzID0gW10iLCJ7X30gPSByZXF1aXJlIFwiLi9VbmRlcnNjb3JlXCJcblxue0V2ZW50c30gPSByZXF1aXJlIFwiLi9FdmVudHNcIlxue0Jhc2VDbGFzc30gPSByZXF1aXJlIFwiLi9CYXNlQ2xhc3NcIlxue0RlZmF1bHRzfSA9IHJlcXVpcmUgXCIuL0RlZmF1bHRzXCJcblxuTGF5ZXJTdGF0ZXNJZ25vcmVkS2V5cyA9IFtcImlnbm9yZUV2ZW50c1wiXVxuXG4jIEFuaW1hdGlvbiBldmVudHNcbkV2ZW50cy5TdGF0ZVdpbGxTd2l0Y2ggPSBcIndpbGxTd2l0Y2hcIlxuRXZlbnRzLlN0YXRlRGlkU3dpdGNoID0gXCJkaWRTd2l0Y2hcIlxuXG5jbGFzcyBleHBvcnRzLkxheWVyU3RhdGVzIGV4dGVuZHMgQmFzZUNsYXNzXG5cblx0Y29uc3RydWN0b3I6IChAbGF5ZXIpIC0+XG5cblx0XHRAX3N0YXRlcyA9IHt9XG5cdFx0QF9vcmRlcmVkU3RhdGVzID0gW11cblxuXHRcdEBhbmltYXRpb25PcHRpb25zID0ge31cblxuXHRcdCMgQWx3YXlzIGFkZCB0aGUgZGVmYXVsdCBzdGF0ZSBhcyB0aGUgY3VycmVudFxuXHRcdEBhZGQgXCJkZWZhdWx0XCIsIEBsYXllci5wcm9wZXJ0aWVzXG5cblx0XHRAX2N1cnJlbnRTdGF0ZSA9IFwiZGVmYXVsdFwiXG5cdFx0QF9wcmV2aW91c1N0YXRlcyA9IFtdXG5cblx0XHRzdXBlclxuXG5cdGFkZDogKHN0YXRlTmFtZSwgcHJvcGVydGllcykgLT5cblxuXHRcdCMgV2UgYWxzbyBhbGxvdyBhbiBvYmplY3Qgd2l0aCBzdGF0ZXMgdG8gYmUgcGFzc2VkIGluXG5cdFx0IyBsaWtlOiBsYXllci5zdGF0ZXMuYWRkKHtzdGF0ZUE6IHsuLi59LCBzdGF0ZUI6IHsuLi59fSlcblx0XHRpZiBfLmlzT2JqZWN0IHN0YXRlTmFtZVxuXHRcdFx0Zm9yIGssIHYgb2Ygc3RhdGVOYW1lXG5cdFx0XHRcdEBhZGQgaywgdlxuXHRcdFx0cmV0dXJuXG5cblx0XHRlcnJvciA9IC0+IHRocm93IEVycm9yIFwiVXNhZ2UgZXhhbXBsZTogbGF5ZXIuc3RhdGVzLmFkZChcXFwic29tZU5hbWVcXFwiLCB7eDo1MDB9KVwiXG5cdFx0ZXJyb3IoKSBpZiBub3QgXy5pc1N0cmluZyBzdGF0ZU5hbWVcblx0XHRlcnJvcigpIGlmIG5vdCBfLmlzT2JqZWN0IHByb3BlcnRpZXNcblxuXHRcdCMgQWRkIGEgc3RhdGUgd2l0aCBhIG5hbWUgYW5kIHByb3BlcnRpZXNcblx0XHRAX29yZGVyZWRTdGF0ZXMucHVzaCBzdGF0ZU5hbWVcblx0XHRAX3N0YXRlc1tzdGF0ZU5hbWVdID0gcHJvcGVydGllc1xuXG5cdHJlbW92ZTogKHN0YXRlTmFtZSkgLT5cblxuXHRcdGlmIG5vdCBAX3N0YXRlcy5oYXNPd25Qcm9wZXJ0eSBzdGF0ZU5hbWVcblx0XHRcdHJldHVyblxuXG5cdFx0ZGVsZXRlIEBfc3RhdGVzW3N0YXRlTmFtZV1cblx0XHRAX29yZGVyZWRTdGF0ZXMgPSBfLndpdGhvdXQgQF9vcmRlcmVkU3RhdGVzLCBzdGF0ZU5hbWVcblxuXHRzd2l0Y2g6IChzdGF0ZU5hbWUsIGFuaW1hdGlvbk9wdGlvbnMsIGluc3RhbnQ9ZmFsc2UpIC0+XG5cblx0XHQjIFN3aXRjaGVzIHRvIGEgc3BlY2lmaWMgc3RhdGUuIElmIGFuaW1hdGlvbk9wdGlvbnMgYXJlXG5cdFx0IyBnaXZlbiB1c2UgdGhvc2UsIG90aGVyd2lzZSB0aGUgZGVmYXVsdCBvcHRpb25zLlxuXG5cdFx0IyBXZSBhY3R1YWxseSBkbyB3YW50IHRvIGFsbG93IHRoaXMuIEEgc3RhdGUgY2FuIGJlIHNldCB0byBzb21ldGhpbmdcblx0XHQjIHRoYXQgZG9lcyBub3QgZXF1YWwgdGhlIHByb3BlcnR5IHZhbHVlcyBmb3IgdGhhdCBzdGF0ZS5cblxuXHRcdCMgaWYgc3RhdGVOYW1lIGlzIEBfY3VycmVudFN0YXRlXG5cdFx0IyBcdHJldHVyblxuXG5cdFx0aWYgbm90IEBfc3RhdGVzLmhhc093blByb3BlcnR5IHN0YXRlTmFtZVxuXHRcdFx0dGhyb3cgRXJyb3IgXCJObyBzdWNoIHN0YXRlOiAnI3tzdGF0ZU5hbWV9J1wiXG5cblx0XHRAZW1pdCBFdmVudHMuU3RhdGVXaWxsU3dpdGNoLCBAX2N1cnJlbnRTdGF0ZSwgc3RhdGVOYW1lLCBAXG5cblx0XHRAX3ByZXZpb3VzU3RhdGVzLnB1c2ggQF9jdXJyZW50U3RhdGVcblx0XHRAX2N1cnJlbnRTdGF0ZSA9IHN0YXRlTmFtZVxuXG5cdFx0cHJvcGVydGllcyA9IHt9XG5cdFx0YW5pbWF0aW5nS2V5cyA9IEBhbmltYXRpbmdLZXlzKClcblxuXHRcdGZvciBwcm9wZXJ0eU5hbWUsIHZhbHVlIG9mIEBfc3RhdGVzW3N0YXRlTmFtZV1cblxuXHRcdFx0IyBEb24ndCBhbmltYXRlIGlnbm9yZWQgcHJvcGVydGllc1xuXHRcdFx0aWYgcHJvcGVydHlOYW1lIGluIExheWVyU3RhdGVzSWdub3JlZEtleXNcblx0XHRcdFx0Y29udGludWVcblxuXHRcdFx0aWYgcHJvcGVydHlOYW1lIG5vdCBpbiBhbmltYXRpbmdLZXlzXG5cdFx0XHRcdGNvbnRpbnVlXG5cblx0XHRcdCMgQWxsb3cgZHluYW1pYyBwcm9wZXJ0aWVzIGFzIGZ1bmN0aW9uc1xuXHRcdFx0dmFsdWUgPSB2YWx1ZS5jYWxsKEBsYXllciwgQGxheWVyLCBzdGF0ZU5hbWUpIGlmIF8uaXNGdW5jdGlvbih2YWx1ZSlcblxuXHRcdFx0IyBTZXQgdGhlIG5ldyB2YWx1ZSBcblx0XHRcdHByb3BlcnRpZXNbcHJvcGVydHlOYW1lXSA9IHZhbHVlXG5cblx0XHRpZiBpbnN0YW50IGlzIHRydWVcblx0XHRcdCMgV2Ugd2FudCB0byBzd2l0Y2ggaW1tZWRpYXRlbHkgd2l0aG91dCBhbmltYXRpb25cblx0XHRcdEBsYXllci5wcm9wZXJ0aWVzID0gcHJvcGVydGllc1xuXHRcdFx0QGVtaXQgRXZlbnRzLlN0YXRlRGlkU3dpdGNoLCBfLmxhc3QoQF9wcmV2aW91c1N0YXRlcyksIHN0YXRlTmFtZSwgQFxuXG5cdFx0ZWxzZVxuXHRcdFx0IyBTdGFydCB0aGUgYW5pbWF0aW9uIGFuZCB1cGRhdGUgdGhlIHN0YXRlIHdoZW4gZmluaXNoZWRcblx0XHRcdGFuaW1hdGlvbk9wdGlvbnMgPz0gQGFuaW1hdGlvbk9wdGlvbnNcblx0XHRcdGFuaW1hdGlvbk9wdGlvbnMucHJvcGVydGllcyA9IHByb3BlcnRpZXNcblxuXHRcdFx0QF9hbmltYXRpb24gPSBAbGF5ZXIuYW5pbWF0ZSBhbmltYXRpb25PcHRpb25zXG5cdFx0XHRAX2FuaW1hdGlvbi5vbiBcInN0b3BcIiwgPT4gXG5cdFx0XHRcdEBlbWl0IEV2ZW50cy5TdGF0ZURpZFN3aXRjaCwgXy5sYXN0KEBfcHJldmlvdXNTdGF0ZXMpLCBzdGF0ZU5hbWUsIEBcblxuXG5cdHN3aXRjaEluc3RhbnQ6IChzdGF0ZU5hbWUpIC0+XG5cdFx0QHN3aXRjaCBzdGF0ZU5hbWUsIG51bGwsIHRydWVcblxuXHRAZGVmaW5lIFwic3RhdGVcIiwgZ2V0OiAtPiBAX2N1cnJlbnRTdGF0ZVxuXHRAZGVmaW5lIFwiY3VycmVudFwiLCBnZXQ6IC0+IEBfY3VycmVudFN0YXRlXG5cblx0c3RhdGVzOiAtPlxuXHRcdCMgUmV0dXJuIGEgbGlzdCBvZiBhbGwgdGhlIHBvc3NpYmxlIHN0YXRlc1xuXHRcdF8uY2xvbmUgQF9vcmRlcmVkU3RhdGVzXG5cblx0YW5pbWF0aW5nS2V5czogLT5cblxuXHRcdGtleXMgPSBbXVxuXG5cdFx0Zm9yIHN0YXRlTmFtZSwgc3RhdGUgb2YgQF9zdGF0ZXNcblx0XHRcdGNvbnRpbnVlIGlmIHN0YXRlTmFtZSBpcyBcImRlZmF1bHRcIlxuXHRcdFx0a2V5cyA9IF8udW5pb24ga2V5cywgXy5rZXlzIHN0YXRlXG5cblx0XHRrZXlzXG5cblx0cHJldmlvdXM6IChzdGF0ZXMsIGFuaW1hdGlvbk9wdGlvbnMpIC0+XG5cdFx0IyBHbyB0byBwcmV2aW91cyBzdGF0ZSBpbiBsaXN0XG5cdFx0c3RhdGVzID89IEBzdGF0ZXMoKVxuXHRcdEBzd2l0Y2ggVXRpbHMuYXJyYXlQcmV2KHN0YXRlcywgQF9jdXJyZW50U3RhdGUpLCBhbmltYXRpb25PcHRpb25zXG5cblx0bmV4dDogIC0+XG5cdFx0IyBUT0RPOiBtYXliZSBhZGQgYW5pbWF0aW9uT3B0aW9uc1xuXHRcdHN0YXRlcyA9IFV0aWxzLmFycmF5RnJvbUFyZ3VtZW50cyBhcmd1bWVudHNcblxuXHRcdGlmIG5vdCBzdGF0ZXMubGVuZ3RoXG5cdFx0XHRzdGF0ZXMgPSBAc3RhdGVzKClcblxuXHRcdEBzd2l0Y2ggVXRpbHMuYXJyYXlOZXh0KHN0YXRlcywgQF9jdXJyZW50U3RhdGUpXG5cblxuXHRsYXN0OiAoYW5pbWF0aW9uT3B0aW9ucykgLT5cblx0XHQjIFJldHVybiB0byBsYXN0IHN0YXRlXG5cdFx0QHN3aXRjaCBfLmxhc3QoQF9wcmV2aW91c1N0YXRlcyksIGFuaW1hdGlvbk9wdGlvbnNcblxuXHRlbWl0OiAoYXJncy4uLikgLT5cblx0XHRzdXBlclxuXHRcdCMgQWxzbyBlbWl0IHRoaXMgdG8gdGhlIGxheWVyIHdpdGggc2VsZiBhcyBhcmd1bWVudFxuXHRcdEBsYXllci5lbWl0IGFyZ3MuLi4iLCJmaWx0ZXJGb3JtYXQgPSAodmFsdWUsIHVuaXQpIC0+XG5cdFwiI3tVdGlscy5yb3VuZCB2YWx1ZSwgMn0je3VuaXR9XCJcblx0IyBcIiN7dmFsdWV9I3t1bml0fVwiXG5cbiMgVE9ETzogSWRlYWxseSB0aGVzZSBzaG91bGQgYmUgcmVhZCBvdXQgZnJvbSB0aGUgbGF5ZXIgZGVmaW5lZCBwcm9wZXJ0aWVzXG5fV2Via2l0UHJvcGVydGllcyA9IFtcblx0W1wiYmx1clwiLCBcImJsdXJcIiwgMCwgXCJweFwiXSxcblx0W1wiYnJpZ2h0bmVzc1wiLCBcImJyaWdodG5lc3NcIiwgMTAwLCBcIiVcIl0sXG5cdFtcInNhdHVyYXRlXCIsIFwic2F0dXJhdGVcIiwgMTAwLCBcIiVcIl0sXG5cdFtcImh1ZS1yb3RhdGVcIiwgXCJodWVSb3RhdGVcIiwgMCwgXCJkZWdcIl0sXG5cdFtcImNvbnRyYXN0XCIsIFwiY29udHJhc3RcIiwgMTAwLCBcIiVcIl0sXG5cdFtcImludmVydFwiLCBcImludmVydFwiLCAwLCBcIiVcIl0sXG5cdFtcImdyYXlzY2FsZVwiLCBcImdyYXlzY2FsZVwiLCAwLCBcIiVcIl0sXG5cdFtcInNlcGlhXCIsIFwic2VwaWFcIiwgMCwgXCIlXCJdLFxuXVxuXG5leHBvcnRzLkxheWVyU3R5bGUgPVxuXG5cdHdpZHRoOiAobGF5ZXIpIC0+XG5cdFx0bGF5ZXIud2lkdGggKyBcInB4XCJcblx0XG5cdGhlaWdodDogKGxheWVyKSAtPlxuXHRcdGxheWVyLmhlaWdodCArIFwicHhcIlxuXG5cdGRpc3BsYXk6IChsYXllcikgLT5cblx0XHRpZiBsYXllci52aXNpYmxlIGlzIHRydWVcblx0XHRcdHJldHVybiBcImJsb2NrXCJcblx0XHRyZXR1cm4gXCJub25lXCJcblxuXHRvcGFjaXR5OiAobGF5ZXIpIC0+XG5cdFx0bGF5ZXIub3BhY2l0eVxuXG5cdG92ZXJmbG93OiAobGF5ZXIpIC0+XG5cdFx0aWYgbGF5ZXIuc2Nyb2xsSG9yaXpvbnRhbCBpcyB0cnVlIG9yIGxheWVyLnNjcm9sbFZlcnRpY2FsIGlzIHRydWVcblx0XHRcdHJldHVybiBcImF1dG9cIlxuXHRcdGlmIGxheWVyLmNsaXAgaXMgdHJ1ZVxuXHRcdFx0cmV0dXJuIFwiaGlkZGVuXCJcblx0XHRyZXR1cm4gXCJ2aXNpYmxlXCJcblxuXHRvdmVyZmxvd1g6IChsYXllcikgLT5cblx0XHRpZiBsYXllci5zY3JvbGxIb3Jpem9udGFsIGlzIHRydWVcblx0XHRcdHJldHVybiBcInNjcm9sbFwiXG5cdFx0aWYgbGF5ZXIuY2xpcCBpcyB0cnVlXG5cdFx0XHRyZXR1cm4gXCJoaWRkZW5cIlxuXHRcdHJldHVybiBcInZpc2libGVcIlxuXG5cdG92ZXJmbG93WTogKGxheWVyKSAtPlxuXHRcdGlmIGxheWVyLnNjcm9sbFZlcnRpY2FsIGlzIHRydWVcblx0XHRcdHJldHVybiBcInNjcm9sbFwiXG5cdFx0aWYgbGF5ZXIuY2xpcCBpcyB0cnVlXG5cdFx0XHRyZXR1cm4gXCJoaWRkZW5cIlxuXHRcdHJldHVybiBcInZpc2libGVcIlxuXG5cdHpJbmRleDogKGxheWVyKSAtPlxuXHRcdGxheWVyLmluZGV4XG5cblx0d2Via2l0RmlsdGVyOiAobGF5ZXIpIC0+XG5cblx0XHQjIFRoaXMgaXMgbW9zdGx5IGFuIG9wdGltaXphdGlvbiBmb3IgQ2hyb21lLiBJZiB5b3UgcGFzcyBpbiB0aGUgd2Via2l0IGZpbHRlcnNcblx0XHQjIHdpdGggdGhlIGRlZmF1bHRzLCBpdCBzdGlsbCB0YWtlcyBhIHNoaXR0eSByZW5kZXJpbmcgcGF0aC4gU28gSSBjb21wYXJlIHRoZW1cblx0XHQjIGZpcnN0IGFuZCBvbmx5IGFkZCB0aGUgb25lcyB0aGF0IGhhdmUgYSBub24gZGVmYXVsdCB2YWx1ZS5cblxuXHRcdGNzcyA9IFtdXG5cblx0XHRmb3IgW2Nzc05hbWUsIGxheWVyTmFtZSwgZmFsbGJhY2ssIHVuaXRdIGluIF9XZWJraXRQcm9wZXJ0aWVzXG5cdFx0XHRpZiBsYXllcltsYXllck5hbWVdICE9IGZhbGxiYWNrXG5cdFx0XHRcdGNzcy5wdXNoIFwiI3tjc3NOYW1lfSgje2ZpbHRlckZvcm1hdCBsYXllcltsYXllck5hbWVdLCB1bml0fSlcIlxuXG5cdFx0cmV0dXJuIGNzcy5qb2luKFwiIFwiKVxuXG5cblx0d2Via2l0VHJhbnNmb3JtOiAobGF5ZXIpIC0+XG5cblxuXHRcdCMgV2UgaGF2ZSBhIHNwZWNpYWwgcmVuZGVyaW5nIHBhdGggZm9yIGxheWVycyB0aGF0IHByZWZlciAyZCByZW5kZXJpbmcuXG5cdFx0IyBUaGlzIGRlZmluaXRlbHkgZGVjcmVhc2VzIHBlcmZvcm1hbmNlLCBidXQgaXMgaGFuZHkgaW4gY29tcGxleCBkcmF3aW5nXG5cdFx0IyBzY2VuYXJpb3Mgd2l0aCByb3VuZGVkIGNvcm5lcnMgYW5kIHNoYWRvd3Mgd2hlcmUgZ3B1IGRyYXdpbmcgZ2V0cyB3ZWlyZFxuXHRcdCMgcmVzdWx0cy5cblxuXHRcdGlmIGxheWVyLl9wcmVmZXIyZFxuXHRcdFx0cmV0dXJuIGV4cG9ydHMuTGF5ZXJTdHlsZS53ZWJraXRUcmFuc2Zvcm1QcmVmZXIyZChsYXllcilcblxuXHRcdFwiXG5cdFx0dHJhbnNsYXRlM2QoI3tsYXllci54fXB4LCN7bGF5ZXIueX1weCwje2xheWVyLnp9cHgpIFxuXHRcdHNjYWxlKCN7bGF5ZXIuc2NhbGV9KVxuXHRcdHNjYWxlM2QoI3tsYXllci5zY2FsZVh9LCN7bGF5ZXIuc2NhbGVZfSwje2xheWVyLnNjYWxlWn0pXG5cdFx0c2tldygje2xheWVyLnNrZXd9ZGVnLCN7bGF5ZXIuc2tld31kZWcpIFxuXHRcdHNrZXdYKCN7bGF5ZXIuc2tld1h9ZGVnKSAgXG5cdFx0c2tld1koI3tsYXllci5za2V3WX1kZWcpIFxuXHRcdHJvdGF0ZVgoI3tsYXllci5yb3RhdGlvblh9ZGVnKSBcblx0XHRyb3RhdGVZKCN7bGF5ZXIucm90YXRpb25ZfWRlZykgXG5cdFx0cm90YXRlWigje2xheWVyLnJvdGF0aW9uWn1kZWcpIFxuXHRcdFwiXG5cblxuXHR3ZWJraXRUcmFuc2Zvcm1QcmVmZXIyZDogKGxheWVyKSAtPlxuXG5cdFx0IyBUaGlzIGRldGVjdHMgaWYgd2UgdXNlIDNkIHByb3BlcnRpZXMsIGlmIHdlIGRvbid0IGl0IG9ubHkgdXNlc1xuXHRcdCMgMmQgcHJvcGVydGllcyB0byBkaXNhYmxlIGdwdSByZW5kZXJpbmcuXG5cblx0XHRjc3MgPSBbXVxuXG5cdFx0aWYgbGF5ZXIueiAhPSAwXG5cdFx0XHRjc3MucHVzaCBcInRyYW5zbGF0ZTNkKCN7bGF5ZXIueH1weCwje2xheWVyLnl9cHgsI3tsYXllci56fXB4KVwiXG5cdFx0ZWxzZVxuXHRcdFx0Y3NzLnB1c2ggXCJ0cmFuc2xhdGUoI3tsYXllci54fXB4LCN7bGF5ZXIueX1weClcIlxuXG5cdFx0aWYgbGF5ZXIuc2NhbGUgIT0gMVxuXHRcdFx0Y3NzLnB1c2ggXCJzY2FsZSgje2xheWVyLnNjYWxlfSlcIlxuXG5cdFx0aWYgbGF5ZXIuc2NhbGVYICE9IDEgb3IgbGF5ZXIuc2NhbGVZICE9IDEgb3IgbGF5ZXIuc2NhbGVaICE9IDFcblx0XHRcdGNzcy5wdXNoIFwic2NhbGUzZCgje2xheWVyLnNjYWxlWH0sI3tsYXllci5zY2FsZVl9LCN7bGF5ZXIuc2NhbGVafSlcIlxuXG5cdFx0aWYgbGF5ZXIuc2tld1xuXHRcdFx0Y3NzLnB1c2ggXCJza2V3KCN7bGF5ZXIuc2tld31kZWcsI3tsYXllci5za2V3fWRlZylcIlxuXG5cdFx0aWYgbGF5ZXIuc2tld1hcblx0XHRcdGNzcy5wdXNoIFwic2tld1goI3tsYXllci5za2V3WH1kZWcpXCJcblxuXHRcdGlmIGxheWVyLnNrZXdZXG5cdFx0XHRjc3MucHVzaCBcInNrZXdZKCN7bGF5ZXIuc2tld1l9ZGVnKVwiXG5cblx0XHRpZiBsYXllci5yb3RhdGlvblhcblx0XHRcdGNzcy5wdXNoIFwicm90YXRlWCgje2xheWVyLnJvdGF0aW9uWH1kZWcpXCJcblxuXHRcdGlmIGxheWVyLnJvdGF0aW9uWVxuXHRcdFx0Y3NzLnB1c2ggXCJyb3RhdGVZKCN7bGF5ZXIucm90YXRpb25ZfWRlZylcIlxuXG5cdFx0aWYgbGF5ZXIucm90YXRpb25aXG5cdFx0XHRjc3MucHVzaCBcInJvdGF0ZVooI3tsYXllci5yb3RhdGlvblp9ZGVnKVwiXG5cblxuXHRcdHJldHVybiBjc3Muam9pbihcIiBcIilcblxuXHRcdCMgXCJcblx0XHQjIHRyYW5zbGF0ZTNkKCN7bGF5ZXIueH1weCwje2xheWVyLnl9cHgsI3tsYXllci56fXB4KSBcblx0XHQjIHNjYWxlKCN7bGF5ZXIuc2NhbGV9KVxuXHRcdCMgc2NhbGUzZCgje2xheWVyLnNjYWxlWH0sI3tsYXllci5zY2FsZVl9LCN7bGF5ZXIuc2NhbGVafSlcblx0XHQjIHNrZXcoI3tsYXllci5za2V3fWRlZywje2xheWVyLnNrZXd9ZGVnKSBcblx0XHQjIHNrZXdYKCN7bGF5ZXIuc2tld1h9ZGVnKSAgXG5cdFx0IyBza2V3WSgje2xheWVyLnNrZXdZfWRlZykgXG5cdFx0IyByb3RhdGVYKCN7bGF5ZXIucm90YXRpb25YfWRlZykgXG5cdFx0IyByb3RhdGVZKCN7bGF5ZXIucm90YXRpb25ZfWRlZykgXG5cdFx0IyByb3RhdGVaKCN7bGF5ZXIucm90YXRpb25afWRlZykgXG5cdFx0IyBcIlxuXG5cdHdlYmtpdFRyYW5zZm9ybU9yaWdpbjogKGxheWVyKSAtPlxuXHRcdFwiI3tsYXllci5vcmlnaW5YICogMTAwfSUgI3tsYXllci5vcmlnaW5ZICogMTAwfSVcIlxuXG5cdFx0IyBUb2RvOiBPcmlnaW4geiBpcyBpbiBwaXhlbHMuIEkgbmVlZCB0byByZWFkIHVwIG9uIHRoaXMuXG5cdFx0IyBcIiN7bGF5ZXIub3JpZ2luWCAqIDEwMH0lICN7bGF5ZXIub3JpZ2luWSAqIDEwMH0lICN7bGF5ZXIub3JpZ2luWiAqIDEwMH0lXCJcblxuXHRwb2ludGVyRXZlbnRzOiAobGF5ZXIpIC0+XG5cdFx0aWYgbGF5ZXIuaWdub3JlRXZlbnRzXG5cdFx0XHRyZXR1cm4gXCJub25lXCJcblx0XHRlbHNlXG5cdFx0XHRyZXR1cm4gXCJhdXRvXCJcblxuXHRib3hTaGFkb3c6IChsYXllcikgLT5cblxuXHRcdGlmIG5vdCBsYXllci5zaGFkb3dDb2xvclxuXHRcdFx0cmV0dXJuIFwiXCJcblx0XHRcblx0XHRyZXR1cm4gXCIje2xheWVyLnNoYWRvd1h9cHggI3tsYXllci5zaGFkb3dZfXB4ICN7bGF5ZXIuc2hhZG93Qmx1cn1weCAje2xheWVyLnNoYWRvd1NwcmVhZH1weCAje2xheWVyLnNoYWRvd0NvbG9yfVwiXG5cblx0IyBjc3M6IC0+XG5cdCMgXHRjc3MgPSB7fVxuXHQjIFx0Zm9yIGssIHYgb2YgZXhwb3J0cy5MYXllclN0eWxlIGxheWVyXG5cdCMgXHRcdGlmIGsgaXNudCBcImNzc1wiXG5cdCMgXHRcdFx0Y3NzW2tdID0gdigpXG5cdCMgXHRjc3NcblxuXG5cblxuIiwiVXRpbHMgPSByZXF1aXJlIFwiLi9VdGlsc1wiXG57U2Vzc2lvbn0gPSByZXF1aXJlIFwiLi9TZXNzaW9uXCJcblxuXCJcIlwiXG5cblRvZG86XG4tIEJldHRlciBsb29rc1xuLSBSZXNpemFibGVcbi0gTGl2ZSBpbiBvd24gc3BhY2Ugb24gdG9wIG9mIGFsbCBGcmFtZXIgc3R1ZmZcblxuXCJcIlwiXG5cbmV4cG9ydHMucHJpbnQgPSAoYXJncy4uLikgLT5cblx0XG5cdHByaW50TGF5ZXIgPSBGcmFtZXIuU2Vzc2lvbi5wcmludExheWVyXG5cblx0aWYgbm90IHByaW50TGF5ZXJcblxuXHRcdHByaW50TGF5ZXIgPSBuZXcgTGF5ZXJcblx0XHRwcmludExheWVyLnNjcm9sbFZlcnRpY2FsID0gdHJ1ZVxuXHRcdHByaW50TGF5ZXIuaWdub3JlRXZlbnRzID0gZmFsc2Vcblx0XHRwcmludExheWVyLmh0bWwgPSBcIlwiXG5cdFx0cHJpbnRMYXllci5zdHlsZSA9XG5cdFx0XHRcImZvbnRcIjogXCIxMnB4LzEuMzVlbSBNZW5sb1wiXG5cdFx0XHRcImNvbG9yXCI6IFwicmdiYSgwLDAsMCwuNylcIlxuXHRcdFx0XCJwYWRkaW5nXCI6IFwiOHB4XCJcblx0XHRcdFwicGFkZGluZy1ib3R0b21cIjogXCIzMHB4XCJcblx0XHRcdFwiYm9yZGVyLXRvcFwiOiBcIjFweCBzb2xpZCAjZDlkOWQ5XCJcblx0XHRcblx0XHRwcmludExheWVyLm9wYWNpdHkgPSAwLjlcblx0XHRwcmludExheWVyLnN0eWxlLnpJbmRleCA9IDk5OSAjIEFsd2F5cyBzdGF5IG9uIHRvcFxuXHRcdHByaW50TGF5ZXIudmlzaWJsZSA9IHRydWVcblx0XHRwcmludExheWVyLmJhY2tncm91bmRDb2xvciA9IFwid2hpdGVcIlxuXHRcdCMgcHJpbnRMYXllci5icmluZ1RvRnJvbnQoKVxuXG5cdFx0cHJpbnRMYXllci53aWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoXG5cdFx0cHJpbnRMYXllci5oZWlnaHQgPSAxNjBcblx0XHRwcmludExheWVyLm1heFkgPSB3aW5kb3cuaW5uZXJIZWlnaHRcblx0XG5cdHByaW50Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcblx0cHJpbnROb2RlLmlubmVySFRNTCA9IFwiJnJhcXVvOyBcIiArIGFyZ3MubWFwKFV0aWxzLnN0cmluZ2lmeSkuam9pbihcIiwgXCIpICsgXCI8YnI+XCJcblx0cHJpbnROb2RlLnN0eWxlW1wiLXdlYmtpdC11c2VyLXNlbGVjdFwiXSA9IFwidGV4dFwiXG5cdHByaW50Tm9kZS5zdHlsZVtcImN1cnNvclwiXSA9IFwiYXV0b1wiXG5cdFxuXHRwcmludExheWVyLl9lbGVtZW50LmFwcGVuZENoaWxkKHByaW50Tm9kZSlcblxuXHRGcmFtZXIuU2Vzc2lvbi5wcmludExheWVyID0gcHJpbnRMYXllclxuXHRcblx0VXRpbHMuZGVsYXkgMCwgLT5cblx0XHRwcmludExheWVyLl9lbGVtZW50LnNjcm9sbFRvcCA9IHByaW50TGF5ZXIuX2VsZW1lbnQuc2Nyb2xsSGVpZ2h0Iiwie0Jhc2VDbGFzc30gPSByZXF1aXJlIFwiLi9CYXNlQ2xhc3NcIlxuXG5jbGFzcyBTY3JlZW5DbGFzcyBleHRlbmRzIEJhc2VDbGFzc1xuXHRcblx0Y29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuXHRcdHN1cGVyIG9wdGlvbnNcblx0XHRAX3NldHVwUmVzaXplTGlzdGVuZXIoKVxuXHRcblx0QGRlZmluZSBcIndpZHRoXCIsICBnZXQ6IC0+IHdpbmRvdy5pbm5lcldpZHRoXG5cdEBkZWZpbmUgXCJoZWlnaHRcIiwgZ2V0OiAtPiB3aW5kb3cuaW5uZXJIZWlnaHRcblx0XG5cdF9zZXR1cFJlc2l6ZUxpc3RlbmVyOiAtPlxuXHRcdFxuXHRcdG9sZFJlc2l6ZUZ1bmN0aW9uID0gd2luZG93Lm9ucmVzaXplXG5cdFx0XG5cdFx0d2luZG93Lm9ucmVzaXplID0gPT5cblx0XHRcdEBlbWl0IFwicmVzaXplXCIsIEBcblx0XHRcdG9sZFJlc2l6ZUZ1bmN0aW9uPygpXG5cdFxuIyBXZSB1c2UgdGhpcyBhcyBhIHNpbmdsZXRvblxuZXhwb3J0cy5TY3JlZW4gPSBuZXcgU2NyZWVuQ2xhc3MiLCJleHBvcnRzLlNlc3Npb24gPSB7fSIsIiMgVGhpcyBhbGxvd3MgdXMgdG8gc3dpdGNoIG91dCB0aGUgdW5kZXJzY29yZSB1dGlsaXR5IGxpYnJhcnlcblxuXyA9IHJlcXVpcmUgXCJsb2Rhc2hcIlxuXG5fLnN0ciA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUuc3RyaW5nJ1xuXy5taXhpbiBfLnN0ci5leHBvcnRzKClcblxuXy5pc0Jvb2wgPSAodikgLT4gdHlwZW9mIHYgPT0gJ2Jvb2xlYW4nXG5cbmV4cG9ydHMuXyA9IF9cbiIsIntffSA9IHJlcXVpcmUgXCIuL1VuZGVyc2NvcmVcIlxue1Nlc3Npb259ID0gcmVxdWlyZSBcIi4vU2Vzc2lvblwiXG57U2NyZWVufSA9IHJlcXVpcmUgXCIuL1NjcmVlblwiXG5cblV0aWxzID0ge31cblxuVXRpbHMucmVzZXQgPSAtPlxuXG5cdCMgVGhlcmUgaXMgbm8gdXNlIGNhbGxpbmcgdGhpcyBldmVuIGJlZm9yZSB0aGUgZG9tIGlzIHJlYWR5XG5cdGlmIF9fZG9tUmVhZHkgaXMgZmFsc2Vcblx0XHRyZXR1cm5cblxuXHQjIFJlc2V0IGFsbCBwZW5kaW5nIG9wZXJhdGlvbnMgdG8gdGhlIGRvbVxuXHRfX2RvbUNvbXBsZXRlID0gW11cblxuXHQjIFJlc2V0IHRoZSBwcmludCBjb25zb2xlIGxheWVyXG5cdFNlc3Npb24ucHJpbnRMYXllciA9IG51bGxcblxuXHQjIFJlbW92ZSBhbGwgdGhlIGxpc3RlbmVycyBzbyB3ZSBkb24ndCBsZWFrIG1lbW9yeVxuXHRpZiBTZXNzaW9uLl9MYXllckxpc3Rcblx0XHRmb3IgbGF5ZXIgaW4gU2Vzc2lvbi5fTGF5ZXJMaXN0XG5cdFx0XHRsYXllci5yZW1vdmVBbGxMaXN0ZW5lcnMoKVxuXG5cdFNlc3Npb24uX0xheWVyTGlzdCA9IFtdXG5cdFNlc3Npb24uX1Jvb3RFbGVtZW50Py5pbm5lckhUTUwgPSBcIlwiXG5cblx0aWYgU2Vzc2lvbi5fZGVsYXlUaW1lcnNcblx0XHRmb3IgZGVsYXlUaW1lciBpbiBTZXNzaW9uLl9kZWxheVRpbWVyc1xuXHRcdFx0Y2xlYXJUaW1lb3V0IGRlbGF5VGltZXJcblx0XHRTZXNzaW9uLl9kZWxheVRpbWVycyA9IFtdXG5cblx0aWYgU2Vzc2lvbi5fZGVsYXlJbnRlcnZhbHNcblx0XHRmb3IgZGVsYXlJbnRlcnZhbCBpbiBTZXNzaW9uLl9kZWxheUludGVydmFsc1xuXHRcdFx0Y2xlYXJJbnRlcnZhbCBkZWxheUludGVydmFsXG5cdFx0U2Vzc2lvbi5fZGVsYXlJbnRlcnZhbHMgPSBbXVxuXG5cblxuVXRpbHMuZ2V0VmFsdWUgPSAodmFsdWUpIC0+XG5cdHJldHVybiB2YWx1ZSgpIGlmIF8uaXNGdW5jdGlvbiB2YWx1ZVxuXHRyZXR1cm4gdmFsdWVcblxuVXRpbHMuc2V0RGVmYXVsdFByb3BlcnRpZXMgPSAob2JqLCBkZWZhdWx0cywgd2Fybj10cnVlKSAtPlxuXG5cdHJlc3VsdCA9IHt9XG5cblx0Zm9yIGssIHYgb2YgZGVmYXVsdHNcblx0XHRpZiBvYmouaGFzT3duUHJvcGVydHkga1xuXHRcdFx0cmVzdWx0W2tdID0gb2JqW2tdXG5cdFx0ZWxzZVxuXHRcdFx0cmVzdWx0W2tdID0gZGVmYXVsdHNba11cblxuXHRpZiB3YXJuXG5cdFx0Zm9yIGssIHYgb2Ygb2JqXG5cdFx0XHRpZiBub3QgZGVmYXVsdHMuaGFzT3duUHJvcGVydHkga1xuXHRcdFx0XHRjb25zb2xlLndhcm4gXCJVdGlscy5zZXREZWZhdWx0UHJvcGVydGllczogZ290IHVuZXhwZWN0ZWQgb3B0aW9uOiAnI3trfSAtPiAje3Z9J1wiLCBvYmpcblxuXHRyZXN1bHRcblxuVXRpbHMudmFsdWVPckRlZmF1bHQgPSAodmFsdWUsIGRlZmF1bHRWYWx1ZSkgLT5cblxuXHRpZiB2YWx1ZSBpbiBbdW5kZWZpbmVkLCBudWxsXVxuXHRcdHZhbHVlID0gZGVmYXVsdFZhbHVlXG5cblx0cmV0dXJuIHZhbHVlXG5cblV0aWxzLmFycmF5VG9PYmplY3QgPSAoYXJyKSAtPlxuXHRvYmogPSB7fVxuXG5cdGZvciBpdGVtIGluIGFyclxuXHRcdG9ialtpdGVtWzBdXSA9IGl0ZW1bMV1cblxuXHRvYmpcblxuVXRpbHMuYXJyYXlOZXh0ID0gKGFyciwgaXRlbSkgLT5cblx0YXJyW2Fyci5pbmRleE9mKGl0ZW0pICsgMV0gb3IgXy5maXJzdCBhcnJcblxuVXRpbHMuYXJyYXlQcmV2ID0gKGFyciwgaXRlbSkgLT5cblx0YXJyW2Fyci5pbmRleE9mKGl0ZW0pIC0gMV0gb3IgXy5sYXN0IGFyclxuXG5cbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBBTklNQVRJT05cblxuIyBUaGlzIGlzIGEgbGl0dGxlIGhhY2t5LCBidXQgSSB3YW50IHRvIGF2b2lkIHdyYXBwaW5nIHRoZSBmdW5jdGlvblxuIyBpbiBhbm90aGVyIG9uZSBhcyBpdCBnZXRzIGNhbGxlZCBhdCA2MCBmcHMuIFNvIHdlIG1ha2UgaXQgYSBnbG9iYWwuXG53aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID89IHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbndpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPz0gKGYpIC0+IFV0aWxzLmRlbGF5IDEvNjAsIGZcblxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRJTUUgRlVOQ1RJT05TXG5cbiMgTm90ZTogaW4gRnJhbWVyIDMgd2UgdHJ5IHRvIGtlZXAgYWxsIHRpbWVzIGluIHNlY29uZHNcblxuIyBVc2VkIGJ5IGFuaW1hdGlvbiBlbmdpbmUsIG5lZWRzIHRvIGJlIHZlcnkgcGVyZm9ybWFudFxuVXRpbHMuZ2V0VGltZSA9IC0+IERhdGUubm93KCkgLyAxMDAwXG5cbiMgVGhpcyB3b3JrcyBvbmx5IGluIGNocm9tZSwgYnV0IHdlIG9ubHkgdXNlIGl0IGZvciB0ZXN0aW5nXG4jIGlmIHdpbmRvdy5wZXJmb3JtYW5jZVxuIyBcdFV0aWxzLmdldFRpbWUgPSAtPiBwZXJmb3JtYW5jZS5ub3coKSAvIDEwMDBcblxuVXRpbHMuZGVsYXkgPSAodGltZSwgZikgLT5cblx0dGltZXIgPSBzZXRUaW1lb3V0IGYsIHRpbWUgKiAxMDAwXG5cdFNlc3Npb24uX2RlbGF5VGltZXJzID89IFtdXG5cdFNlc3Npb24uX2RlbGF5VGltZXJzLnB1c2ggdGltZXJcblx0cmV0dXJuIHRpbWVyXG5cdFxuVXRpbHMuaW50ZXJ2YWwgPSAodGltZSwgZikgLT5cblx0dGltZXIgPSBzZXRJbnRlcnZhbCBmLCB0aW1lICogMTAwMFxuXHRTZXNzaW9uLl9kZWxheUludGVydmFscyA/PSBbXVxuXHRTZXNzaW9uLl9kZWxheUludGVydmFscy5wdXNoIHRpbWVyXG5cdHJldHVybiB0aW1lclxuXG5VdGlscy5kZWJvdW5jZSA9ICh0aHJlc2hvbGQ9MC4xLCBmbiwgaW1tZWRpYXRlKSAtPlxuXHR0aW1lb3V0ID0gbnVsbFxuXHR0aHJlc2hvbGQgKj0gMTAwMFxuXHQoYXJncy4uLikgLT5cblx0XHRvYmogPSB0aGlzXG5cdFx0ZGVsYXllZCA9IC0+XG5cdFx0XHRmbi5hcHBseShvYmosIGFyZ3MpIHVubGVzcyBpbW1lZGlhdGVcblx0XHRcdHRpbWVvdXQgPSBudWxsXG5cdFx0aWYgdGltZW91dFxuXHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVvdXQpXG5cdFx0ZWxzZSBpZiAoaW1tZWRpYXRlKVxuXHRcdFx0Zm4uYXBwbHkob2JqLCBhcmdzKVxuXHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0IGRlbGF5ZWQsIHRocmVzaG9sZFxuXG5VdGlscy50aHJvdHRsZSA9IChkZWxheSwgZm4pIC0+XG5cdHJldHVybiBmbiBpZiBkZWxheSBpcyAwXG5cdGRlbGF5ICo9IDEwMDBcblx0dGltZXIgPSBmYWxzZVxuXHRyZXR1cm4gLT5cblx0XHRyZXR1cm4gaWYgdGltZXJcblx0XHR0aW1lciA9IHRydWVcblx0XHRzZXRUaW1lb3V0ICgtPiB0aW1lciA9IGZhbHNlKSwgZGVsYXkgdW5sZXNzIGRlbGF5IGlzIC0xXG5cdFx0Zm4gYXJndW1lbnRzLi4uXG5cblxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIEhBTkRZIEZVTkNUSU9OU1xuXG5VdGlscy5yYW5kb21Db2xvciA9IChhbHBoYSA9IDEuMCkgLT5cblx0YyA9IC0+IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAyNTUpXG5cdFwicmdiYSgje2MoKX0sICN7YygpfSwgI3tjKCl9LCAje2FscGhhfSlcIlxuXG5VdGlscy5yYW5kb21DaG9pY2UgPSAoYXJyKSAtPlxuXHRhcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCldXG5cblV0aWxzLnJhbmRvbU51bWJlciA9IChhPTAsIGI9MSkgLT5cblx0IyBSZXR1cm4gYSByYW5kb20gbnVtYmVyIGJldHdlZW4gYSBhbmQgYlxuXHRVdGlscy5tYXBSYW5nZSBNYXRoLnJhbmRvbSgpLCAwLCAxLCBhLCBiXG5cblV0aWxzLmxhYmVsTGF5ZXIgPSAobGF5ZXIsIHRleHQsIHN0eWxlPXt9KSAtPlxuXHRcblx0c3R5bGUgPSBfLmV4dGVuZFxuXHRcdGZvbnQ6IFwiMTBweC8xZW0gTWVubG9cIlxuXHRcdGxpbmVIZWlnaHQ6IFwiI3tsYXllci5oZWlnaHR9cHhcIlxuXHRcdHRleHRBbGlnbjogXCJjZW50ZXJcIlxuXHRcdGNvbG9yOiBcIiNmZmZcIlxuXHQsIHN0eWxlXG5cblx0bGF5ZXIuc3R5bGUgPSBzdHlsZVxuXHRsYXllci5odG1sID0gdGV4dFxuXG5VdGlscy5zdHJpbmdpZnkgPSAob2JqKSAtPlxuXHR0cnlcblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkgb2JqIGlmIF8uaXNPYmplY3Qgb2JqXG5cdGNhdGNoXG5cdFx0XCJcIlxuXHRyZXR1cm4gXCJ1bmRlZmluZWRcIiBpZiBvYmogaXMgdW5kZWZpbmVkXG5cdHJldHVybiBvYmoudG9TdHJpbmcoKSBpZiBvYmoudG9TdHJpbmdcblx0cmV0dXJuIG9ialxuXG5VdGlscy51dWlkID0gLT5cblxuXHRjaGFycyA9IFwiMDEyMzQ1Njc4OWFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6XCIuc3BsaXQoXCJcIilcblx0b3V0cHV0ID0gbmV3IEFycmF5KDM2KVxuXHRyYW5kb20gPSAwXG5cblx0Zm9yIGRpZ2l0IGluIFsxLi4zMl1cblx0XHRyYW5kb20gPSAweDIwMDAwMDAgKyAoTWF0aC5yYW5kb20oKSAqIDB4MTAwMDAwMCkgfCAwIGlmIChyYW5kb20gPD0gMHgwMilcblx0XHRyID0gcmFuZG9tICYgMHhmXG5cdFx0cmFuZG9tID0gcmFuZG9tID4+IDRcblx0XHRvdXRwdXRbZGlnaXRdID0gY2hhcnNbaWYgZGlnaXQgPT0gMTkgdGhlbiAociAmIDB4MykgfCAweDggZWxzZSByXVxuXG5cdG91dHB1dC5qb2luIFwiXCJcblxuVXRpbHMuYXJyYXlGcm9tQXJndW1lbnRzID0gKGFyZ3MpIC0+XG5cblx0IyBDb252ZXJ0IGFuIGFyZ3VtZW50cyBvYmplY3QgdG8gYW4gYXJyYXlcblx0XG5cdGlmIF8uaXNBcnJheSBhcmdzWzBdXG5cdFx0cmV0dXJuIGFyZ3NbMF1cblx0XG5cdEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsIGFyZ3NcblxuVXRpbHMuY3ljbGUgPSAtPlxuXHRcblx0IyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBjeWNsZXMgdGhyb3VnaCBhIGxpc3Qgb2YgdmFsdWVzIHdpdGggZWFjaCBjYWxsLlxuXHRcblx0YXJncyA9IFV0aWxzLmFycmF5RnJvbUFyZ3VtZW50cyBhcmd1bWVudHNcblx0XG5cdGN1cnIgPSAtMVxuXHRyZXR1cm4gLT5cblx0XHRjdXJyKytcblx0XHRjdXJyID0gMCBpZiBjdXJyID49IGFyZ3MubGVuZ3RoXG5cdFx0cmV0dXJuIGFyZ3NbY3Vycl1cblxuIyBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eVxuVXRpbHMudG9nZ2xlID0gVXRpbHMuY3ljbGVcblxuXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgRU5WSVJPTUVOVCBGVU5DVElPTlNcblxuVXRpbHMuaXNXZWJLaXQgPSAtPlxuXHR3aW5kb3cuV2ViS2l0Q1NTTWF0cml4IGlzbnQgbnVsbFxuXHRcblV0aWxzLmlzVG91Y2ggPSAtPlxuXHR3aW5kb3cub250b3VjaHN0YXJ0IGlzIG51bGxcblxuVXRpbHMuaXNNb2JpbGUgPSAtPlxuXHQoL2lwaG9uZXxpcG9kfGlwYWR8YW5kcm9pZHxpZXxibGFja2JlcnJ5fGZlbm5lYy8pLnRlc3QgXFxcblx0XHRuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKClcblxuVXRpbHMuaXNDaHJvbWUgPSAtPlxuXHQoL2Nocm9tZS8pLnRlc3QgXFxcblx0XHRuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKClcblxuVXRpbHMuaXNMb2NhbCA9IC0+XG5cdFV0aWxzLmlzTG9jYWxVcmwgd2luZG93LmxvY2F0aW9uLmhyZWZcblxuVXRpbHMuaXNMb2NhbFVybCA9ICh1cmwpIC0+XG5cdHVybFswLi42XSA9PSBcImZpbGU6Ly9cIlxuXG5VdGlscy5kZXZpY2VQaXhlbFJhdGlvID0gLT5cblx0d2luZG93LmRldmljZVBpeGVsUmF0aW9cblxuVXRpbHMucGF0aEpvaW4gPSAtPlxuXHRVdGlscy5hcnJheUZyb21Bcmd1bWVudHMoYXJndW1lbnRzKS5qb2luKFwiL1wiKVxuXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgTUFUSCBGVU5DVElPTlNcblx0XHRcblV0aWxzLnJvdW5kID0gKHZhbHVlLCBkZWNpbWFscykgLT5cblx0ZCA9IE1hdGgucG93IDEwLCBkZWNpbWFsc1xuXHRNYXRoLnJvdW5kKHZhbHVlICogZCkgLyBkXG5cbiMgVGFrZW4gZnJvbSBodHRwOi8vanNmaWRkbGUubmV0L1h6NDY0LzcvXG4jIFVzZWQgYnkgYW5pbWF0aW9uIGVuZ2luZSwgbmVlZHMgdG8gYmUgdmVyeSBwZXJmb3JtYW50XG5VdGlscy5tYXBSYW5nZSA9ICh2YWx1ZSwgZnJvbUxvdywgZnJvbUhpZ2gsIHRvTG93LCB0b0hpZ2gpIC0+XG5cdHRvTG93ICsgKCgodmFsdWUgLSBmcm9tTG93KSAvIChmcm9tSGlnaCAtIGZyb21Mb3cpKSAqICh0b0hpZ2ggLSB0b0xvdykpXG5cbiMgS2luZCBvZiBzaW1pbGFyIGFzIGFib3ZlIGJ1dCB3aXRoIGEgYmV0dGVyIHN5bnRheCBhbmQgYSBsaW1pdGluZyBvcHRpb25cblV0aWxzLm1vZHVsYXRlID0gKHZhbHVlLCByYW5nZUEsIHJhbmdlQiwgbGltaXQ9ZmFsc2UpIC0+XG5cdFxuXHRbZnJvbUxvdywgZnJvbUhpZ2hdID0gcmFuZ2VBXG5cdFt0b0xvdywgdG9IaWdoXSA9IHJhbmdlQlxuXHRcblx0cmVzdWx0ID0gdG9Mb3cgKyAoKCh2YWx1ZSAtIGZyb21Mb3cpIC8gKGZyb21IaWdoIC0gZnJvbUxvdykpICogKHRvSGlnaCAtIHRvTG93KSlcblxuXHRpZiBsaW1pdCBpcyB0cnVlXG5cdFx0cmV0dXJuIHRvTG93IGlmIHJlc3VsdCA8IHRvTG93XG5cdFx0cmV0dXJuIHRvSGlnaCBpZiByZXN1bHQgPiB0b0hpZ2hcblxuXHRyZXN1bHRcblxuXG5cbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBTVFJJTkcgRlVOQ1RJT05TXG5cblV0aWxzLnBhcnNlRnVuY3Rpb24gPSAoc3RyKSAtPlxuXG5cdHJlc3VsdCA9IHtuYW1lOiBcIlwiLCBhcmdzOiBbXX1cblxuXHRpZiBfLmVuZHNXaXRoIHN0ciwgXCIpXCJcblx0XHRyZXN1bHQubmFtZSA9IHN0ci5zcGxpdChcIihcIilbMF1cblx0XHRyZXN1bHQuYXJncyA9IHN0ci5zcGxpdChcIihcIilbMV0uc3BsaXQoXCIsXCIpLm1hcCAoYSkgLT4gXy50cmltKF8ucnRyaW0oYSwgXCIpXCIpKVxuXHRlbHNlXG5cdFx0cmVzdWx0Lm5hbWUgPSBzdHJcblxuXHRyZXR1cm4gcmVzdWx0XG5cbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBET00gRlVOQ1RJT05TXG5cbl9fZG9tQ29tcGxldGUgPSBbXVxuX19kb21SZWFkeSA9IGZhbHNlXG5cbmlmIGRvY3VtZW50P1xuXHRkb2N1bWVudC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoZXZlbnQpID0+XG5cdFx0aWYgZG9jdW1lbnQucmVhZHlTdGF0ZSBpcyBcImNvbXBsZXRlXCJcblx0XHRcdF9fZG9tUmVhZHkgPSB0cnVlXG5cdFx0XHR3aGlsZSBfX2RvbUNvbXBsZXRlLmxlbmd0aFxuXHRcdFx0XHRmID0gX19kb21Db21wbGV0ZS5zaGlmdCgpKClcblxuVXRpbHMuZG9tQ29tcGxldGUgPSAoZikgLT5cblx0aWYgZG9jdW1lbnQucmVhZHlTdGF0ZSBpcyBcImNvbXBsZXRlXCJcblx0XHRmKClcblx0ZWxzZVxuXHRcdF9fZG9tQ29tcGxldGUucHVzaCBmXG5cblV0aWxzLmRvbUNvbXBsZXRlQ2FuY2VsID0gKGYpIC0+XG5cdF9fZG9tQ29tcGxldGUgPSBfLndpdGhvdXQgX19kb21Db21wbGV0ZSwgZlxuXG5VdGlscy5kb21Mb2FkU2NyaXB0ID0gKHVybCwgY2FsbGJhY2spIC0+XG5cdFxuXHRzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50IFwic2NyaXB0XCJcblx0c2NyaXB0LnR5cGUgPSBcInRleHQvamF2YXNjcmlwdFwiXG5cdHNjcmlwdC5zcmMgPSB1cmxcblx0XG5cdHNjcmlwdC5vbmxvYWQgPSBjYWxsYmFja1xuXHRcblx0aGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaGVhZFwiKVswXVxuXHRoZWFkLmFwcGVuZENoaWxkIHNjcmlwdFxuXHRcblx0c2NyaXB0XG5cblV0aWxzLmRvbUxvYWREYXRhID0gKHBhdGgsIGNhbGxiYWNrKSAtPlxuXG5cdHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXG5cdCMgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyIFwicHJvZ3Jlc3NcIiwgdXBkYXRlUHJvZ3Jlc3MsIGZhbHNlXG5cdCMgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyIFwiYWJvcnRcIiwgdHJhbnNmZXJDYW5jZWxlZCwgZmFsc2Vcblx0XG5cdHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lciBcImxvYWRcIiwgLT5cblx0XHRjYWxsYmFjayBudWxsLCByZXF1ZXN0LnJlc3BvbnNlVGV4dFxuXHQsIGZhbHNlXG5cdFxuXHRyZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIgXCJlcnJvclwiLCAtPlxuXHRcdGNhbGxiYWNrIHRydWUsIG51bGxcblx0LCBmYWxzZVxuXG5cdHJlcXVlc3Qub3BlbiBcIkdFVFwiLCBwYXRoLCB0cnVlXG5cdHJlcXVlc3Quc2VuZCBudWxsXG5cblV0aWxzLmRvbUxvYWRKU09OID0gKHBhdGgsIGNhbGxiYWNrKSAtPlxuXHRVdGlscy5kb21Mb2FkRGF0YSBwYXRoLCAoZXJyLCBkYXRhKSAtPlxuXHRcdGNhbGxiYWNrIGVyciwgSlNPTi5wYXJzZSBkYXRhXG5cblV0aWxzLmRvbUxvYWREYXRhU3luYyA9IChwYXRoKSAtPlxuXG5cdHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXHRyZXF1ZXN0Lm9wZW4gXCJHRVRcIiwgcGF0aCwgZmFsc2VcblxuXHQjIFRoaXMgZG9lcyBub3Qgd29yayBpbiBTYWZhcmksIHNlZSBiZWxvd1xuXHR0cnlcblx0XHRyZXF1ZXN0LnNlbmQgbnVsbFxuXHRjYXRjaCBlXG5cdFx0Y29uc29sZS5kZWJ1ZyBcIlhNTEh0dHBSZXF1ZXN0LmVycm9yXCIsIGVcblxuXHRkYXRhID0gcmVxdWVzdC5yZXNwb25zZVRleHRcblxuXHQjIEJlY2F1c2UgSSBjYW4ndCBjYXRjaCB0aGUgYWN0dWFsIDQwNCB3aXRoIFNhZmFyaSwgSSBqdXN0IGFzc3VtZSBzb21ldGhpbmdcblx0IyB3ZW50IHdyb25nIGlmIHRoZXJlIGlzIG5vIHRleHQgZGF0YSByZXR1cm5lZCBmcm9tIHRoZSByZXF1ZXN0LlxuXHRpZiBub3QgZGF0YVxuXHRcdHRocm93IEVycm9yIFwiVXRpbHMuZG9tTG9hZERhdGFTeW5jOiBubyBkYXRhIHdhcyBsb2FkZWQgKHVybCBub3QgZm91bmQ/KVwiXG5cblx0cmV0dXJuIHJlcXVlc3QucmVzcG9uc2VUZXh0XG5cblV0aWxzLmRvbUxvYWRKU09OU3luYyA9IChwYXRoKSAtPlxuXHRKU09OLnBhcnNlIFV0aWxzLmRvbUxvYWREYXRhU3luYyBwYXRoXG5cblV0aWxzLmRvbUxvYWRTY3JpcHRTeW5jID0gKHBhdGgpIC0+XG5cdHNjcmlwdERhdGEgPSBVdGlscy5kb21Mb2FkRGF0YVN5bmMgcGF0aFxuXHRldmFsIHNjcmlwdERhdGFcblx0c2NyaXB0RGF0YVxuXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgR0VPTUVSVFkgRlVOQ1RJT05TXG5cbiMgUG9pbnRcblxuVXRpbHMucG9pbnRNaW4gPSAtPlxuXHRwb2ludHMgPSBVdGlscy5hcnJheUZyb21Bcmd1bWVudHMgYXJndW1lbnRzXG5cdHBvaW50ID0gXG5cdFx0eDogXy5taW4gcG9pbnQubWFwIChzaXplKSAtPiBzaXplLnhcblx0XHR5OiBfLm1pbiBwb2ludC5tYXAgKHNpemUpIC0+IHNpemUueVxuXG5VdGlscy5wb2ludE1heCA9IC0+XG5cdHBvaW50cyA9IFV0aWxzLmFycmF5RnJvbUFyZ3VtZW50cyBhcmd1bWVudHNcblx0cG9pbnQgPSBcblx0XHR4OiBfLm1heCBwb2ludC5tYXAgKHNpemUpIC0+IHNpemUueFxuXHRcdHk6IF8ubWF4IHBvaW50Lm1hcCAoc2l6ZSkgLT4gc2l6ZS55XG5cblV0aWxzLnBvaW50RGlzdGFuY2UgPSAocG9pbnRBLCBwb2ludEIpIC0+XG5cdGRpc3RhbmNlID1cblx0XHR4OiBNYXRoLmFicyhwb2ludEIueCAtIHBvaW50QS54KVxuXHRcdHk6IE1hdGguYWJzKHBvaW50Qi55IC0gcG9pbnRBLnkpXG5cblV0aWxzLnBvaW50SW52ZXJ0ID0gKHBvaW50KSAtPlxuXHRwb2ludCA9XG5cdFx0eDogMCAtIHBvaW50Lnhcblx0XHR5OiAwIC0gcG9pbnQueVxuXG5VdGlscy5wb2ludFRvdGFsID0gKHBvaW50KSAtPlxuXHRwb2ludC54ICsgcG9pbnQueVxuXG5VdGlscy5wb2ludEFicyA9IChwb2ludCkgLT5cblx0cG9pbnQgPVxuXHRcdHg6IE1hdGguYWJzIHBvaW50Lnhcblx0XHR5OiBNYXRoLmFicyBwb2ludC55XG5cblV0aWxzLnBvaW50SW5GcmFtZSA9IChwb2ludCwgZnJhbWUpIC0+XG5cdHJldHVybiBmYWxzZSAgaWYgcG9pbnQueCA8IGZyYW1lLm1pblggb3IgcG9pbnQueCA+IGZyYW1lLm1heFhcblx0cmV0dXJuIGZhbHNlICBpZiBwb2ludC55IDwgZnJhbWUubWluWSBvciBwb2ludC55ID4gZnJhbWUubWF4WVxuXHR0cnVlXG5cbiMgU2l6ZVxuXG5VdGlscy5zaXplTWluID0gLT5cblx0c2l6ZXMgPSBVdGlscy5hcnJheUZyb21Bcmd1bWVudHMgYXJndW1lbnRzXG5cdHNpemUgID1cblx0XHR3aWR0aDogIF8ubWluIHNpemVzLm1hcCAoc2l6ZSkgLT4gc2l6ZS53aWR0aFxuXHRcdGhlaWdodDogXy5taW4gc2l6ZXMubWFwIChzaXplKSAtPiBzaXplLmhlaWdodFxuXG5VdGlscy5zaXplTWF4ID0gLT5cblx0c2l6ZXMgPSBVdGlscy5hcnJheUZyb21Bcmd1bWVudHMgYXJndW1lbnRzXG5cdHNpemUgID1cblx0XHR3aWR0aDogIF8ubWF4IHNpemVzLm1hcCAoc2l6ZSkgLT4gc2l6ZS53aWR0aFxuXHRcdGhlaWdodDogXy5tYXggc2l6ZXMubWFwIChzaXplKSAtPiBzaXplLmhlaWdodFxuXG4jIEZyYW1lc1xuXG4jIG1pbiBtaWQgbWF4ICogeCwgeVxuXG5VdGlscy5mcmFtZUdldE1pblggPSAoZnJhbWUpIC0+IGZyYW1lLnhcblV0aWxzLmZyYW1lU2V0TWluWCA9IChmcmFtZSwgdmFsdWUpIC0+IGZyYW1lLnggPSB2YWx1ZVxuXG5VdGlscy5mcmFtZUdldE1pZFggPSAoZnJhbWUpIC0+IFxuXHRpZiBmcmFtZS53aWR0aCBpcyAwIHRoZW4gMCBlbHNlIGZyYW1lLnggKyAoZnJhbWUud2lkdGggLyAyLjApXG5VdGlscy5mcmFtZVNldE1pZFggPSAoZnJhbWUsIHZhbHVlKSAtPlxuXHRmcmFtZS54ID0gaWYgZnJhbWUud2lkdGggaXMgMCB0aGVuIDAgZWxzZSB2YWx1ZSAtIChmcmFtZS53aWR0aCAvIDIuMClcblxuVXRpbHMuZnJhbWVHZXRNYXhYID0gKGZyYW1lKSAtPiBcblx0aWYgZnJhbWUud2lkdGggaXMgMCB0aGVuIDAgZWxzZSBmcmFtZS54ICsgZnJhbWUud2lkdGhcblV0aWxzLmZyYW1lU2V0TWF4WCA9IChmcmFtZSwgdmFsdWUpIC0+XG5cdGZyYW1lLnggPSBpZiBmcmFtZS53aWR0aCBpcyAwIHRoZW4gMCBlbHNlIHZhbHVlIC0gZnJhbWUud2lkdGhcblxuVXRpbHMuZnJhbWVHZXRNaW5ZID0gKGZyYW1lKSAtPiBmcmFtZS55XG5VdGlscy5mcmFtZVNldE1pblkgPSAoZnJhbWUsIHZhbHVlKSAtPiBmcmFtZS55ID0gdmFsdWVcblxuVXRpbHMuZnJhbWVHZXRNaWRZID0gKGZyYW1lKSAtPiBcblx0aWYgZnJhbWUuaGVpZ2h0IGlzIDAgdGhlbiAwIGVsc2UgZnJhbWUueSArIChmcmFtZS5oZWlnaHQgLyAyLjApXG5VdGlscy5mcmFtZVNldE1pZFkgPSAoZnJhbWUsIHZhbHVlKSAtPlxuXHRmcmFtZS55ID0gaWYgZnJhbWUuaGVpZ2h0IGlzIDAgdGhlbiAwIGVsc2UgdmFsdWUgLSAoZnJhbWUuaGVpZ2h0IC8gMi4wKVxuXG5VdGlscy5mcmFtZUdldE1heFkgPSAoZnJhbWUpIC0+IFxuXHRpZiBmcmFtZS5oZWlnaHQgaXMgMCB0aGVuIDAgZWxzZSBmcmFtZS55ICsgZnJhbWUuaGVpZ2h0XG5VdGlscy5mcmFtZVNldE1heFkgPSAoZnJhbWUsIHZhbHVlKSAtPlxuXHRmcmFtZS55ID0gaWYgZnJhbWUuaGVpZ2h0IGlzIDAgdGhlbiAwIGVsc2UgdmFsdWUgLSBmcmFtZS5oZWlnaHRcblxuXG5VdGlscy5mcmFtZVNpemUgPSAoZnJhbWUpIC0+XG5cdHNpemUgPVxuXHRcdHdpZHRoOiBmcmFtZS53aWR0aFxuXHRcdGhlaWdodDogZnJhbWUuaGVpZ2h0XG5cblV0aWxzLmZyYW1lUG9pbnQgPSAoZnJhbWUpIC0+XG5cdHBvaW50ID1cblx0XHR4OiBmcmFtZS54XG5cdFx0eTogZnJhbWUueVxuXG5VdGlscy5mcmFtZU1lcmdlID0gLT5cblxuXHQjIFJldHVybiBhIGZyYW1lIHRoYXQgZml0cyBhbGwgdGhlIGlucHV0IGZyYW1lc1xuXG5cdGZyYW1lcyA9IFV0aWxzLmFycmF5RnJvbUFyZ3VtZW50cyBhcmd1bWVudHNcblxuXHRmcmFtZSA9XG5cdFx0eDogXy5taW4gZnJhbWVzLm1hcCBVdGlscy5mcmFtZUdldE1pblhcblx0XHR5OiBfLm1pbiBmcmFtZXMubWFwIFV0aWxzLmZyYW1lR2V0TWluWVxuXG5cdGZyYW1lLndpZHRoICA9IF8ubWF4KGZyYW1lcy5tYXAgVXRpbHMuZnJhbWVHZXRNYXhYKSAtIGZyYW1lLnhcblx0ZnJhbWUuaGVpZ2h0ID0gXy5tYXgoZnJhbWVzLm1hcCBVdGlscy5mcmFtZUdldE1heFkpIC0gZnJhbWUueVxuXG5cdGZyYW1lXG5cbiMgQ29vcmRpbmF0ZSBzeXN0ZW1cblxuVXRpbHMuY29udmVydFBvaW50ID0gKGlucHV0LCBsYXllckEsIGxheWVyQikgLT5cblxuXHQjIENvbnZlcnQgYSBwb2ludCBiZXR3ZWVuIHR3byBsYXllciBjb29yZGluYXRlIHN5c3RlbXNcblxuXHRwb2ludCA9IF8uZGVmYXVsdHMoaW5wdXQsIHt4OjAsIHk6MH0pXG5cblx0c3VwZXJMYXllcnNBID0gbGF5ZXJBPy5zdXBlckxheWVycygpIG9yIFtdXG5cdHN1cGVyTGF5ZXJzQiA9IGxheWVyQj8uc3VwZXJMYXllcnMoKSBvciBbXVxuXHRcblx0c3VwZXJMYXllcnNCLnB1c2ggbGF5ZXJCIGlmIGxheWVyQlxuXHRcblx0Zm9yIGxheWVyIGluIHN1cGVyTGF5ZXJzQVxuXHRcdHBvaW50LnggKz0gbGF5ZXIueCAtIGxheWVyLnNjcm9sbEZyYW1lLnhcblx0XHRwb2ludC55ICs9IGxheWVyLnkgLSBsYXllci5zY3JvbGxGcmFtZS55XG5cblx0Zm9yIGxheWVyIGluIHN1cGVyTGF5ZXJzQlxuXHRcdHBvaW50LnggLT0gbGF5ZXIueCArIGxheWVyLnNjcm9sbEZyYW1lLnhcblx0XHRwb2ludC55IC09IGxheWVyLnkgKyBsYXllci5zY3JvbGxGcmFtZS55XG5cdFxuXHRyZXR1cm4gcG9pbnRcblxuXy5leHRlbmQgZXhwb3J0cywgVXRpbHNcblxuIiwie0xheWVyfSA9IHJlcXVpcmUgXCIuL0xheWVyXCJcblxuY2xhc3MgZXhwb3J0cy5WaWRlb0xheWVyIGV4dGVuZHMgTGF5ZXJcblx0XG5cdGNvbnN0cnVjdG9yOiAob3B0aW9ucz17fSkgLT5cblxuXHRcdHN1cGVyIG9wdGlvbnNcblx0XHRcblx0XHRAcGxheWVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInZpZGVvXCIpXG5cdFx0QHBsYXllci5zdHlsZS53aWR0aCA9IFwiMTAwJVwiXG5cdFx0QHBsYXllci5zdHlsZS5oZWlnaHQgPSBcIjEwMCVcIlxuXHRcdFxuXHRcdCMgTWFrZSBpdCB3b3JrIHdpdGggLm9uIGFuZCAub2ZmXG5cdFx0IyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9HdWlkZS9FdmVudHMvTWVkaWFfZXZlbnRzXG5cdFx0QHBsYXllci5vbiA9IEBwbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lclxuXHRcdEBwbGF5ZXIub2ZmID0gQHBsYXllci5yZW1vdmVFdmVudExpc3RlbmVyXG5cdFx0XG5cdFx0QHZpZGVvID0gb3B0aW9ucy52aWRlb1xuXHRcdFxuXHRcdEBfZWxlbWVudC5hcHBlbmRDaGlsZChAcGxheWVyKVxuXHRcblx0QGRlZmluZSBcInZpZGVvXCIsXG5cdFx0Z2V0OiAtPiBAcGxheWVyLnNyY1xuXHRcdHNldDogKHZpZGVvKSAtPiBAcGxheWVyLnNyYyA9IHZpZGVvXG4iLCJ2YXIgZ2xvYmFsPXR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fTsvKipcbiAqIEBsaWNlbnNlXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gLW8gLi9kaXN0L2xvZGFzaC5qc2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG47KGZ1bmN0aW9uKCkge1xuXG4gIC8qKiBVc2VkIGFzIGEgc2FmZSByZWZlcmVuY2UgZm9yIGB1bmRlZmluZWRgIGluIHByZSBFUzUgZW52aXJvbm1lbnRzICovXG4gIHZhciB1bmRlZmluZWQ7XG5cbiAgLyoqIFVzZWQgdG8gcG9vbCBhcnJheXMgYW5kIG9iamVjdHMgdXNlZCBpbnRlcm5hbGx5ICovXG4gIHZhciBhcnJheVBvb2wgPSBbXSxcbiAgICAgIG9iamVjdFBvb2wgPSBbXTtcblxuICAvKiogVXNlZCB0byBnZW5lcmF0ZSB1bmlxdWUgSURzICovXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuXG4gIC8qKiBVc2VkIHRvIHByZWZpeCBrZXlzIHRvIGF2b2lkIGlzc3VlcyB3aXRoIGBfX3Byb3RvX19gIGFuZCBwcm9wZXJ0aWVzIG9uIGBPYmplY3QucHJvdG90eXBlYCAqL1xuICB2YXIga2V5UHJlZml4ID0gK25ldyBEYXRlICsgJyc7XG5cbiAgLyoqIFVzZWQgYXMgdGhlIHNpemUgd2hlbiBvcHRpbWl6YXRpb25zIGFyZSBlbmFibGVkIGZvciBsYXJnZSBhcnJheXMgKi9cbiAgdmFyIGxhcmdlQXJyYXlTaXplID0gNzU7XG5cbiAgLyoqIFVzZWQgYXMgdGhlIG1heCBzaXplIG9mIHRoZSBgYXJyYXlQb29sYCBhbmQgYG9iamVjdFBvb2xgICovXG4gIHZhciBtYXhQb29sU2l6ZSA9IDQwO1xuXG4gIC8qKiBVc2VkIHRvIGRldGVjdCBhbmQgdGVzdCB3aGl0ZXNwYWNlICovXG4gIHZhciB3aGl0ZXNwYWNlID0gKFxuICAgIC8vIHdoaXRlc3BhY2VcbiAgICAnIFxcdFxceDBCXFxmXFx4QTBcXHVmZWZmJyArXG5cbiAgICAvLyBsaW5lIHRlcm1pbmF0b3JzXG4gICAgJ1xcblxcclxcdTIwMjhcXHUyMDI5JyArXG5cbiAgICAvLyB1bmljb2RlIGNhdGVnb3J5IFwiWnNcIiBzcGFjZSBzZXBhcmF0b3JzXG4gICAgJ1xcdTE2ODBcXHUxODBlXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDAnXG4gICk7XG5cbiAgLyoqIFVzZWQgdG8gbWF0Y2ggZW1wdHkgc3RyaW5nIGxpdGVyYWxzIGluIGNvbXBpbGVkIHRlbXBsYXRlIHNvdXJjZSAqL1xuICB2YXIgcmVFbXB0eVN0cmluZ0xlYWRpbmcgPSAvXFxiX19wIFxcKz0gJyc7L2csXG4gICAgICByZUVtcHR5U3RyaW5nTWlkZGxlID0gL1xcYihfX3AgXFwrPSkgJycgXFwrL2csXG4gICAgICByZUVtcHR5U3RyaW5nVHJhaWxpbmcgPSAvKF9fZVxcKC4qP1xcKXxcXGJfX3RcXCkpIFxcK1xcbicnOy9nO1xuXG4gIC8qKlxuICAgKiBVc2VkIHRvIG1hdGNoIEVTNiB0ZW1wbGF0ZSBkZWxpbWl0ZXJzXG4gICAqIGh0dHA6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLWxpdGVyYWxzLXN0cmluZy1saXRlcmFsc1xuICAgKi9cbiAgdmFyIHJlRXNUZW1wbGF0ZSA9IC9cXCRcXHsoW15cXFxcfV0qKD86XFxcXC5bXlxcXFx9XSopKilcXH0vZztcblxuICAvKiogVXNlZCB0byBtYXRjaCByZWdleHAgZmxhZ3MgZnJvbSB0aGVpciBjb2VyY2VkIHN0cmluZyB2YWx1ZXMgKi9cbiAgdmFyIHJlRmxhZ3MgPSAvXFx3KiQvO1xuXG4gIC8qKiBVc2VkIHRvIGRldGVjdGVkIG5hbWVkIGZ1bmN0aW9ucyAqL1xuICB2YXIgcmVGdW5jTmFtZSA9IC9eXFxzKmZ1bmN0aW9uWyBcXG5cXHJcXHRdK1xcdy87XG5cbiAgLyoqIFVzZWQgdG8gbWF0Y2ggXCJpbnRlcnBvbGF0ZVwiIHRlbXBsYXRlIGRlbGltaXRlcnMgKi9cbiAgdmFyIHJlSW50ZXJwb2xhdGUgPSAvPCU9KFtcXHNcXFNdKz8pJT4vZztcblxuICAvKiogVXNlZCB0byBtYXRjaCBsZWFkaW5nIHdoaXRlc3BhY2UgYW5kIHplcm9zIHRvIGJlIHJlbW92ZWQgKi9cbiAgdmFyIHJlTGVhZGluZ1NwYWNlc0FuZFplcm9zID0gUmVnRXhwKCdeWycgKyB3aGl0ZXNwYWNlICsgJ10qMCsoPz0uJCknKTtcblxuICAvKiogVXNlZCB0byBlbnN1cmUgY2FwdHVyaW5nIG9yZGVyIG9mIHRlbXBsYXRlIGRlbGltaXRlcnMgKi9cbiAgdmFyIHJlTm9NYXRjaCA9IC8oJF4pLztcblxuICAvKiogVXNlZCB0byBkZXRlY3QgZnVuY3Rpb25zIGNvbnRhaW5pbmcgYSBgdGhpc2AgcmVmZXJlbmNlICovXG4gIHZhciByZVRoaXMgPSAvXFxidGhpc1xcYi87XG5cbiAgLyoqIFVzZWQgdG8gbWF0Y2ggdW5lc2NhcGVkIGNoYXJhY3RlcnMgaW4gY29tcGlsZWQgc3RyaW5nIGxpdGVyYWxzICovXG4gIHZhciByZVVuZXNjYXBlZFN0cmluZyA9IC9bJ1xcblxcclxcdFxcdTIwMjhcXHUyMDI5XFxcXF0vZztcblxuICAvKiogVXNlZCB0byBhc3NpZ24gZGVmYXVsdCBgY29udGV4dGAgb2JqZWN0IHByb3BlcnRpZXMgKi9cbiAgdmFyIGNvbnRleHRQcm9wcyA9IFtcbiAgICAnQXJyYXknLCAnQm9vbGVhbicsICdEYXRlJywgJ0Z1bmN0aW9uJywgJ01hdGgnLCAnTnVtYmVyJywgJ09iamVjdCcsXG4gICAgJ1JlZ0V4cCcsICdTdHJpbmcnLCAnXycsICdhdHRhY2hFdmVudCcsICdjbGVhclRpbWVvdXQnLCAnaXNGaW5pdGUnLCAnaXNOYU4nLFxuICAgICdwYXJzZUludCcsICdzZXRUaW1lb3V0J1xuICBdO1xuXG4gIC8qKiBVc2VkIHRvIG1ha2UgdGVtcGxhdGUgc291cmNlVVJMcyBlYXNpZXIgdG8gaWRlbnRpZnkgKi9cbiAgdmFyIHRlbXBsYXRlQ291bnRlciA9IDA7XG5cbiAgLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCBzaG9ydGN1dHMgKi9cbiAgdmFyIGFyZ3NDbGFzcyA9ICdbb2JqZWN0IEFyZ3VtZW50c10nLFxuICAgICAgYXJyYXlDbGFzcyA9ICdbb2JqZWN0IEFycmF5XScsXG4gICAgICBib29sQ2xhc3MgPSAnW29iamVjdCBCb29sZWFuXScsXG4gICAgICBkYXRlQ2xhc3MgPSAnW29iamVjdCBEYXRlXScsXG4gICAgICBmdW5jQ2xhc3MgPSAnW29iamVjdCBGdW5jdGlvbl0nLFxuICAgICAgbnVtYmVyQ2xhc3MgPSAnW29iamVjdCBOdW1iZXJdJyxcbiAgICAgIG9iamVjdENsYXNzID0gJ1tvYmplY3QgT2JqZWN0XScsXG4gICAgICByZWdleHBDbGFzcyA9ICdbb2JqZWN0IFJlZ0V4cF0nLFxuICAgICAgc3RyaW5nQ2xhc3MgPSAnW29iamVjdCBTdHJpbmddJztcblxuICAvKiogVXNlZCB0byBpZGVudGlmeSBvYmplY3QgY2xhc3NpZmljYXRpb25zIHRoYXQgYF8uY2xvbmVgIHN1cHBvcnRzICovXG4gIHZhciBjbG9uZWFibGVDbGFzc2VzID0ge307XG4gIGNsb25lYWJsZUNsYXNzZXNbZnVuY0NsYXNzXSA9IGZhbHNlO1xuICBjbG9uZWFibGVDbGFzc2VzW2FyZ3NDbGFzc10gPSBjbG9uZWFibGVDbGFzc2VzW2FycmF5Q2xhc3NdID1cbiAgY2xvbmVhYmxlQ2xhc3Nlc1tib29sQ2xhc3NdID0gY2xvbmVhYmxlQ2xhc3Nlc1tkYXRlQ2xhc3NdID1cbiAgY2xvbmVhYmxlQ2xhc3Nlc1tudW1iZXJDbGFzc10gPSBjbG9uZWFibGVDbGFzc2VzW29iamVjdENsYXNzXSA9XG4gIGNsb25lYWJsZUNsYXNzZXNbcmVnZXhwQ2xhc3NdID0gY2xvbmVhYmxlQ2xhc3Nlc1tzdHJpbmdDbGFzc10gPSB0cnVlO1xuXG4gIC8qKiBVc2VkIGFzIGFuIGludGVybmFsIGBfLmRlYm91bmNlYCBvcHRpb25zIG9iamVjdCAqL1xuICB2YXIgZGVib3VuY2VPcHRpb25zID0ge1xuICAgICdsZWFkaW5nJzogZmFsc2UsXG4gICAgJ21heFdhaXQnOiAwLFxuICAgICd0cmFpbGluZyc6IGZhbHNlXG4gIH07XG5cbiAgLyoqIFVzZWQgYXMgdGhlIHByb3BlcnR5IGRlc2NyaXB0b3IgZm9yIGBfX2JpbmREYXRhX19gICovXG4gIHZhciBkZXNjcmlwdG9yID0ge1xuICAgICdjb25maWd1cmFibGUnOiBmYWxzZSxcbiAgICAnZW51bWVyYWJsZSc6IGZhbHNlLFxuICAgICd2YWx1ZSc6IG51bGwsXG4gICAgJ3dyaXRhYmxlJzogZmFsc2VcbiAgfTtcblxuICAvKiogVXNlZCB0byBkZXRlcm1pbmUgaWYgdmFsdWVzIGFyZSBvZiB0aGUgbGFuZ3VhZ2UgdHlwZSBPYmplY3QgKi9cbiAgdmFyIG9iamVjdFR5cGVzID0ge1xuICAgICdib29sZWFuJzogZmFsc2UsXG4gICAgJ2Z1bmN0aW9uJzogdHJ1ZSxcbiAgICAnb2JqZWN0JzogdHJ1ZSxcbiAgICAnbnVtYmVyJzogZmFsc2UsXG4gICAgJ3N0cmluZyc6IGZhbHNlLFxuICAgICd1bmRlZmluZWQnOiBmYWxzZVxuICB9O1xuXG4gIC8qKiBVc2VkIHRvIGVzY2FwZSBjaGFyYWN0ZXJzIGZvciBpbmNsdXNpb24gaW4gY29tcGlsZWQgc3RyaW5nIGxpdGVyYWxzICovXG4gIHZhciBzdHJpbmdFc2NhcGVzID0ge1xuICAgICdcXFxcJzogJ1xcXFwnLFxuICAgIFwiJ1wiOiBcIidcIixcbiAgICAnXFxuJzogJ24nLFxuICAgICdcXHInOiAncicsXG4gICAgJ1xcdCc6ICd0JyxcbiAgICAnXFx1MjAyOCc6ICd1MjAyOCcsXG4gICAgJ1xcdTIwMjknOiAndTIwMjknXG4gIH07XG5cbiAgLyoqIFVzZWQgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGdsb2JhbCBvYmplY3QgKi9cbiAgdmFyIHJvb3QgPSAob2JqZWN0VHlwZXNbdHlwZW9mIHdpbmRvd10gJiYgd2luZG93KSB8fCB0aGlzO1xuXG4gIC8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgZXhwb3J0c2AgKi9cbiAgdmFyIGZyZWVFeHBvcnRzID0gb2JqZWN0VHlwZXNbdHlwZW9mIGV4cG9ydHNdICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUgJiYgZXhwb3J0cztcblxuICAvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYG1vZHVsZWAgKi9cbiAgdmFyIGZyZWVNb2R1bGUgPSBvYmplY3RUeXBlc1t0eXBlb2YgbW9kdWxlXSAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSAmJiBtb2R1bGU7XG5cbiAgLyoqIERldGVjdCB0aGUgcG9wdWxhciBDb21tb25KUyBleHRlbnNpb24gYG1vZHVsZS5leHBvcnRzYCAqL1xuICB2YXIgbW9kdWxlRXhwb3J0cyA9IGZyZWVNb2R1bGUgJiYgZnJlZU1vZHVsZS5leHBvcnRzID09PSBmcmVlRXhwb3J0cyAmJiBmcmVlRXhwb3J0cztcblxuICAvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYGdsb2JhbGAgZnJvbSBOb2RlLmpzIG9yIEJyb3dzZXJpZmllZCBjb2RlIGFuZCB1c2UgaXQgYXMgYHJvb3RgICovXG4gIHZhciBmcmVlR2xvYmFsID0gb2JqZWN0VHlwZXNbdHlwZW9mIGdsb2JhbF0gJiYgZ2xvYmFsO1xuICBpZiAoZnJlZUdsb2JhbCAmJiAoZnJlZUdsb2JhbC5nbG9iYWwgPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbC53aW5kb3cgPT09IGZyZWVHbG9iYWwpKSB7XG4gICAgcm9vdCA9IGZyZWVHbG9iYWw7XG4gIH1cblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uaW5kZXhPZmAgd2l0aG91dCBzdXBwb3J0IGZvciBiaW5hcnkgc2VhcmNoZXNcbiAgICogb3IgYGZyb21JbmRleGAgY29uc3RyYWludHMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBzZWFyY2guXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHNlYXJjaCBmb3IuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbZnJvbUluZGV4PTBdIFRoZSBpbmRleCB0byBzZWFyY2ggZnJvbS5cbiAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIG1hdGNoZWQgdmFsdWUgb3IgYC0xYC5cbiAgICovXG4gIGZ1bmN0aW9uIGJhc2VJbmRleE9mKGFycmF5LCB2YWx1ZSwgZnJvbUluZGV4KSB7XG4gICAgdmFyIGluZGV4ID0gKGZyb21JbmRleCB8fCAwKSAtIDEsXG4gICAgICAgIGxlbmd0aCA9IGFycmF5ID8gYXJyYXkubGVuZ3RoIDogMDtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICBpZiAoYXJyYXlbaW5kZXhdID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gaW5kZXg7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiBgXy5jb250YWluc2AgZm9yIGNhY2hlIG9iamVjdHMgdGhhdCBtaW1pY3MgdGhlIHJldHVyblxuICAgKiBzaWduYXR1cmUgb2YgYF8uaW5kZXhPZmAgYnkgcmV0dXJuaW5nIGAwYCBpZiB0aGUgdmFsdWUgaXMgZm91bmQsIGVsc2UgYC0xYC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IGNhY2hlIFRoZSBjYWNoZSBvYmplY3QgdG8gaW5zcGVjdC5cbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2VhcmNoIGZvci5cbiAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyBgMGAgaWYgYHZhbHVlYCBpcyBmb3VuZCwgZWxzZSBgLTFgLlxuICAgKi9cbiAgZnVuY3Rpb24gY2FjaGVJbmRleE9mKGNhY2hlLCB2YWx1ZSkge1xuICAgIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICAgIGNhY2hlID0gY2FjaGUuY2FjaGU7XG5cbiAgICBpZiAodHlwZSA9PSAnYm9vbGVhbicgfHwgdmFsdWUgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGNhY2hlW3ZhbHVlXSA/IDAgOiAtMTtcbiAgICB9XG4gICAgaWYgKHR5cGUgIT0gJ251bWJlcicgJiYgdHlwZSAhPSAnc3RyaW5nJykge1xuICAgICAgdHlwZSA9ICdvYmplY3QnO1xuICAgIH1cbiAgICB2YXIga2V5ID0gdHlwZSA9PSAnbnVtYmVyJyA/IHZhbHVlIDoga2V5UHJlZml4ICsgdmFsdWU7XG4gICAgY2FjaGUgPSAoY2FjaGUgPSBjYWNoZVt0eXBlXSkgJiYgY2FjaGVba2V5XTtcblxuICAgIHJldHVybiB0eXBlID09ICdvYmplY3QnXG4gICAgICA/IChjYWNoZSAmJiBiYXNlSW5kZXhPZihjYWNoZSwgdmFsdWUpID4gLTEgPyAwIDogLTEpXG4gICAgICA6IChjYWNoZSA/IDAgOiAtMSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIGdpdmVuIHZhbHVlIHRvIHRoZSBjb3JyZXNwb25kaW5nIGNhY2hlIG9iamVjdC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gYWRkIHRvIHRoZSBjYWNoZS5cbiAgICovXG4gIGZ1bmN0aW9uIGNhY2hlUHVzaCh2YWx1ZSkge1xuICAgIHZhciBjYWNoZSA9IHRoaXMuY2FjaGUsXG4gICAgICAgIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG5cbiAgICBpZiAodHlwZSA9PSAnYm9vbGVhbicgfHwgdmFsdWUgPT0gbnVsbCkge1xuICAgICAgY2FjaGVbdmFsdWVdID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGUgIT0gJ251bWJlcicgJiYgdHlwZSAhPSAnc3RyaW5nJykge1xuICAgICAgICB0eXBlID0gJ29iamVjdCc7XG4gICAgICB9XG4gICAgICB2YXIga2V5ID0gdHlwZSA9PSAnbnVtYmVyJyA/IHZhbHVlIDoga2V5UHJlZml4ICsgdmFsdWUsXG4gICAgICAgICAgdHlwZUNhY2hlID0gY2FjaGVbdHlwZV0gfHwgKGNhY2hlW3R5cGVdID0ge30pO1xuXG4gICAgICBpZiAodHlwZSA9PSAnb2JqZWN0Jykge1xuICAgICAgICAodHlwZUNhY2hlW2tleV0gfHwgKHR5cGVDYWNoZVtrZXldID0gW10pKS5wdXNoKHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHR5cGVDYWNoZVtrZXldID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXNlZCBieSBgXy5tYXhgIGFuZCBgXy5taW5gIGFzIHRoZSBkZWZhdWx0IGNhbGxiYWNrIHdoZW4gYSBnaXZlblxuICAgKiBjb2xsZWN0aW9uIGlzIGEgc3RyaW5nIHZhbHVlLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgVGhlIGNoYXJhY3RlciB0byBpbnNwZWN0LlxuICAgKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSBjb2RlIHVuaXQgb2YgZ2l2ZW4gY2hhcmFjdGVyLlxuICAgKi9cbiAgZnVuY3Rpb24gY2hhckF0Q2FsbGJhY2sodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUuY2hhckNvZGVBdCgwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVc2VkIGJ5IGBzb3J0QnlgIHRvIGNvbXBhcmUgdHJhbnNmb3JtZWQgYGNvbGxlY3Rpb25gIGVsZW1lbnRzLCBzdGFibGUgc29ydGluZ1xuICAgKiB0aGVtIGluIGFzY2VuZGluZyBvcmRlci5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IGEgVGhlIG9iamVjdCB0byBjb21wYXJlIHRvIGBiYC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGIgVGhlIG9iamVjdCB0byBjb21wYXJlIHRvIGBhYC5cbiAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgc29ydCBvcmRlciBpbmRpY2F0b3Igb2YgYDFgIG9yIGAtMWAuXG4gICAqL1xuICBmdW5jdGlvbiBjb21wYXJlQXNjZW5kaW5nKGEsIGIpIHtcbiAgICB2YXIgYWMgPSBhLmNyaXRlcmlhLFxuICAgICAgICBiYyA9IGIuY3JpdGVyaWEsXG4gICAgICAgIGluZGV4ID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IGFjLmxlbmd0aDtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICB2YXIgdmFsdWUgPSBhY1tpbmRleF0sXG4gICAgICAgICAgb3RoZXIgPSBiY1tpbmRleF07XG5cbiAgICAgIGlmICh2YWx1ZSAhPT0gb3RoZXIpIHtcbiAgICAgICAgaWYgKHZhbHVlID4gb3RoZXIgfHwgdHlwZW9mIHZhbHVlID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlIDwgb3RoZXIgfHwgdHlwZW9mIG90aGVyID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEZpeGVzIGFuIGBBcnJheSNzb3J0YCBidWcgaW4gdGhlIEpTIGVuZ2luZSBlbWJlZGRlZCBpbiBBZG9iZSBhcHBsaWNhdGlvbnNcbiAgICAvLyB0aGF0IGNhdXNlcyBpdCwgdW5kZXIgY2VydGFpbiBjaXJjdW1zdGFuY2VzLCB0byByZXR1cm4gdGhlIHNhbWUgdmFsdWUgZm9yXG4gICAgLy8gYGFgIGFuZCBgYmAuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vamFzaGtlbmFzL3VuZGVyc2NvcmUvcHVsbC8xMjQ3XG4gICAgLy9cbiAgICAvLyBUaGlzIGFsc28gZW5zdXJlcyBhIHN0YWJsZSBzb3J0IGluIFY4IGFuZCBvdGhlciBlbmdpbmVzLlxuICAgIC8vIFNlZSBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD05MFxuICAgIHJldHVybiBhLmluZGV4IC0gYi5pbmRleDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgY2FjaGUgb2JqZWN0IHRvIG9wdGltaXplIGxpbmVhciBzZWFyY2hlcyBvZiBsYXJnZSBhcnJheXMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl9IFthcnJheT1bXV0gVGhlIGFycmF5IHRvIHNlYXJjaC5cbiAgICogQHJldHVybnMge251bGx8T2JqZWN0fSBSZXR1cm5zIHRoZSBjYWNoZSBvYmplY3Qgb3IgYG51bGxgIGlmIGNhY2hpbmcgc2hvdWxkIG5vdCBiZSB1c2VkLlxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQ2FjaGUoYXJyYXkpIHtcbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICBmaXJzdCA9IGFycmF5WzBdLFxuICAgICAgICBtaWQgPSBhcnJheVsobGVuZ3RoIC8gMikgfCAwXSxcbiAgICAgICAgbGFzdCA9IGFycmF5W2xlbmd0aCAtIDFdO1xuXG4gICAgaWYgKGZpcnN0ICYmIHR5cGVvZiBmaXJzdCA9PSAnb2JqZWN0JyAmJlxuICAgICAgICBtaWQgJiYgdHlwZW9mIG1pZCA9PSAnb2JqZWN0JyAmJiBsYXN0ICYmIHR5cGVvZiBsYXN0ID09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciBjYWNoZSA9IGdldE9iamVjdCgpO1xuICAgIGNhY2hlWydmYWxzZSddID0gY2FjaGVbJ251bGwnXSA9IGNhY2hlWyd0cnVlJ10gPSBjYWNoZVsndW5kZWZpbmVkJ10gPSBmYWxzZTtcblxuICAgIHZhciByZXN1bHQgPSBnZXRPYmplY3QoKTtcbiAgICByZXN1bHQuYXJyYXkgPSBhcnJheTtcbiAgICByZXN1bHQuY2FjaGUgPSBjYWNoZTtcbiAgICByZXN1bHQucHVzaCA9IGNhY2hlUHVzaDtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICByZXN1bHQucHVzaChhcnJheVtpbmRleF0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIFVzZWQgYnkgYHRlbXBsYXRlYCB0byBlc2NhcGUgY2hhcmFjdGVycyBmb3IgaW5jbHVzaW9uIGluIGNvbXBpbGVkXG4gICAqIHN0cmluZyBsaXRlcmFscy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1hdGNoIFRoZSBtYXRjaGVkIGNoYXJhY3RlciB0byBlc2NhcGUuXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIGVzY2FwZWQgY2hhcmFjdGVyLlxuICAgKi9cbiAgZnVuY3Rpb24gZXNjYXBlU3RyaW5nQ2hhcihtYXRjaCkge1xuICAgIHJldHVybiAnXFxcXCcgKyBzdHJpbmdFc2NhcGVzW21hdGNoXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGFuIGFycmF5IGZyb20gdGhlIGFycmF5IHBvb2wgb3IgY3JlYXRlcyBhIG5ldyBvbmUgaWYgdGhlIHBvb2wgaXMgZW1wdHkuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEByZXR1cm5zIHtBcnJheX0gVGhlIGFycmF5IGZyb20gdGhlIHBvb2wuXG4gICAqL1xuICBmdW5jdGlvbiBnZXRBcnJheSgpIHtcbiAgICByZXR1cm4gYXJyYXlQb29sLnBvcCgpIHx8IFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYW4gb2JqZWN0IGZyb20gdGhlIG9iamVjdCBwb29sIG9yIGNyZWF0ZXMgYSBuZXcgb25lIGlmIHRoZSBwb29sIGlzIGVtcHR5LlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgb2JqZWN0IGZyb20gdGhlIHBvb2wuXG4gICAqL1xuICBmdW5jdGlvbiBnZXRPYmplY3QoKSB7XG4gICAgcmV0dXJuIG9iamVjdFBvb2wucG9wKCkgfHwge1xuICAgICAgJ2FycmF5JzogbnVsbCxcbiAgICAgICdjYWNoZSc6IG51bGwsXG4gICAgICAnY3JpdGVyaWEnOiBudWxsLFxuICAgICAgJ2ZhbHNlJzogZmFsc2UsXG4gICAgICAnaW5kZXgnOiAwLFxuICAgICAgJ251bGwnOiBmYWxzZSxcbiAgICAgICdudW1iZXInOiBudWxsLFxuICAgICAgJ29iamVjdCc6IG51bGwsXG4gICAgICAncHVzaCc6IG51bGwsXG4gICAgICAnc3RyaW5nJzogbnVsbCxcbiAgICAgICd0cnVlJzogZmFsc2UsXG4gICAgICAndW5kZWZpbmVkJzogZmFsc2UsXG4gICAgICAndmFsdWUnOiBudWxsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWxlYXNlcyB0aGUgZ2l2ZW4gYXJyYXkgYmFjayB0byB0aGUgYXJyYXkgcG9vbC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtBcnJheX0gW2FycmF5XSBUaGUgYXJyYXkgdG8gcmVsZWFzZS5cbiAgICovXG4gIGZ1bmN0aW9uIHJlbGVhc2VBcnJheShhcnJheSkge1xuICAgIGFycmF5Lmxlbmd0aCA9IDA7XG4gICAgaWYgKGFycmF5UG9vbC5sZW5ndGggPCBtYXhQb29sU2l6ZSkge1xuICAgICAgYXJyYXlQb29sLnB1c2goYXJyYXkpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWxlYXNlcyB0aGUgZ2l2ZW4gb2JqZWN0IGJhY2sgdG8gdGhlIG9iamVjdCBwb29sLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gW29iamVjdF0gVGhlIG9iamVjdCB0byByZWxlYXNlLlxuICAgKi9cbiAgZnVuY3Rpb24gcmVsZWFzZU9iamVjdChvYmplY3QpIHtcbiAgICB2YXIgY2FjaGUgPSBvYmplY3QuY2FjaGU7XG4gICAgaWYgKGNhY2hlKSB7XG4gICAgICByZWxlYXNlT2JqZWN0KGNhY2hlKTtcbiAgICB9XG4gICAgb2JqZWN0LmFycmF5ID0gb2JqZWN0LmNhY2hlID0gb2JqZWN0LmNyaXRlcmlhID0gb2JqZWN0Lm9iamVjdCA9IG9iamVjdC5udW1iZXIgPSBvYmplY3Quc3RyaW5nID0gb2JqZWN0LnZhbHVlID0gbnVsbDtcbiAgICBpZiAob2JqZWN0UG9vbC5sZW5ndGggPCBtYXhQb29sU2l6ZSkge1xuICAgICAgb2JqZWN0UG9vbC5wdXNoKG9iamVjdCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNsaWNlcyB0aGUgYGNvbGxlY3Rpb25gIGZyb20gdGhlIGBzdGFydGAgaW5kZXggdXAgdG8sIGJ1dCBub3QgaW5jbHVkaW5nLFxuICAgKiB0aGUgYGVuZGAgaW5kZXguXG4gICAqXG4gICAqIE5vdGU6IFRoaXMgZnVuY3Rpb24gaXMgdXNlZCBpbnN0ZWFkIG9mIGBBcnJheSNzbGljZWAgdG8gc3VwcG9ydCBub2RlIGxpc3RzXG4gICAqIGluIElFIDwgOSBhbmQgdG8gZW5zdXJlIGRlbnNlIGFycmF5cyBhcmUgcmV0dXJuZWQuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBzbGljZS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IFRoZSBzdGFydCBpbmRleC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGVuZCBUaGUgZW5kIGluZGV4LlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIG5ldyBhcnJheS5cbiAgICovXG4gIGZ1bmN0aW9uIHNsaWNlKGFycmF5LCBzdGFydCwgZW5kKSB7XG4gICAgc3RhcnQgfHwgKHN0YXJ0ID0gMCk7XG4gICAgaWYgKHR5cGVvZiBlbmQgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGVuZCA9IGFycmF5ID8gYXJyYXkubGVuZ3RoIDogMDtcbiAgICB9XG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IGVuZCAtIHN0YXJ0IHx8IDAsXG4gICAgICAgIHJlc3VsdCA9IEFycmF5KGxlbmd0aCA8IDAgPyAwIDogbGVuZ3RoKTtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICByZXN1bHRbaW5kZXhdID0gYXJyYXlbc3RhcnQgKyBpbmRleF07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IGBsb2Rhc2hgIGZ1bmN0aW9uIHVzaW5nIHRoZSBnaXZlbiBjb250ZXh0IG9iamVjdC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbY29udGV4dD1yb290XSBUaGUgY29udGV4dCBvYmplY3QuXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgYGxvZGFzaGAgZnVuY3Rpb24uXG4gICAqL1xuICBmdW5jdGlvbiBydW5JbkNvbnRleHQoY29udGV4dCkge1xuICAgIC8vIEF2b2lkIGlzc3VlcyB3aXRoIHNvbWUgRVMzIGVudmlyb25tZW50cyB0aGF0IGF0dGVtcHQgdG8gdXNlIHZhbHVlcywgbmFtZWRcbiAgICAvLyBhZnRlciBidWlsdC1pbiBjb25zdHJ1Y3RvcnMgbGlrZSBgT2JqZWN0YCwgZm9yIHRoZSBjcmVhdGlvbiBvZiBsaXRlcmFscy5cbiAgICAvLyBFUzUgY2xlYXJzIHRoaXMgdXAgYnkgc3RhdGluZyB0aGF0IGxpdGVyYWxzIG11c3QgdXNlIGJ1aWx0LWluIGNvbnN0cnVjdG9ycy5cbiAgICAvLyBTZWUgaHR0cDovL2VzNS5naXRodWIuaW8vI3gxMS4xLjUuXG4gICAgY29udGV4dCA9IGNvbnRleHQgPyBfLmRlZmF1bHRzKHJvb3QuT2JqZWN0KCksIGNvbnRleHQsIF8ucGljayhyb290LCBjb250ZXh0UHJvcHMpKSA6IHJvb3Q7XG5cbiAgICAvKiogTmF0aXZlIGNvbnN0cnVjdG9yIHJlZmVyZW5jZXMgKi9cbiAgICB2YXIgQXJyYXkgPSBjb250ZXh0LkFycmF5LFxuICAgICAgICBCb29sZWFuID0gY29udGV4dC5Cb29sZWFuLFxuICAgICAgICBEYXRlID0gY29udGV4dC5EYXRlLFxuICAgICAgICBGdW5jdGlvbiA9IGNvbnRleHQuRnVuY3Rpb24sXG4gICAgICAgIE1hdGggPSBjb250ZXh0Lk1hdGgsXG4gICAgICAgIE51bWJlciA9IGNvbnRleHQuTnVtYmVyLFxuICAgICAgICBPYmplY3QgPSBjb250ZXh0Lk9iamVjdCxcbiAgICAgICAgUmVnRXhwID0gY29udGV4dC5SZWdFeHAsXG4gICAgICAgIFN0cmluZyA9IGNvbnRleHQuU3RyaW5nLFxuICAgICAgICBUeXBlRXJyb3IgPSBjb250ZXh0LlR5cGVFcnJvcjtcblxuICAgIC8qKlxuICAgICAqIFVzZWQgZm9yIGBBcnJheWAgbWV0aG9kIHJlZmVyZW5jZXMuXG4gICAgICpcbiAgICAgKiBOb3JtYWxseSBgQXJyYXkucHJvdG90eXBlYCB3b3VsZCBzdWZmaWNlLCBob3dldmVyLCB1c2luZyBhbiBhcnJheSBsaXRlcmFsXG4gICAgICogYXZvaWRzIGlzc3VlcyBpbiBOYXJ3aGFsLlxuICAgICAqL1xuICAgIHZhciBhcnJheVJlZiA9IFtdO1xuXG4gICAgLyoqIFVzZWQgZm9yIG5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcyAqL1xuICAgIHZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbiAgICAvKiogVXNlZCB0byByZXN0b3JlIHRoZSBvcmlnaW5hbCBgX2AgcmVmZXJlbmNlIGluIGBub0NvbmZsaWN0YCAqL1xuICAgIHZhciBvbGREYXNoID0gY29udGV4dC5fO1xuXG4gICAgLyoqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgaW50ZXJuYWwgW1tDbGFzc11dIG9mIHZhbHVlcyAqL1xuICAgIHZhciB0b1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuXG4gICAgLyoqIFVzZWQgdG8gZGV0ZWN0IGlmIGEgbWV0aG9kIGlzIG5hdGl2ZSAqL1xuICAgIHZhciByZU5hdGl2ZSA9IFJlZ0V4cCgnXicgK1xuICAgICAgU3RyaW5nKHRvU3RyaW5nKVxuICAgICAgICAucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csICdcXFxcJCYnKVxuICAgICAgICAucmVwbGFjZSgvdG9TdHJpbmd8IGZvciBbXlxcXV0rL2csICcuKj8nKSArICckJ1xuICAgICk7XG5cbiAgICAvKiogTmF0aXZlIG1ldGhvZCBzaG9ydGN1dHMgKi9cbiAgICB2YXIgY2VpbCA9IE1hdGguY2VpbCxcbiAgICAgICAgY2xlYXJUaW1lb3V0ID0gY29udGV4dC5jbGVhclRpbWVvdXQsXG4gICAgICAgIGZsb29yID0gTWF0aC5mbG9vcixcbiAgICAgICAgZm5Ub1N0cmluZyA9IEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZyxcbiAgICAgICAgZ2V0UHJvdG90eXBlT2YgPSBpc05hdGl2ZShnZXRQcm90b3R5cGVPZiA9IE9iamVjdC5nZXRQcm90b3R5cGVPZikgJiYgZ2V0UHJvdG90eXBlT2YsXG4gICAgICAgIGhhc093blByb3BlcnR5ID0gb2JqZWN0UHJvdG8uaGFzT3duUHJvcGVydHksXG4gICAgICAgIHB1c2ggPSBhcnJheVJlZi5wdXNoLFxuICAgICAgICBzZXRUaW1lb3V0ID0gY29udGV4dC5zZXRUaW1lb3V0LFxuICAgICAgICBzcGxpY2UgPSBhcnJheVJlZi5zcGxpY2UsXG4gICAgICAgIHVuc2hpZnQgPSBhcnJheVJlZi51bnNoaWZ0O1xuXG4gICAgLyoqIFVzZWQgdG8gc2V0IG1ldGEgZGF0YSBvbiBmdW5jdGlvbnMgKi9cbiAgICB2YXIgZGVmaW5lUHJvcGVydHkgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAvLyBJRSA4IG9ubHkgYWNjZXB0cyBET00gZWxlbWVudHNcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBvID0ge30sXG4gICAgICAgICAgICBmdW5jID0gaXNOYXRpdmUoZnVuYyA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgJiYgZnVuYyxcbiAgICAgICAgICAgIHJlc3VsdCA9IGZ1bmMobywgbywgbykgJiYgZnVuYztcbiAgICAgIH0gY2F0Y2goZSkgeyB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0oKSk7XG5cbiAgICAvKiBOYXRpdmUgbWV0aG9kIHNob3J0Y3V0cyBmb3IgbWV0aG9kcyB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcyAqL1xuICAgIHZhciBuYXRpdmVDcmVhdGUgPSBpc05hdGl2ZShuYXRpdmVDcmVhdGUgPSBPYmplY3QuY3JlYXRlKSAmJiBuYXRpdmVDcmVhdGUsXG4gICAgICAgIG5hdGl2ZUlzQXJyYXkgPSBpc05hdGl2ZShuYXRpdmVJc0FycmF5ID0gQXJyYXkuaXNBcnJheSkgJiYgbmF0aXZlSXNBcnJheSxcbiAgICAgICAgbmF0aXZlSXNGaW5pdGUgPSBjb250ZXh0LmlzRmluaXRlLFxuICAgICAgICBuYXRpdmVJc05hTiA9IGNvbnRleHQuaXNOYU4sXG4gICAgICAgIG5hdGl2ZUtleXMgPSBpc05hdGl2ZShuYXRpdmVLZXlzID0gT2JqZWN0LmtleXMpICYmIG5hdGl2ZUtleXMsXG4gICAgICAgIG5hdGl2ZU1heCA9IE1hdGgubWF4LFxuICAgICAgICBuYXRpdmVNaW4gPSBNYXRoLm1pbixcbiAgICAgICAgbmF0aXZlUGFyc2VJbnQgPSBjb250ZXh0LnBhcnNlSW50LFxuICAgICAgICBuYXRpdmVSYW5kb20gPSBNYXRoLnJhbmRvbTtcblxuICAgIC8qKiBVc2VkIHRvIGxvb2t1cCBhIGJ1aWx0LWluIGNvbnN0cnVjdG9yIGJ5IFtbQ2xhc3NdXSAqL1xuICAgIHZhciBjdG9yQnlDbGFzcyA9IHt9O1xuICAgIGN0b3JCeUNsYXNzW2FycmF5Q2xhc3NdID0gQXJyYXk7XG4gICAgY3RvckJ5Q2xhc3NbYm9vbENsYXNzXSA9IEJvb2xlYW47XG4gICAgY3RvckJ5Q2xhc3NbZGF0ZUNsYXNzXSA9IERhdGU7XG4gICAgY3RvckJ5Q2xhc3NbZnVuY0NsYXNzXSA9IEZ1bmN0aW9uO1xuICAgIGN0b3JCeUNsYXNzW29iamVjdENsYXNzXSA9IE9iamVjdDtcbiAgICBjdG9yQnlDbGFzc1tudW1iZXJDbGFzc10gPSBOdW1iZXI7XG4gICAgY3RvckJ5Q2xhc3NbcmVnZXhwQ2xhc3NdID0gUmVnRXhwO1xuICAgIGN0b3JCeUNsYXNzW3N0cmluZ0NsYXNzXSA9IFN0cmluZztcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGBsb2Rhc2hgIG9iamVjdCB3aGljaCB3cmFwcyB0aGUgZ2l2ZW4gdmFsdWUgdG8gZW5hYmxlIGludHVpdGl2ZVxuICAgICAqIG1ldGhvZCBjaGFpbmluZy5cbiAgICAgKlxuICAgICAqIEluIGFkZGl0aW9uIHRvIExvLURhc2ggbWV0aG9kcywgd3JhcHBlcnMgYWxzbyBoYXZlIHRoZSBmb2xsb3dpbmcgYEFycmF5YCBtZXRob2RzOlxuICAgICAqIGBjb25jYXRgLCBgam9pbmAsIGBwb3BgLCBgcHVzaGAsIGByZXZlcnNlYCwgYHNoaWZ0YCwgYHNsaWNlYCwgYHNvcnRgLCBgc3BsaWNlYCxcbiAgICAgKiBhbmQgYHVuc2hpZnRgXG4gICAgICpcbiAgICAgKiBDaGFpbmluZyBpcyBzdXBwb3J0ZWQgaW4gY3VzdG9tIGJ1aWxkcyBhcyBsb25nIGFzIHRoZSBgdmFsdWVgIG1ldGhvZCBpc1xuICAgICAqIGltcGxpY2l0bHkgb3IgZXhwbGljaXRseSBpbmNsdWRlZCBpbiB0aGUgYnVpbGQuXG4gICAgICpcbiAgICAgKiBUaGUgY2hhaW5hYmxlIHdyYXBwZXIgZnVuY3Rpb25zIGFyZTpcbiAgICAgKiBgYWZ0ZXJgLCBgYXNzaWduYCwgYGJpbmRgLCBgYmluZEFsbGAsIGBiaW5kS2V5YCwgYGNoYWluYCwgYGNvbXBhY3RgLFxuICAgICAqIGBjb21wb3NlYCwgYGNvbmNhdGAsIGBjb3VudEJ5YCwgYGNyZWF0ZWAsIGBjcmVhdGVDYWxsYmFja2AsIGBjdXJyeWAsXG4gICAgICogYGRlYm91bmNlYCwgYGRlZmF1bHRzYCwgYGRlZmVyYCwgYGRlbGF5YCwgYGRpZmZlcmVuY2VgLCBgZmlsdGVyYCwgYGZsYXR0ZW5gLFxuICAgICAqIGBmb3JFYWNoYCwgYGZvckVhY2hSaWdodGAsIGBmb3JJbmAsIGBmb3JJblJpZ2h0YCwgYGZvck93bmAsIGBmb3JPd25SaWdodGAsXG4gICAgICogYGZ1bmN0aW9uc2AsIGBncm91cEJ5YCwgYGluZGV4QnlgLCBgaW5pdGlhbGAsIGBpbnRlcnNlY3Rpb25gLCBgaW52ZXJ0YCxcbiAgICAgKiBgaW52b2tlYCwgYGtleXNgLCBgbWFwYCwgYG1heGAsIGBtZW1vaXplYCwgYG1lcmdlYCwgYG1pbmAsIGBvYmplY3RgLCBgb21pdGAsXG4gICAgICogYG9uY2VgLCBgcGFpcnNgLCBgcGFydGlhbGAsIGBwYXJ0aWFsUmlnaHRgLCBgcGlja2AsIGBwbHVja2AsIGBwdWxsYCwgYHB1c2hgLFxuICAgICAqIGByYW5nZWAsIGByZWplY3RgLCBgcmVtb3ZlYCwgYHJlc3RgLCBgcmV2ZXJzZWAsIGBzaHVmZmxlYCwgYHNsaWNlYCwgYHNvcnRgLFxuICAgICAqIGBzb3J0QnlgLCBgc3BsaWNlYCwgYHRhcGAsIGB0aHJvdHRsZWAsIGB0aW1lc2AsIGB0b0FycmF5YCwgYHRyYW5zZm9ybWAsXG4gICAgICogYHVuaW9uYCwgYHVuaXFgLCBgdW5zaGlmdGAsIGB1bnppcGAsIGB2YWx1ZXNgLCBgd2hlcmVgLCBgd2l0aG91dGAsIGB3cmFwYCxcbiAgICAgKiBhbmQgYHppcGBcbiAgICAgKlxuICAgICAqIFRoZSBub24tY2hhaW5hYmxlIHdyYXBwZXIgZnVuY3Rpb25zIGFyZTpcbiAgICAgKiBgY2xvbmVgLCBgY2xvbmVEZWVwYCwgYGNvbnRhaW5zYCwgYGVzY2FwZWAsIGBldmVyeWAsIGBmaW5kYCwgYGZpbmRJbmRleGAsXG4gICAgICogYGZpbmRLZXlgLCBgZmluZExhc3RgLCBgZmluZExhc3RJbmRleGAsIGBmaW5kTGFzdEtleWAsIGBoYXNgLCBgaWRlbnRpdHlgLFxuICAgICAqIGBpbmRleE9mYCwgYGlzQXJndW1lbnRzYCwgYGlzQXJyYXlgLCBgaXNCb29sZWFuYCwgYGlzRGF0ZWAsIGBpc0VsZW1lbnRgLFxuICAgICAqIGBpc0VtcHR5YCwgYGlzRXF1YWxgLCBgaXNGaW5pdGVgLCBgaXNGdW5jdGlvbmAsIGBpc05hTmAsIGBpc051bGxgLCBgaXNOdW1iZXJgLFxuICAgICAqIGBpc09iamVjdGAsIGBpc1BsYWluT2JqZWN0YCwgYGlzUmVnRXhwYCwgYGlzU3RyaW5nYCwgYGlzVW5kZWZpbmVkYCwgYGpvaW5gLFxuICAgICAqIGBsYXN0SW5kZXhPZmAsIGBtaXhpbmAsIGBub0NvbmZsaWN0YCwgYHBhcnNlSW50YCwgYHBvcGAsIGByYW5kb21gLCBgcmVkdWNlYCxcbiAgICAgKiBgcmVkdWNlUmlnaHRgLCBgcmVzdWx0YCwgYHNoaWZ0YCwgYHNpemVgLCBgc29tZWAsIGBzb3J0ZWRJbmRleGAsIGBydW5JbkNvbnRleHRgLFxuICAgICAqIGB0ZW1wbGF0ZWAsIGB1bmVzY2FwZWAsIGB1bmlxdWVJZGAsIGFuZCBgdmFsdWVgXG4gICAgICpcbiAgICAgKiBUaGUgd3JhcHBlciBmdW5jdGlvbnMgYGZpcnN0YCBhbmQgYGxhc3RgIHJldHVybiB3cmFwcGVkIHZhbHVlcyB3aGVuIGBuYCBpc1xuICAgICAqIHByb3ZpZGVkLCBvdGhlcndpc2UgdGhleSByZXR1cm4gdW53cmFwcGVkIHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEV4cGxpY2l0IGNoYWluaW5nIGNhbiBiZSBlbmFibGVkIGJ5IHVzaW5nIHRoZSBgXy5jaGFpbmAgbWV0aG9kLlxuICAgICAqXG4gICAgICogQG5hbWUgX1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBjYXRlZ29yeSBDaGFpbmluZ1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHdyYXAgaW4gYSBgbG9kYXNoYCBpbnN0YW5jZS5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGEgYGxvZGFzaGAgaW5zdGFuY2UuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciB3cmFwcGVkID0gXyhbMSwgMiwgM10pO1xuICAgICAqXG4gICAgICogLy8gcmV0dXJucyBhbiB1bndyYXBwZWQgdmFsdWVcbiAgICAgKiB3cmFwcGVkLnJlZHVjZShmdW5jdGlvbihzdW0sIG51bSkge1xuICAgICAqICAgcmV0dXJuIHN1bSArIG51bTtcbiAgICAgKiB9KTtcbiAgICAgKiAvLyA9PiA2XG4gICAgICpcbiAgICAgKiAvLyByZXR1cm5zIGEgd3JhcHBlZCB2YWx1ZVxuICAgICAqIHZhciBzcXVhcmVzID0gd3JhcHBlZC5tYXAoZnVuY3Rpb24obnVtKSB7XG4gICAgICogICByZXR1cm4gbnVtICogbnVtO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogXy5pc0FycmF5KHNxdWFyZXMpO1xuICAgICAqIC8vID0+IGZhbHNlXG4gICAgICpcbiAgICAgKiBfLmlzQXJyYXkoc3F1YXJlcy52YWx1ZSgpKTtcbiAgICAgKiAvLyA9PiB0cnVlXG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9kYXNoKHZhbHVlKSB7XG4gICAgICAvLyBkb24ndCB3cmFwIGlmIGFscmVhZHkgd3JhcHBlZCwgZXZlbiBpZiB3cmFwcGVkIGJ5IGEgZGlmZmVyZW50IGBsb2Rhc2hgIGNvbnN0cnVjdG9yXG4gICAgICByZXR1cm4gKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyAmJiAhaXNBcnJheSh2YWx1ZSkgJiYgaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwgJ19fd3JhcHBlZF9fJykpXG4gICAgICAgPyB2YWx1ZVxuICAgICAgIDogbmV3IGxvZGFzaFdyYXBwZXIodmFsdWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEEgZmFzdCBwYXRoIGZvciBjcmVhdGluZyBgbG9kYXNoYCB3cmFwcGVyIG9iamVjdHMuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHdyYXAgaW4gYSBgbG9kYXNoYCBpbnN0YW5jZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGNoYWluQWxsIEEgZmxhZyB0byBlbmFibGUgY2hhaW5pbmcgZm9yIGFsbCBtZXRob2RzXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBhIGBsb2Rhc2hgIGluc3RhbmNlLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvZGFzaFdyYXBwZXIodmFsdWUsIGNoYWluQWxsKSB7XG4gICAgICB0aGlzLl9fY2hhaW5fXyA9ICEhY2hhaW5BbGw7XG4gICAgICB0aGlzLl9fd3JhcHBlZF9fID0gdmFsdWU7XG4gICAgfVxuICAgIC8vIGVuc3VyZSBgbmV3IGxvZGFzaFdyYXBwZXJgIGlzIGFuIGluc3RhbmNlIG9mIGBsb2Rhc2hgXG4gICAgbG9kYXNoV3JhcHBlci5wcm90b3R5cGUgPSBsb2Rhc2gucHJvdG90eXBlO1xuXG4gICAgLyoqXG4gICAgICogQW4gb2JqZWN0IHVzZWQgdG8gZmxhZyBlbnZpcm9ubWVudHMgZmVhdHVyZXMuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAdHlwZSBPYmplY3RcbiAgICAgKi9cbiAgICB2YXIgc3VwcG9ydCA9IGxvZGFzaC5zdXBwb3J0ID0ge307XG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3QgaWYgZnVuY3Rpb25zIGNhbiBiZSBkZWNvbXBpbGVkIGJ5IGBGdW5jdGlvbiN0b1N0cmluZ2BcbiAgICAgKiAoYWxsIGJ1dCBQUzMgYW5kIG9sZGVyIE9wZXJhIG1vYmlsZSBicm93c2VycyAmIGF2b2lkZWQgaW4gV2luZG93cyA4IGFwcHMpLlxuICAgICAqXG4gICAgICogQG1lbWJlck9mIF8uc3VwcG9ydFxuICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgKi9cbiAgICBzdXBwb3J0LmZ1bmNEZWNvbXAgPSAhaXNOYXRpdmUoY29udGV4dC5XaW5SVEVycm9yKSAmJiByZVRoaXMudGVzdChydW5JbkNvbnRleHQpO1xuXG4gICAgLyoqXG4gICAgICogRGV0ZWN0IGlmIGBGdW5jdGlvbiNuYW1lYCBpcyBzdXBwb3J0ZWQgKGFsbCBidXQgSUUpLlxuICAgICAqXG4gICAgICogQG1lbWJlck9mIF8uc3VwcG9ydFxuICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgKi9cbiAgICBzdXBwb3J0LmZ1bmNOYW1lcyA9IHR5cGVvZiBGdW5jdGlvbi5uYW1lID09ICdzdHJpbmcnO1xuXG4gICAgLyoqXG4gICAgICogQnkgZGVmYXVsdCwgdGhlIHRlbXBsYXRlIGRlbGltaXRlcnMgdXNlZCBieSBMby1EYXNoIGFyZSBzaW1pbGFyIHRvIHRob3NlIGluXG4gICAgICogZW1iZWRkZWQgUnVieSAoRVJCKS4gQ2hhbmdlIHRoZSBmb2xsb3dpbmcgdGVtcGxhdGUgc2V0dGluZ3MgdG8gdXNlIGFsdGVybmF0aXZlXG4gICAgICogZGVsaW1pdGVycy5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEB0eXBlIE9iamVjdFxuICAgICAqL1xuICAgIGxvZGFzaC50ZW1wbGF0ZVNldHRpbmdzID0ge1xuXG4gICAgICAvKipcbiAgICAgICAqIFVzZWQgdG8gZGV0ZWN0IGBkYXRhYCBwcm9wZXJ0eSB2YWx1ZXMgdG8gYmUgSFRNTC1lc2NhcGVkLlxuICAgICAgICpcbiAgICAgICAqIEBtZW1iZXJPZiBfLnRlbXBsYXRlU2V0dGluZ3NcbiAgICAgICAqIEB0eXBlIFJlZ0V4cFxuICAgICAgICovXG4gICAgICAnZXNjYXBlJzogLzwlLShbXFxzXFxTXSs/KSU+L2csXG5cbiAgICAgIC8qKlxuICAgICAgICogVXNlZCB0byBkZXRlY3QgY29kZSB0byBiZSBldmFsdWF0ZWQuXG4gICAgICAgKlxuICAgICAgICogQG1lbWJlck9mIF8udGVtcGxhdGVTZXR0aW5nc1xuICAgICAgICogQHR5cGUgUmVnRXhwXG4gICAgICAgKi9cbiAgICAgICdldmFsdWF0ZSc6IC88JShbXFxzXFxTXSs/KSU+L2csXG5cbiAgICAgIC8qKlxuICAgICAgICogVXNlZCB0byBkZXRlY3QgYGRhdGFgIHByb3BlcnR5IHZhbHVlcyB0byBpbmplY3QuXG4gICAgICAgKlxuICAgICAgICogQG1lbWJlck9mIF8udGVtcGxhdGVTZXR0aW5nc1xuICAgICAgICogQHR5cGUgUmVnRXhwXG4gICAgICAgKi9cbiAgICAgICdpbnRlcnBvbGF0ZSc6IHJlSW50ZXJwb2xhdGUsXG5cbiAgICAgIC8qKlxuICAgICAgICogVXNlZCB0byByZWZlcmVuY2UgdGhlIGRhdGEgb2JqZWN0IGluIHRoZSB0ZW1wbGF0ZSB0ZXh0LlxuICAgICAgICpcbiAgICAgICAqIEBtZW1iZXJPZiBfLnRlbXBsYXRlU2V0dGluZ3NcbiAgICAgICAqIEB0eXBlIHN0cmluZ1xuICAgICAgICovXG4gICAgICAndmFyaWFibGUnOiAnJyxcblxuICAgICAgLyoqXG4gICAgICAgKiBVc2VkIHRvIGltcG9ydCB2YXJpYWJsZXMgaW50byB0aGUgY29tcGlsZWQgdGVtcGxhdGUuXG4gICAgICAgKlxuICAgICAgICogQG1lbWJlck9mIF8udGVtcGxhdGVTZXR0aW5nc1xuICAgICAgICogQHR5cGUgT2JqZWN0XG4gICAgICAgKi9cbiAgICAgICdpbXBvcnRzJzoge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBIHJlZmVyZW5jZSB0byB0aGUgYGxvZGFzaGAgZnVuY3Rpb24uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBtZW1iZXJPZiBfLnRlbXBsYXRlU2V0dGluZ3MuaW1wb3J0c1xuICAgICAgICAgKiBAdHlwZSBGdW5jdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgJ18nOiBsb2Rhc2hcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5iaW5kYCB0aGF0IGNyZWF0ZXMgdGhlIGJvdW5kIGZ1bmN0aW9uIGFuZFxuICAgICAqIHNldHMgaXRzIG1ldGEgZGF0YS5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtBcnJheX0gYmluZERhdGEgVGhlIGJpbmQgZGF0YSBhcnJheS5cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBib3VuZCBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBiYXNlQmluZChiaW5kRGF0YSkge1xuICAgICAgdmFyIGZ1bmMgPSBiaW5kRGF0YVswXSxcbiAgICAgICAgICBwYXJ0aWFsQXJncyA9IGJpbmREYXRhWzJdLFxuICAgICAgICAgIHRoaXNBcmcgPSBiaW5kRGF0YVs0XTtcblxuICAgICAgZnVuY3Rpb24gYm91bmQoKSB7XG4gICAgICAgIC8vIGBGdW5jdGlvbiNiaW5kYCBzcGVjXG4gICAgICAgIC8vIGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4MTUuMy40LjVcbiAgICAgICAgaWYgKHBhcnRpYWxBcmdzKSB7XG4gICAgICAgICAgLy8gYXZvaWQgYGFyZ3VtZW50c2Agb2JqZWN0IGRlb3B0aW1pemF0aW9ucyBieSB1c2luZyBgc2xpY2VgIGluc3RlYWRcbiAgICAgICAgICAvLyBvZiBgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGxgIGFuZCBub3QgYXNzaWduaW5nIGBhcmd1bWVudHNgIHRvIGFcbiAgICAgICAgICAvLyB2YXJpYWJsZSBhcyBhIHRlcm5hcnkgZXhwcmVzc2lvblxuICAgICAgICAgIHZhciBhcmdzID0gc2xpY2UocGFydGlhbEFyZ3MpO1xuICAgICAgICAgIHB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBtaW1pYyB0aGUgY29uc3RydWN0b3IncyBgcmV0dXJuYCBiZWhhdmlvclxuICAgICAgICAvLyBodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDEzLjIuMlxuICAgICAgICBpZiAodGhpcyBpbnN0YW5jZW9mIGJvdW5kKSB7XG4gICAgICAgICAgLy8gZW5zdXJlIGBuZXcgYm91bmRgIGlzIGFuIGluc3RhbmNlIG9mIGBmdW5jYFxuICAgICAgICAgIHZhciB0aGlzQmluZGluZyA9IGJhc2VDcmVhdGUoZnVuYy5wcm90b3R5cGUpLFxuICAgICAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNCaW5kaW5nLCBhcmdzIHx8IGFyZ3VtZW50cyk7XG4gICAgICAgICAgcmV0dXJuIGlzT2JqZWN0KHJlc3VsdCkgPyByZXN1bHQgOiB0aGlzQmluZGluZztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzIHx8IGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgICBzZXRCaW5kRGF0YShib3VuZCwgYmluZERhdGEpO1xuICAgICAgcmV0dXJuIGJvdW5kO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmNsb25lYCB3aXRob3V0IGFyZ3VtZW50IGp1Z2dsaW5nIG9yIHN1cHBvcnRcbiAgICAgKiBmb3IgYHRoaXNBcmdgIGJpbmRpbmcuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNsb25lLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lzRGVlcD1mYWxzZV0gU3BlY2lmeSBhIGRlZXAgY2xvbmUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGNsb25pbmcgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtzdGFja0E9W11dIFRyYWNrcyB0cmF2ZXJzZWQgc291cmNlIG9iamVjdHMuXG4gICAgICogQHBhcmFtIHtBcnJheX0gW3N0YWNrQj1bXV0gQXNzb2NpYXRlcyBjbG9uZXMgd2l0aCBzb3VyY2UgY291bnRlcnBhcnRzLlxuICAgICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBjbG9uZWQgdmFsdWUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gYmFzZUNsb25lKHZhbHVlLCBpc0RlZXAsIGNhbGxiYWNrLCBzdGFja0EsIHN0YWNrQikge1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBjYWxsYmFjayh2YWx1ZSk7XG4gICAgICAgIGlmICh0eXBlb2YgcmVzdWx0ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gaW5zcGVjdCBbW0NsYXNzXV1cbiAgICAgIHZhciBpc09iaiA9IGlzT2JqZWN0KHZhbHVlKTtcbiAgICAgIGlmIChpc09iaikge1xuICAgICAgICB2YXIgY2xhc3NOYW1lID0gdG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gICAgICAgIGlmICghY2xvbmVhYmxlQ2xhc3Nlc1tjbGFzc05hbWVdKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjdG9yID0gY3RvckJ5Q2xhc3NbY2xhc3NOYW1lXTtcbiAgICAgICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgICAgICBjYXNlIGJvb2xDbGFzczpcbiAgICAgICAgICBjYXNlIGRhdGVDbGFzczpcbiAgICAgICAgICAgIHJldHVybiBuZXcgY3RvcigrdmFsdWUpO1xuXG4gICAgICAgICAgY2FzZSBudW1iZXJDbGFzczpcbiAgICAgICAgICBjYXNlIHN0cmluZ0NsYXNzOlxuICAgICAgICAgICAgcmV0dXJuIG5ldyBjdG9yKHZhbHVlKTtcblxuICAgICAgICAgIGNhc2UgcmVnZXhwQ2xhc3M6XG4gICAgICAgICAgICByZXN1bHQgPSBjdG9yKHZhbHVlLnNvdXJjZSwgcmVGbGFncy5leGVjKHZhbHVlKSk7XG4gICAgICAgICAgICByZXN1bHQubGFzdEluZGV4ID0gdmFsdWUubGFzdEluZGV4O1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgICAgdmFyIGlzQXJyID0gaXNBcnJheSh2YWx1ZSk7XG4gICAgICBpZiAoaXNEZWVwKSB7XG4gICAgICAgIC8vIGNoZWNrIGZvciBjaXJjdWxhciByZWZlcmVuY2VzIGFuZCByZXR1cm4gY29ycmVzcG9uZGluZyBjbG9uZVxuICAgICAgICB2YXIgaW5pdGVkU3RhY2sgPSAhc3RhY2tBO1xuICAgICAgICBzdGFja0EgfHwgKHN0YWNrQSA9IGdldEFycmF5KCkpO1xuICAgICAgICBzdGFja0IgfHwgKHN0YWNrQiA9IGdldEFycmF5KCkpO1xuXG4gICAgICAgIHZhciBsZW5ndGggPSBzdGFja0EubGVuZ3RoO1xuICAgICAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgICAgICBpZiAoc3RhY2tBW2xlbmd0aF0gPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBzdGFja0JbbGVuZ3RoXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gaXNBcnIgPyBjdG9yKHZhbHVlLmxlbmd0aCkgOiB7fTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICByZXN1bHQgPSBpc0FyciA/IHNsaWNlKHZhbHVlKSA6IGFzc2lnbih7fSwgdmFsdWUpO1xuICAgICAgfVxuICAgICAgLy8gYWRkIGFycmF5IHByb3BlcnRpZXMgYXNzaWduZWQgYnkgYFJlZ0V4cCNleGVjYFxuICAgICAgaWYgKGlzQXJyKSB7XG4gICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCAnaW5kZXgnKSkge1xuICAgICAgICAgIHJlc3VsdC5pbmRleCA9IHZhbHVlLmluZGV4O1xuICAgICAgICB9XG4gICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCAnaW5wdXQnKSkge1xuICAgICAgICAgIHJlc3VsdC5pbnB1dCA9IHZhbHVlLmlucHV0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBleGl0IGZvciBzaGFsbG93IGNsb25lXG4gICAgICBpZiAoIWlzRGVlcCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgLy8gYWRkIHRoZSBzb3VyY2UgdmFsdWUgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzXG4gICAgICAvLyBhbmQgYXNzb2NpYXRlIGl0IHdpdGggaXRzIGNsb25lXG4gICAgICBzdGFja0EucHVzaCh2YWx1ZSk7XG4gICAgICBzdGFja0IucHVzaChyZXN1bHQpO1xuXG4gICAgICAvLyByZWN1cnNpdmVseSBwb3B1bGF0ZSBjbG9uZSAoc3VzY2VwdGlibGUgdG8gY2FsbCBzdGFjayBsaW1pdHMpXG4gICAgICAoaXNBcnIgPyBmb3JFYWNoIDogZm9yT3duKSh2YWx1ZSwgZnVuY3Rpb24ob2JqVmFsdWUsIGtleSkge1xuICAgICAgICByZXN1bHRba2V5XSA9IGJhc2VDbG9uZShvYmpWYWx1ZSwgaXNEZWVwLCBjYWxsYmFjaywgc3RhY2tBLCBzdGFja0IpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChpbml0ZWRTdGFjaykge1xuICAgICAgICByZWxlYXNlQXJyYXkoc3RhY2tBKTtcbiAgICAgICAgcmVsZWFzZUFycmF5KHN0YWNrQik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmNyZWF0ZWAgd2l0aG91dCBzdXBwb3J0IGZvciBhc3NpZ25pbmdcbiAgICAgKiBwcm9wZXJ0aWVzIHRvIHRoZSBjcmVhdGVkIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHByb3RvdHlwZSBUaGUgb2JqZWN0IHRvIGluaGVyaXQgZnJvbS5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBuZXcgb2JqZWN0LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGJhc2VDcmVhdGUocHJvdG90eXBlLCBwcm9wZXJ0aWVzKSB7XG4gICAgICByZXR1cm4gaXNPYmplY3QocHJvdG90eXBlKSA/IG5hdGl2ZUNyZWF0ZShwcm90b3R5cGUpIDoge307XG4gICAgfVxuICAgIC8vIGZhbGxiYWNrIGZvciBicm93c2VycyB3aXRob3V0IGBPYmplY3QuY3JlYXRlYFxuICAgIGlmICghbmF0aXZlQ3JlYXRlKSB7XG4gICAgICBiYXNlQ3JlYXRlID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICBmdW5jdGlvbiBPYmplY3QoKSB7fVxuICAgICAgICByZXR1cm4gZnVuY3Rpb24ocHJvdG90eXBlKSB7XG4gICAgICAgICAgaWYgKGlzT2JqZWN0KHByb3RvdHlwZSkpIHtcbiAgICAgICAgICAgIE9iamVjdC5wcm90b3R5cGUgPSBwcm90b3R5cGU7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IE9iamVjdDtcbiAgICAgICAgICAgIE9iamVjdC5wcm90b3R5cGUgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IGNvbnRleHQuT2JqZWN0KCk7XG4gICAgICAgIH07XG4gICAgICB9KCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmNyZWF0ZUNhbGxiYWNrYCB3aXRob3V0IHN1cHBvcnQgZm9yIGNyZWF0aW5nXG4gICAgICogXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2tzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0geyp9IFtmdW5jPWlkZW50aXR5XSBUaGUgdmFsdWUgdG8gY29udmVydCB0byBhIGNhbGxiYWNrLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiB0aGUgY3JlYXRlZCBjYWxsYmFjay5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW2FyZ0NvdW50XSBUaGUgbnVtYmVyIG9mIGFyZ3VtZW50cyB0aGUgY2FsbGJhY2sgYWNjZXB0cy5cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgYSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBiYXNlQ3JlYXRlQ2FsbGJhY2soZnVuYywgdGhpc0FyZywgYXJnQ291bnQpIHtcbiAgICAgIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBpZGVudGl0eTtcbiAgICAgIH1cbiAgICAgIC8vIGV4aXQgZWFybHkgZm9yIG5vIGB0aGlzQXJnYCBvciBhbHJlYWR5IGJvdW5kIGJ5IGBGdW5jdGlvbiNiaW5kYFxuICAgICAgaWYgKHR5cGVvZiB0aGlzQXJnID09ICd1bmRlZmluZWQnIHx8ICEoJ3Byb3RvdHlwZScgaW4gZnVuYykpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmM7XG4gICAgICB9XG4gICAgICB2YXIgYmluZERhdGEgPSBmdW5jLl9fYmluZERhdGFfXztcbiAgICAgIGlmICh0eXBlb2YgYmluZERhdGEgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKHN1cHBvcnQuZnVuY05hbWVzKSB7XG4gICAgICAgICAgYmluZERhdGEgPSAhZnVuYy5uYW1lO1xuICAgICAgICB9XG4gICAgICAgIGJpbmREYXRhID0gYmluZERhdGEgfHwgIXN1cHBvcnQuZnVuY0RlY29tcDtcbiAgICAgICAgaWYgKCFiaW5kRGF0YSkge1xuICAgICAgICAgIHZhciBzb3VyY2UgPSBmblRvU3RyaW5nLmNhbGwoZnVuYyk7XG4gICAgICAgICAgaWYgKCFzdXBwb3J0LmZ1bmNOYW1lcykge1xuICAgICAgICAgICAgYmluZERhdGEgPSAhcmVGdW5jTmFtZS50ZXN0KHNvdXJjZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghYmluZERhdGEpIHtcbiAgICAgICAgICAgIC8vIGNoZWNrcyBpZiBgZnVuY2AgcmVmZXJlbmNlcyB0aGUgYHRoaXNgIGtleXdvcmQgYW5kIHN0b3JlcyB0aGUgcmVzdWx0XG4gICAgICAgICAgICBiaW5kRGF0YSA9IHJlVGhpcy50ZXN0KHNvdXJjZSk7XG4gICAgICAgICAgICBzZXRCaW5kRGF0YShmdW5jLCBiaW5kRGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBleGl0IGVhcmx5IGlmIHRoZXJlIGFyZSBubyBgdGhpc2AgcmVmZXJlbmNlcyBvciBgZnVuY2AgaXMgYm91bmRcbiAgICAgIGlmIChiaW5kRGF0YSA9PT0gZmFsc2UgfHwgKGJpbmREYXRhICE9PSB0cnVlICYmIGJpbmREYXRhWzFdICYgMSkpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmM7XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKGFyZ0NvdW50KSB7XG4gICAgICAgIGNhc2UgMTogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCB2YWx1ZSk7XG4gICAgICAgIH07XG4gICAgICAgIGNhc2UgMjogcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXNBcmcsIGEsIGIpO1xuICAgICAgICB9O1xuICAgICAgICBjYXNlIDM6IHJldHVybiBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik7XG4gICAgICAgIH07XG4gICAgICAgIGNhc2UgNDogcmV0dXJuIGZ1bmN0aW9uKGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXNBcmcsIGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGJpbmQoZnVuYywgdGhpc0FyZyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYGNyZWF0ZVdyYXBwZXJgIHRoYXQgY3JlYXRlcyB0aGUgd3JhcHBlciBhbmRcbiAgICAgKiBzZXRzIGl0cyBtZXRhIGRhdGEuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGJpbmREYXRhIFRoZSBiaW5kIGRhdGEgYXJyYXkuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gICAgICovXG4gICAgZnVuY3Rpb24gYmFzZUNyZWF0ZVdyYXBwZXIoYmluZERhdGEpIHtcbiAgICAgIHZhciBmdW5jID0gYmluZERhdGFbMF0sXG4gICAgICAgICAgYml0bWFzayA9IGJpbmREYXRhWzFdLFxuICAgICAgICAgIHBhcnRpYWxBcmdzID0gYmluZERhdGFbMl0sXG4gICAgICAgICAgcGFydGlhbFJpZ2h0QXJncyA9IGJpbmREYXRhWzNdLFxuICAgICAgICAgIHRoaXNBcmcgPSBiaW5kRGF0YVs0XSxcbiAgICAgICAgICBhcml0eSA9IGJpbmREYXRhWzVdO1xuXG4gICAgICB2YXIgaXNCaW5kID0gYml0bWFzayAmIDEsXG4gICAgICAgICAgaXNCaW5kS2V5ID0gYml0bWFzayAmIDIsXG4gICAgICAgICAgaXNDdXJyeSA9IGJpdG1hc2sgJiA0LFxuICAgICAgICAgIGlzQ3VycnlCb3VuZCA9IGJpdG1hc2sgJiA4LFxuICAgICAgICAgIGtleSA9IGZ1bmM7XG5cbiAgICAgIGZ1bmN0aW9uIGJvdW5kKCkge1xuICAgICAgICB2YXIgdGhpc0JpbmRpbmcgPSBpc0JpbmQgPyB0aGlzQXJnIDogdGhpcztcbiAgICAgICAgaWYgKHBhcnRpYWxBcmdzKSB7XG4gICAgICAgICAgdmFyIGFyZ3MgPSBzbGljZShwYXJ0aWFsQXJncyk7XG4gICAgICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJ0aWFsUmlnaHRBcmdzIHx8IGlzQ3VycnkpIHtcbiAgICAgICAgICBhcmdzIHx8IChhcmdzID0gc2xpY2UoYXJndW1lbnRzKSk7XG4gICAgICAgICAgaWYgKHBhcnRpYWxSaWdodEFyZ3MpIHtcbiAgICAgICAgICAgIHB1c2guYXBwbHkoYXJncywgcGFydGlhbFJpZ2h0QXJncyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpc0N1cnJ5ICYmIGFyZ3MubGVuZ3RoIDwgYXJpdHkpIHtcbiAgICAgICAgICAgIGJpdG1hc2sgfD0gMTYgJiB+MzI7XG4gICAgICAgICAgICByZXR1cm4gYmFzZUNyZWF0ZVdyYXBwZXIoW2Z1bmMsIChpc0N1cnJ5Qm91bmQgPyBiaXRtYXNrIDogYml0bWFzayAmIH4zKSwgYXJncywgbnVsbCwgdGhpc0FyZywgYXJpdHldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXJncyB8fCAoYXJncyA9IGFyZ3VtZW50cyk7XG4gICAgICAgIGlmIChpc0JpbmRLZXkpIHtcbiAgICAgICAgICBmdW5jID0gdGhpc0JpbmRpbmdba2V5XTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcyBpbnN0YW5jZW9mIGJvdW5kKSB7XG4gICAgICAgICAgdGhpc0JpbmRpbmcgPSBiYXNlQ3JlYXRlKGZ1bmMucHJvdG90eXBlKTtcbiAgICAgICAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQmluZGluZywgYXJncyk7XG4gICAgICAgICAgcmV0dXJuIGlzT2JqZWN0KHJlc3VsdCkgPyByZXN1bHQgOiB0aGlzQmluZGluZztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzQmluZGluZywgYXJncyk7XG4gICAgICB9XG4gICAgICBzZXRCaW5kRGF0YShib3VuZCwgYmluZERhdGEpO1xuICAgICAgcmV0dXJuIGJvdW5kO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmRpZmZlcmVuY2VgIHRoYXQgYWNjZXB0cyBhIHNpbmdsZSBhcnJheVxuICAgICAqIG9mIHZhbHVlcyB0byBleGNsdWRlLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gcHJvY2Vzcy5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbdmFsdWVzXSBUaGUgYXJyYXkgb2YgdmFsdWVzIHRvIGV4Y2x1ZGUuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGEgbmV3IGFycmF5IG9mIGZpbHRlcmVkIHZhbHVlcy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBiYXNlRGlmZmVyZW5jZShhcnJheSwgdmFsdWVzKSB7XG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBpbmRleE9mID0gZ2V0SW5kZXhPZigpLFxuICAgICAgICAgIGxlbmd0aCA9IGFycmF5ID8gYXJyYXkubGVuZ3RoIDogMCxcbiAgICAgICAgICBpc0xhcmdlID0gbGVuZ3RoID49IGxhcmdlQXJyYXlTaXplICYmIGluZGV4T2YgPT09IGJhc2VJbmRleE9mLFxuICAgICAgICAgIHJlc3VsdCA9IFtdO1xuXG4gICAgICBpZiAoaXNMYXJnZSkge1xuICAgICAgICB2YXIgY2FjaGUgPSBjcmVhdGVDYWNoZSh2YWx1ZXMpO1xuICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICBpbmRleE9mID0gY2FjaGVJbmRleE9mO1xuICAgICAgICAgIHZhbHVlcyA9IGNhY2hlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlzTGFyZ2UgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gYXJyYXlbaW5kZXhdO1xuICAgICAgICBpZiAoaW5kZXhPZih2YWx1ZXMsIHZhbHVlKSA8IDApIHtcbiAgICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChpc0xhcmdlKSB7XG4gICAgICAgIHJlbGVhc2VPYmplY3QodmFsdWVzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uZmxhdHRlbmAgd2l0aG91dCBzdXBwb3J0IGZvciBjYWxsYmFja1xuICAgICAqIHNob3J0aGFuZHMgb3IgYHRoaXNBcmdgIGJpbmRpbmcuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBmbGF0dGVuLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lzU2hhbGxvdz1mYWxzZV0gQSBmbGFnIHRvIHJlc3RyaWN0IGZsYXR0ZW5pbmcgdG8gYSBzaW5nbGUgbGV2ZWwuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbaXNTdHJpY3Q9ZmFsc2VdIEEgZmxhZyB0byByZXN0cmljdCBmbGF0dGVuaW5nIHRvIGFycmF5cyBhbmQgYGFyZ3VtZW50c2Agb2JqZWN0cy5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW2Zyb21JbmRleD0wXSBUaGUgaW5kZXggdG8gc3RhcnQgZnJvbS5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBuZXcgZmxhdHRlbmVkIGFycmF5LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGJhc2VGbGF0dGVuKGFycmF5LCBpc1NoYWxsb3csIGlzU3RyaWN0LCBmcm9tSW5kZXgpIHtcbiAgICAgIHZhciBpbmRleCA9IChmcm9tSW5kZXggfHwgMCkgLSAxLFxuICAgICAgICAgIGxlbmd0aCA9IGFycmF5ID8gYXJyYXkubGVuZ3RoIDogMCxcbiAgICAgICAgICByZXN1bHQgPSBbXTtcblxuICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gYXJyYXlbaW5kZXhdO1xuXG4gICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcgJiYgdHlwZW9mIHZhbHVlLmxlbmd0aCA9PSAnbnVtYmVyJ1xuICAgICAgICAgICAgJiYgKGlzQXJyYXkodmFsdWUpIHx8IGlzQXJndW1lbnRzKHZhbHVlKSkpIHtcbiAgICAgICAgICAvLyByZWN1cnNpdmVseSBmbGF0dGVuIGFycmF5cyAoc3VzY2VwdGlibGUgdG8gY2FsbCBzdGFjayBsaW1pdHMpXG4gICAgICAgICAgaWYgKCFpc1NoYWxsb3cpIHtcbiAgICAgICAgICAgIHZhbHVlID0gYmFzZUZsYXR0ZW4odmFsdWUsIGlzU2hhbGxvdywgaXNTdHJpY3QpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgdmFsSW5kZXggPSAtMSxcbiAgICAgICAgICAgICAgdmFsTGVuZ3RoID0gdmFsdWUubGVuZ3RoLFxuICAgICAgICAgICAgICByZXNJbmRleCA9IHJlc3VsdC5sZW5ndGg7XG5cbiAgICAgICAgICByZXN1bHQubGVuZ3RoICs9IHZhbExlbmd0aDtcbiAgICAgICAgICB3aGlsZSAoKyt2YWxJbmRleCA8IHZhbExlbmd0aCkge1xuICAgICAgICAgICAgcmVzdWx0W3Jlc0luZGV4KytdID0gdmFsdWVbdmFsSW5kZXhdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghaXNTdHJpY3QpIHtcbiAgICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uaXNFcXVhbGAsIHdpdGhvdXQgc3VwcG9ydCBmb3IgYHRoaXNBcmdgIGJpbmRpbmcsXG4gICAgICogdGhhdCBhbGxvd3MgcGFydGlhbCBcIl8ud2hlcmVcIiBzdHlsZSBjb21wYXJpc29ucy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHsqfSBhIFRoZSB2YWx1ZSB0byBjb21wYXJlLlxuICAgICAqIEBwYXJhbSB7Kn0gYiBUaGUgb3RoZXIgdmFsdWUgdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIFRoZSBmdW5jdGlvbiB0byBjdXN0b21pemUgY29tcGFyaW5nIHZhbHVlcy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaXNXaGVyZT1mYWxzZV0gQSBmbGFnIHRvIGluZGljYXRlIHBlcmZvcm1pbmcgcGFydGlhbCBjb21wYXJpc29ucy5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbc3RhY2tBPVtdXSBUcmFja3MgdHJhdmVyc2VkIGBhYCBvYmplY3RzLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtzdGFja0I9W11dIFRyYWNrcyB0cmF2ZXJzZWQgYGJgIG9iamVjdHMuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSB2YWx1ZXMgYXJlIGVxdWl2YWxlbnQsIGVsc2UgYGZhbHNlYC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBiYXNlSXNFcXVhbChhLCBiLCBjYWxsYmFjaywgaXNXaGVyZSwgc3RhY2tBLCBzdGFja0IpIHtcbiAgICAgIC8vIHVzZWQgdG8gaW5kaWNhdGUgdGhhdCB3aGVuIGNvbXBhcmluZyBvYmplY3RzLCBgYWAgaGFzIGF0IGxlYXN0IHRoZSBwcm9wZXJ0aWVzIG9mIGBiYFxuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBjYWxsYmFjayhhLCBiKTtcbiAgICAgICAgaWYgKHR5cGVvZiByZXN1bHQgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICByZXR1cm4gISFyZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGV4aXQgZWFybHkgZm9yIGlkZW50aWNhbCB2YWx1ZXNcbiAgICAgIGlmIChhID09PSBiKSB7XG4gICAgICAgIC8vIHRyZWF0IGArMGAgdnMuIGAtMGAgYXMgbm90IGVxdWFsXG4gICAgICAgIHJldHVybiBhICE9PSAwIHx8ICgxIC8gYSA9PSAxIC8gYik7XG4gICAgICB9XG4gICAgICB2YXIgdHlwZSA9IHR5cGVvZiBhLFxuICAgICAgICAgIG90aGVyVHlwZSA9IHR5cGVvZiBiO1xuXG4gICAgICAvLyBleGl0IGVhcmx5IGZvciB1bmxpa2UgcHJpbWl0aXZlIHZhbHVlc1xuICAgICAgaWYgKGEgPT09IGEgJiZcbiAgICAgICAgICAhKGEgJiYgb2JqZWN0VHlwZXNbdHlwZV0pICYmXG4gICAgICAgICAgIShiICYmIG9iamVjdFR5cGVzW290aGVyVHlwZV0pKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIGV4aXQgZWFybHkgZm9yIGBudWxsYCBhbmQgYHVuZGVmaW5lZGAgYXZvaWRpbmcgRVMzJ3MgRnVuY3Rpb24jY2FsbCBiZWhhdmlvclxuICAgICAgLy8gaHR0cDovL2VzNS5naXRodWIuaW8vI3gxNS4zLjQuNFxuICAgICAgaWYgKGEgPT0gbnVsbCB8fCBiID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGEgPT09IGI7XG4gICAgICB9XG4gICAgICAvLyBjb21wYXJlIFtbQ2xhc3NdXSBuYW1lc1xuICAgICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSksXG4gICAgICAgICAgb3RoZXJDbGFzcyA9IHRvU3RyaW5nLmNhbGwoYik7XG5cbiAgICAgIGlmIChjbGFzc05hbWUgPT0gYXJnc0NsYXNzKSB7XG4gICAgICAgIGNsYXNzTmFtZSA9IG9iamVjdENsYXNzO1xuICAgICAgfVxuICAgICAgaWYgKG90aGVyQ2xhc3MgPT0gYXJnc0NsYXNzKSB7XG4gICAgICAgIG90aGVyQ2xhc3MgPSBvYmplY3RDbGFzcztcbiAgICAgIH1cbiAgICAgIGlmIChjbGFzc05hbWUgIT0gb3RoZXJDbGFzcykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKGNsYXNzTmFtZSkge1xuICAgICAgICBjYXNlIGJvb2xDbGFzczpcbiAgICAgICAgY2FzZSBkYXRlQ2xhc3M6XG4gICAgICAgICAgLy8gY29lcmNlIGRhdGVzIGFuZCBib29sZWFucyB0byBudW1iZXJzLCBkYXRlcyB0byBtaWxsaXNlY29uZHMgYW5kIGJvb2xlYW5zXG4gICAgICAgICAgLy8gdG8gYDFgIG9yIGAwYCB0cmVhdGluZyBpbnZhbGlkIGRhdGVzIGNvZXJjZWQgdG8gYE5hTmAgYXMgbm90IGVxdWFsXG4gICAgICAgICAgcmV0dXJuICthID09ICtiO1xuXG4gICAgICAgIGNhc2UgbnVtYmVyQ2xhc3M6XG4gICAgICAgICAgLy8gdHJlYXQgYE5hTmAgdnMuIGBOYU5gIGFzIGVxdWFsXG4gICAgICAgICAgcmV0dXJuIChhICE9ICthKVxuICAgICAgICAgICAgPyBiICE9ICtiXG4gICAgICAgICAgICAvLyBidXQgdHJlYXQgYCswYCB2cy4gYC0wYCBhcyBub3QgZXF1YWxcbiAgICAgICAgICAgIDogKGEgPT0gMCA/ICgxIC8gYSA9PSAxIC8gYikgOiBhID09ICtiKTtcblxuICAgICAgICBjYXNlIHJlZ2V4cENsYXNzOlxuICAgICAgICBjYXNlIHN0cmluZ0NsYXNzOlxuICAgICAgICAgIC8vIGNvZXJjZSByZWdleGVzIHRvIHN0cmluZ3MgKGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4MTUuMTAuNi40KVxuICAgICAgICAgIC8vIHRyZWF0IHN0cmluZyBwcmltaXRpdmVzIGFuZCB0aGVpciBjb3JyZXNwb25kaW5nIG9iamVjdCBpbnN0YW5jZXMgYXMgZXF1YWxcbiAgICAgICAgICByZXR1cm4gYSA9PSBTdHJpbmcoYik7XG4gICAgICB9XG4gICAgICB2YXIgaXNBcnIgPSBjbGFzc05hbWUgPT0gYXJyYXlDbGFzcztcbiAgICAgIGlmICghaXNBcnIpIHtcbiAgICAgICAgLy8gdW53cmFwIGFueSBgbG9kYXNoYCB3cmFwcGVkIHZhbHVlc1xuICAgICAgICB2YXIgYVdyYXBwZWQgPSBoYXNPd25Qcm9wZXJ0eS5jYWxsKGEsICdfX3dyYXBwZWRfXycpLFxuICAgICAgICAgICAgYldyYXBwZWQgPSBoYXNPd25Qcm9wZXJ0eS5jYWxsKGIsICdfX3dyYXBwZWRfXycpO1xuXG4gICAgICAgIGlmIChhV3JhcHBlZCB8fCBiV3JhcHBlZCkge1xuICAgICAgICAgIHJldHVybiBiYXNlSXNFcXVhbChhV3JhcHBlZCA/IGEuX193cmFwcGVkX18gOiBhLCBiV3JhcHBlZCA/IGIuX193cmFwcGVkX18gOiBiLCBjYWxsYmFjaywgaXNXaGVyZSwgc3RhY2tBLCBzdGFja0IpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGV4aXQgZm9yIGZ1bmN0aW9ucyBhbmQgRE9NIG5vZGVzXG4gICAgICAgIGlmIChjbGFzc05hbWUgIT0gb2JqZWN0Q2xhc3MpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaW4gb2xkZXIgdmVyc2lvbnMgb2YgT3BlcmEsIGBhcmd1bWVudHNgIG9iamVjdHMgaGF2ZSBgQXJyYXlgIGNvbnN0cnVjdG9yc1xuICAgICAgICB2YXIgY3RvckEgPSBhLmNvbnN0cnVjdG9yLFxuICAgICAgICAgICAgY3RvckIgPSBiLmNvbnN0cnVjdG9yO1xuXG4gICAgICAgIC8vIG5vbiBgT2JqZWN0YCBvYmplY3QgaW5zdGFuY2VzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWFsXG4gICAgICAgIGlmIChjdG9yQSAhPSBjdG9yQiAmJlxuICAgICAgICAgICAgICAhKGlzRnVuY3Rpb24oY3RvckEpICYmIGN0b3JBIGluc3RhbmNlb2YgY3RvckEgJiYgaXNGdW5jdGlvbihjdG9yQikgJiYgY3RvckIgaW5zdGFuY2VvZiBjdG9yQikgJiZcbiAgICAgICAgICAgICAgKCdjb25zdHJ1Y3RvcicgaW4gYSAmJiAnY29uc3RydWN0b3InIGluIGIpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGFzc3VtZSBjeWNsaWMgc3RydWN0dXJlcyBhcmUgZXF1YWxcbiAgICAgIC8vIHRoZSBhbGdvcml0aG0gZm9yIGRldGVjdGluZyBjeWNsaWMgc3RydWN0dXJlcyBpcyBhZGFwdGVkIGZyb20gRVMgNS4xXG4gICAgICAvLyBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gIChodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDE1LjEyLjMpXG4gICAgICB2YXIgaW5pdGVkU3RhY2sgPSAhc3RhY2tBO1xuICAgICAgc3RhY2tBIHx8IChzdGFja0EgPSBnZXRBcnJheSgpKTtcbiAgICAgIHN0YWNrQiB8fCAoc3RhY2tCID0gZ2V0QXJyYXkoKSk7XG5cbiAgICAgIHZhciBsZW5ndGggPSBzdGFja0EubGVuZ3RoO1xuICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgIGlmIChzdGFja0FbbGVuZ3RoXSA9PSBhKSB7XG4gICAgICAgICAgcmV0dXJuIHN0YWNrQltsZW5ndGhdID09IGI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBzaXplID0gMDtcbiAgICAgIHJlc3VsdCA9IHRydWU7XG5cbiAgICAgIC8vIGFkZCBgYWAgYW5kIGBiYCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHNcbiAgICAgIHN0YWNrQS5wdXNoKGEpO1xuICAgICAgc3RhY2tCLnB1c2goYik7XG5cbiAgICAgIC8vIHJlY3Vyc2l2ZWx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgYXJyYXlzIChzdXNjZXB0aWJsZSB0byBjYWxsIHN0YWNrIGxpbWl0cylcbiAgICAgIGlmIChpc0Fycikge1xuICAgICAgICAvLyBjb21wYXJlIGxlbmd0aHMgdG8gZGV0ZXJtaW5lIGlmIGEgZGVlcCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeVxuICAgICAgICBsZW5ndGggPSBhLmxlbmd0aDtcbiAgICAgICAgc2l6ZSA9IGIubGVuZ3RoO1xuICAgICAgICByZXN1bHQgPSBzaXplID09IGxlbmd0aDtcblxuICAgICAgICBpZiAocmVzdWx0IHx8IGlzV2hlcmUpIHtcbiAgICAgICAgICAvLyBkZWVwIGNvbXBhcmUgdGhlIGNvbnRlbnRzLCBpZ25vcmluZyBub24tbnVtZXJpYyBwcm9wZXJ0aWVzXG4gICAgICAgICAgd2hpbGUgKHNpemUtLSkge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gbGVuZ3RoLFxuICAgICAgICAgICAgICAgIHZhbHVlID0gYltzaXplXTtcblxuICAgICAgICAgICAgaWYgKGlzV2hlcmUpIHtcbiAgICAgICAgICAgICAgd2hpbGUgKGluZGV4LS0pIHtcbiAgICAgICAgICAgICAgICBpZiAoKHJlc3VsdCA9IGJhc2VJc0VxdWFsKGFbaW5kZXhdLCB2YWx1ZSwgY2FsbGJhY2ssIGlzV2hlcmUsIHN0YWNrQSwgc3RhY2tCKSkpIHtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICghKHJlc3VsdCA9IGJhc2VJc0VxdWFsKGFbc2l6ZV0sIHZhbHVlLCBjYWxsYmFjaywgaXNXaGVyZSwgc3RhY2tBLCBzdGFja0IpKSkge1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAvLyBkZWVwIGNvbXBhcmUgb2JqZWN0cyB1c2luZyBgZm9ySW5gLCBpbnN0ZWFkIG9mIGBmb3JPd25gLCB0byBhdm9pZCBgT2JqZWN0LmtleXNgXG4gICAgICAgIC8vIHdoaWNoLCBpbiB0aGlzIGNhc2UsIGlzIG1vcmUgY29zdGx5XG4gICAgICAgIGZvckluKGIsIGZ1bmN0aW9uKHZhbHVlLCBrZXksIGIpIHtcbiAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChiLCBrZXkpKSB7XG4gICAgICAgICAgICAvLyBjb3VudCB0aGUgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICAgICAgICBzaXplKys7XG4gICAgICAgICAgICAvLyBkZWVwIGNvbXBhcmUgZWFjaCBwcm9wZXJ0eSB2YWx1ZS5cbiAgICAgICAgICAgIHJldHVybiAocmVzdWx0ID0gaGFzT3duUHJvcGVydHkuY2FsbChhLCBrZXkpICYmIGJhc2VJc0VxdWFsKGFba2V5XSwgdmFsdWUsIGNhbGxiYWNrLCBpc1doZXJlLCBzdGFja0EsIHN0YWNrQikpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHJlc3VsdCAmJiAhaXNXaGVyZSkge1xuICAgICAgICAgIC8vIGVuc3VyZSBib3RoIG9iamVjdHMgaGF2ZSB0aGUgc2FtZSBudW1iZXIgb2YgcHJvcGVydGllc1xuICAgICAgICAgIGZvckluKGEsIGZ1bmN0aW9uKHZhbHVlLCBrZXksIGEpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGEsIGtleSkpIHtcbiAgICAgICAgICAgICAgLy8gYHNpemVgIHdpbGwgYmUgYC0xYCBpZiBgYWAgaGFzIG1vcmUgcHJvcGVydGllcyB0aGFuIGBiYFxuICAgICAgICAgICAgICByZXR1cm4gKHJlc3VsdCA9IC0tc2l6ZSA+IC0xKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3RhY2tBLnBvcCgpO1xuICAgICAgc3RhY2tCLnBvcCgpO1xuXG4gICAgICBpZiAoaW5pdGVkU3RhY2spIHtcbiAgICAgICAgcmVsZWFzZUFycmF5KHN0YWNrQSk7XG4gICAgICAgIHJlbGVhc2VBcnJheShzdGFja0IpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5tZXJnZWAgd2l0aG91dCBhcmd1bWVudCBqdWdnbGluZyBvciBzdXBwb3J0XG4gICAgICogZm9yIGB0aGlzQXJnYCBiaW5kaW5nLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNvdXJjZSBUaGUgc291cmNlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIFRoZSBmdW5jdGlvbiB0byBjdXN0b21pemUgbWVyZ2luZyBwcm9wZXJ0aWVzLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtzdGFja0E9W11dIFRyYWNrcyB0cmF2ZXJzZWQgc291cmNlIG9iamVjdHMuXG4gICAgICogQHBhcmFtIHtBcnJheX0gW3N0YWNrQj1bXV0gQXNzb2NpYXRlcyB2YWx1ZXMgd2l0aCBzb3VyY2UgY291bnRlcnBhcnRzLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGJhc2VNZXJnZShvYmplY3QsIHNvdXJjZSwgY2FsbGJhY2ssIHN0YWNrQSwgc3RhY2tCKSB7XG4gICAgICAoaXNBcnJheShzb3VyY2UpID8gZm9yRWFjaCA6IGZvck93bikoc291cmNlLCBmdW5jdGlvbihzb3VyY2UsIGtleSkge1xuICAgICAgICB2YXIgZm91bmQsXG4gICAgICAgICAgICBpc0FycixcbiAgICAgICAgICAgIHJlc3VsdCA9IHNvdXJjZSxcbiAgICAgICAgICAgIHZhbHVlID0gb2JqZWN0W2tleV07XG5cbiAgICAgICAgaWYgKHNvdXJjZSAmJiAoKGlzQXJyID0gaXNBcnJheShzb3VyY2UpKSB8fCBpc1BsYWluT2JqZWN0KHNvdXJjZSkpKSB7XG4gICAgICAgICAgLy8gYXZvaWQgbWVyZ2luZyBwcmV2aW91c2x5IG1lcmdlZCBjeWNsaWMgc291cmNlc1xuICAgICAgICAgIHZhciBzdGFja0xlbmd0aCA9IHN0YWNrQS5sZW5ndGg7XG4gICAgICAgICAgd2hpbGUgKHN0YWNrTGVuZ3RoLS0pIHtcbiAgICAgICAgICAgIGlmICgoZm91bmQgPSBzdGFja0Fbc3RhY2tMZW5ndGhdID09IHNvdXJjZSkpIHtcbiAgICAgICAgICAgICAgdmFsdWUgPSBzdGFja0Jbc3RhY2tMZW5ndGhdO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICAgICAgdmFyIGlzU2hhbGxvdztcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICByZXN1bHQgPSBjYWxsYmFjayh2YWx1ZSwgc291cmNlKTtcbiAgICAgICAgICAgICAgaWYgKChpc1NoYWxsb3cgPSB0eXBlb2YgcmVzdWx0ICE9ICd1bmRlZmluZWQnKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gcmVzdWx0O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWlzU2hhbGxvdykge1xuICAgICAgICAgICAgICB2YWx1ZSA9IGlzQXJyXG4gICAgICAgICAgICAgICAgPyAoaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZSA6IFtdKVxuICAgICAgICAgICAgICAgIDogKGlzUGxhaW5PYmplY3QodmFsdWUpID8gdmFsdWUgOiB7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBhZGQgYHNvdXJjZWAgYW5kIGFzc29jaWF0ZWQgYHZhbHVlYCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHNcbiAgICAgICAgICAgIHN0YWNrQS5wdXNoKHNvdXJjZSk7XG4gICAgICAgICAgICBzdGFja0IucHVzaCh2YWx1ZSk7XG5cbiAgICAgICAgICAgIC8vIHJlY3Vyc2l2ZWx5IG1lcmdlIG9iamVjdHMgYW5kIGFycmF5cyAoc3VzY2VwdGlibGUgdG8gY2FsbCBzdGFjayBsaW1pdHMpXG4gICAgICAgICAgICBpZiAoIWlzU2hhbGxvdykge1xuICAgICAgICAgICAgICBiYXNlTWVyZ2UodmFsdWUsIHNvdXJjZSwgY2FsbGJhY2ssIHN0YWNrQSwgc3RhY2tCKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBjYWxsYmFjayh2YWx1ZSwgc291cmNlKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzdWx0ID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHJlc3VsdCA9IHNvdXJjZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiByZXN1bHQgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHZhbHVlID0gcmVzdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBvYmplY3Rba2V5XSA9IHZhbHVlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8ucmFuZG9tYCB3aXRob3V0IGFyZ3VtZW50IGp1Z2dsaW5nIG9yIHN1cHBvcnRcbiAgICAgKiBmb3IgcmV0dXJuaW5nIGZsb2F0aW5nLXBvaW50IG51bWJlcnMuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtaW4gVGhlIG1pbmltdW0gcG9zc2libGUgdmFsdWUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1heCBUaGUgbWF4aW11bSBwb3NzaWJsZSB2YWx1ZS5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIGEgcmFuZG9tIG51bWJlci5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBiYXNlUmFuZG9tKG1pbiwgbWF4KSB7XG4gICAgICByZXR1cm4gbWluICsgZmxvb3IobmF0aXZlUmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnVuaXFgIHdpdGhvdXQgc3VwcG9ydCBmb3IgY2FsbGJhY2sgc2hvcnRoYW5kc1xuICAgICAqIG9yIGB0aGlzQXJnYCBiaW5kaW5nLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gcHJvY2Vzcy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtpc1NvcnRlZD1mYWxzZV0gQSBmbGFnIHRvIGluZGljYXRlIHRoYXQgYGFycmF5YCBpcyBzb3J0ZWQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBUaGUgZnVuY3Rpb24gY2FsbGVkIHBlciBpdGVyYXRpb24uXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGEgZHVwbGljYXRlLXZhbHVlLWZyZWUgYXJyYXkuXG4gICAgICovXG4gICAgZnVuY3Rpb24gYmFzZVVuaXEoYXJyYXksIGlzU29ydGVkLCBjYWxsYmFjaykge1xuICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgaW5kZXhPZiA9IGdldEluZGV4T2YoKSxcbiAgICAgICAgICBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDAsXG4gICAgICAgICAgcmVzdWx0ID0gW107XG5cbiAgICAgIHZhciBpc0xhcmdlID0gIWlzU29ydGVkICYmIGxlbmd0aCA+PSBsYXJnZUFycmF5U2l6ZSAmJiBpbmRleE9mID09PSBiYXNlSW5kZXhPZixcbiAgICAgICAgICBzZWVuID0gKGNhbGxiYWNrIHx8IGlzTGFyZ2UpID8gZ2V0QXJyYXkoKSA6IHJlc3VsdDtcblxuICAgICAgaWYgKGlzTGFyZ2UpIHtcbiAgICAgICAgdmFyIGNhY2hlID0gY3JlYXRlQ2FjaGUoc2Vlbik7XG4gICAgICAgIGluZGV4T2YgPSBjYWNoZUluZGV4T2Y7XG4gICAgICAgIHNlZW4gPSBjYWNoZTtcbiAgICAgIH1cbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGFycmF5W2luZGV4XSxcbiAgICAgICAgICAgIGNvbXB1dGVkID0gY2FsbGJhY2sgPyBjYWxsYmFjayh2YWx1ZSwgaW5kZXgsIGFycmF5KSA6IHZhbHVlO1xuXG4gICAgICAgIGlmIChpc1NvcnRlZFxuICAgICAgICAgICAgICA/ICFpbmRleCB8fCBzZWVuW3NlZW4ubGVuZ3RoIC0gMV0gIT09IGNvbXB1dGVkXG4gICAgICAgICAgICAgIDogaW5kZXhPZihzZWVuLCBjb21wdXRlZCkgPCAwXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgfHwgaXNMYXJnZSkge1xuICAgICAgICAgICAgc2Vlbi5wdXNoKGNvbXB1dGVkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoaXNMYXJnZSkge1xuICAgICAgICByZWxlYXNlQXJyYXkoc2Vlbi5hcnJheSk7XG4gICAgICAgIHJlbGVhc2VPYmplY3Qoc2Vlbik7XG4gICAgICB9IGVsc2UgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIHJlbGVhc2VBcnJheShzZWVuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgYWdncmVnYXRlcyBhIGNvbGxlY3Rpb24sIGNyZWF0aW5nIGFuIG9iamVjdCBjb21wb3NlZFxuICAgICAqIG9mIGtleXMgZ2VuZXJhdGVkIGZyb20gdGhlIHJlc3VsdHMgb2YgcnVubmluZyBlYWNoIGVsZW1lbnQgb2YgdGhlIGNvbGxlY3Rpb25cbiAgICAgKiB0aHJvdWdoIGEgY2FsbGJhY2suIFRoZSBnaXZlbiBgc2V0dGVyYCBmdW5jdGlvbiBzZXRzIHRoZSBrZXlzIGFuZCB2YWx1ZXNcbiAgICAgKiBvZiB0aGUgY29tcG9zZWQgb2JqZWN0LlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBzZXR0ZXIgVGhlIHNldHRlciBmdW5jdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBhZ2dyZWdhdG9yIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUFnZ3JlZ2F0b3Ioc2V0dGVyKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oY29sbGVjdGlvbiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgICBjYWxsYmFjayA9IGxvZGFzaC5jcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG5cbiAgICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgICBsZW5ndGggPSBjb2xsZWN0aW9uID8gY29sbGVjdGlvbi5sZW5ndGggOiAwO1xuXG4gICAgICAgIGlmICh0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInKSB7XG4gICAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGNvbGxlY3Rpb25baW5kZXhdO1xuICAgICAgICAgICAgc2V0dGVyKHJlc3VsdCwgdmFsdWUsIGNhbGxiYWNrKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbiksIGNvbGxlY3Rpb24pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb3JPd24oY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGtleSwgY29sbGVjdGlvbikge1xuICAgICAgICAgICAgc2V0dGVyKHJlc3VsdCwgdmFsdWUsIGNhbGxiYWNrKHZhbHVlLCBrZXksIGNvbGxlY3Rpb24pLCBjb2xsZWN0aW9uKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsIGVpdGhlciBjdXJyaWVzIG9yIGludm9rZXMgYGZ1bmNgXG4gICAgICogd2l0aCBhbiBvcHRpb25hbCBgdGhpc2AgYmluZGluZyBhbmQgcGFydGlhbGx5IGFwcGxpZWQgYXJndW1lbnRzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufHN0cmluZ30gZnVuYyBUaGUgZnVuY3Rpb24gb3IgbWV0aG9kIG5hbWUgdG8gcmVmZXJlbmNlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBiaXRtYXNrIFRoZSBiaXRtYXNrIG9mIG1ldGhvZCBmbGFncyB0byBjb21wb3NlLlxuICAgICAqICBUaGUgYml0bWFzayBtYXkgYmUgY29tcG9zZWQgb2YgdGhlIGZvbGxvd2luZyBmbGFnczpcbiAgICAgKiAgMSAtIGBfLmJpbmRgXG4gICAgICogIDIgLSBgXy5iaW5kS2V5YFxuICAgICAqICA0IC0gYF8uY3VycnlgXG4gICAgICogIDggLSBgXy5jdXJyeWAgKGJvdW5kKVxuICAgICAqICAxNiAtIGBfLnBhcnRpYWxgXG4gICAgICogIDMyIC0gYF8ucGFydGlhbFJpZ2h0YFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtwYXJ0aWFsQXJnc10gQW4gYXJyYXkgb2YgYXJndW1lbnRzIHRvIHByZXBlbmQgdG8gdGhvc2VcbiAgICAgKiAgcHJvdmlkZWQgdG8gdGhlIG5ldyBmdW5jdGlvbi5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbcGFydGlhbFJpZ2h0QXJnc10gQW4gYXJyYXkgb2YgYXJndW1lbnRzIHRvIGFwcGVuZCB0byB0aG9zZVxuICAgICAqICBwcm92aWRlZCB0byB0aGUgbmV3IGZ1bmN0aW9uLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgZnVuY2AuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFthcml0eV0gVGhlIGFyaXR5IG9mIGBmdW5jYC5cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVXcmFwcGVyKGZ1bmMsIGJpdG1hc2ssIHBhcnRpYWxBcmdzLCBwYXJ0aWFsUmlnaHRBcmdzLCB0aGlzQXJnLCBhcml0eSkge1xuICAgICAgdmFyIGlzQmluZCA9IGJpdG1hc2sgJiAxLFxuICAgICAgICAgIGlzQmluZEtleSA9IGJpdG1hc2sgJiAyLFxuICAgICAgICAgIGlzQ3VycnkgPSBiaXRtYXNrICYgNCxcbiAgICAgICAgICBpc0N1cnJ5Qm91bmQgPSBiaXRtYXNrICYgOCxcbiAgICAgICAgICBpc1BhcnRpYWwgPSBiaXRtYXNrICYgMTYsXG4gICAgICAgICAgaXNQYXJ0aWFsUmlnaHQgPSBiaXRtYXNrICYgMzI7XG5cbiAgICAgIGlmICghaXNCaW5kS2V5ICYmICFpc0Z1bmN0aW9uKGZ1bmMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgICB9XG4gICAgICBpZiAoaXNQYXJ0aWFsICYmICFwYXJ0aWFsQXJncy5sZW5ndGgpIHtcbiAgICAgICAgYml0bWFzayAmPSB+MTY7XG4gICAgICAgIGlzUGFydGlhbCA9IHBhcnRpYWxBcmdzID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoaXNQYXJ0aWFsUmlnaHQgJiYgIXBhcnRpYWxSaWdodEFyZ3MubGVuZ3RoKSB7XG4gICAgICAgIGJpdG1hc2sgJj0gfjMyO1xuICAgICAgICBpc1BhcnRpYWxSaWdodCA9IHBhcnRpYWxSaWdodEFyZ3MgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHZhciBiaW5kRGF0YSA9IGZ1bmMgJiYgZnVuYy5fX2JpbmREYXRhX187XG4gICAgICBpZiAoYmluZERhdGEgJiYgYmluZERhdGEgIT09IHRydWUpIHtcbiAgICAgICAgLy8gY2xvbmUgYGJpbmREYXRhYFxuICAgICAgICBiaW5kRGF0YSA9IHNsaWNlKGJpbmREYXRhKTtcbiAgICAgICAgaWYgKGJpbmREYXRhWzJdKSB7XG4gICAgICAgICAgYmluZERhdGFbMl0gPSBzbGljZShiaW5kRGF0YVsyXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJpbmREYXRhWzNdKSB7XG4gICAgICAgICAgYmluZERhdGFbM10gPSBzbGljZShiaW5kRGF0YVszXSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2V0IGB0aGlzQmluZGluZ2AgaXMgbm90IHByZXZpb3VzbHkgYm91bmRcbiAgICAgICAgaWYgKGlzQmluZCAmJiAhKGJpbmREYXRhWzFdICYgMSkpIHtcbiAgICAgICAgICBiaW5kRGF0YVs0XSA9IHRoaXNBcmc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2V0IGlmIHByZXZpb3VzbHkgYm91bmQgYnV0IG5vdCBjdXJyZW50bHkgKHN1YnNlcXVlbnQgY3VycmllZCBmdW5jdGlvbnMpXG4gICAgICAgIGlmICghaXNCaW5kICYmIGJpbmREYXRhWzFdICYgMSkge1xuICAgICAgICAgIGJpdG1hc2sgfD0gODtcbiAgICAgICAgfVxuICAgICAgICAvLyBzZXQgY3VycmllZCBhcml0eSBpZiBub3QgeWV0IHNldFxuICAgICAgICBpZiAoaXNDdXJyeSAmJiAhKGJpbmREYXRhWzFdICYgNCkpIHtcbiAgICAgICAgICBiaW5kRGF0YVs1XSA9IGFyaXR5O1xuICAgICAgICB9XG4gICAgICAgIC8vIGFwcGVuZCBwYXJ0aWFsIGxlZnQgYXJndW1lbnRzXG4gICAgICAgIGlmIChpc1BhcnRpYWwpIHtcbiAgICAgICAgICBwdXNoLmFwcGx5KGJpbmREYXRhWzJdIHx8IChiaW5kRGF0YVsyXSA9IFtdKSwgcGFydGlhbEFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGFwcGVuZCBwYXJ0aWFsIHJpZ2h0IGFyZ3VtZW50c1xuICAgICAgICBpZiAoaXNQYXJ0aWFsUmlnaHQpIHtcbiAgICAgICAgICB1bnNoaWZ0LmFwcGx5KGJpbmREYXRhWzNdIHx8IChiaW5kRGF0YVszXSA9IFtdKSwgcGFydGlhbFJpZ2h0QXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbWVyZ2UgZmxhZ3NcbiAgICAgICAgYmluZERhdGFbMV0gfD0gYml0bWFzaztcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVdyYXBwZXIuYXBwbHkobnVsbCwgYmluZERhdGEpO1xuICAgICAgfVxuICAgICAgLy8gZmFzdCBwYXRoIGZvciBgXy5iaW5kYFxuICAgICAgdmFyIGNyZWF0ZXIgPSAoYml0bWFzayA9PSAxIHx8IGJpdG1hc2sgPT09IDE3KSA/IGJhc2VCaW5kIDogYmFzZUNyZWF0ZVdyYXBwZXI7XG4gICAgICByZXR1cm4gY3JlYXRlcihbZnVuYywgYml0bWFzaywgcGFydGlhbEFyZ3MsIHBhcnRpYWxSaWdodEFyZ3MsIHRoaXNBcmcsIGFyaXR5XSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXNlZCBieSBgZXNjYXBlYCB0byBjb252ZXJ0IGNoYXJhY3RlcnMgdG8gSFRNTCBlbnRpdGllcy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1hdGNoIFRoZSBtYXRjaGVkIGNoYXJhY3RlciB0byBlc2NhcGUuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgZXNjYXBlZCBjaGFyYWN0ZXIuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZXNjYXBlSHRtbENoYXIobWF0Y2gpIHtcbiAgICAgIHJldHVybiBodG1sRXNjYXBlc1ttYXRjaF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgYXBwcm9wcmlhdGUgXCJpbmRleE9mXCIgZnVuY3Rpb24uIElmIHRoZSBgXy5pbmRleE9mYCBtZXRob2QgaXNcbiAgICAgKiBjdXN0b21pemVkLCB0aGlzIG1ldGhvZCByZXR1cm5zIHRoZSBjdXN0b20gbWV0aG9kLCBvdGhlcndpc2UgaXQgcmV0dXJuc1xuICAgICAqIHRoZSBgYmFzZUluZGV4T2ZgIGZ1bmN0aW9uLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIFwiaW5kZXhPZlwiIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldEluZGV4T2YoKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gKHJlc3VsdCA9IGxvZGFzaC5pbmRleE9mKSA9PT0gaW5kZXhPZiA/IGJhc2VJbmRleE9mIDogcmVzdWx0O1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIG5hdGl2ZSBmdW5jdGlvbi5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGEgbmF0aXZlIGZ1bmN0aW9uLCBlbHNlIGBmYWxzZWAuXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNOYXRpdmUodmFsdWUpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ2Z1bmN0aW9uJyAmJiByZU5hdGl2ZS50ZXN0KHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIGB0aGlzYCBiaW5kaW5nIGRhdGEgb24gYSBnaXZlbiBmdW5jdGlvbi5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gc2V0IGRhdGEgb24uXG4gICAgICogQHBhcmFtIHtBcnJheX0gdmFsdWUgVGhlIGRhdGEgYXJyYXkgdG8gc2V0LlxuICAgICAqL1xuICAgIHZhciBzZXRCaW5kRGF0YSA9ICFkZWZpbmVQcm9wZXJ0eSA/IG5vb3AgOiBmdW5jdGlvbihmdW5jLCB2YWx1ZSkge1xuICAgICAgZGVzY3JpcHRvci52YWx1ZSA9IHZhbHVlO1xuICAgICAgZGVmaW5lUHJvcGVydHkoZnVuYywgJ19fYmluZERhdGFfXycsIGRlc2NyaXB0b3IpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBIGZhbGxiYWNrIGltcGxlbWVudGF0aW9uIG9mIGBpc1BsYWluT2JqZWN0YCB3aGljaCBjaGVja3MgaWYgYSBnaXZlbiB2YWx1ZVxuICAgICAqIGlzIGFuIG9iamVjdCBjcmVhdGVkIGJ5IHRoZSBgT2JqZWN0YCBjb25zdHJ1Y3RvciwgYXNzdW1pbmcgb2JqZWN0cyBjcmVhdGVkXG4gICAgICogYnkgdGhlIGBPYmplY3RgIGNvbnN0cnVjdG9yIGhhdmUgbm8gaW5oZXJpdGVkIGVudW1lcmFibGUgcHJvcGVydGllcyBhbmQgdGhhdFxuICAgICAqIHRoZXJlIGFyZSBubyBgT2JqZWN0LnByb3RvdHlwZWAgZXh0ZW5zaW9ucy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSBwbGFpbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaGltSXNQbGFpbk9iamVjdCh2YWx1ZSkge1xuICAgICAgdmFyIGN0b3IsXG4gICAgICAgICAgcmVzdWx0O1xuXG4gICAgICAvLyBhdm9pZCBub24gT2JqZWN0IG9iamVjdHMsIGBhcmd1bWVudHNgIG9iamVjdHMsIGFuZCBET00gZWxlbWVudHNcbiAgICAgIGlmICghKHZhbHVlICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09IG9iamVjdENsYXNzKSB8fFxuICAgICAgICAgIChjdG9yID0gdmFsdWUuY29uc3RydWN0b3IsIGlzRnVuY3Rpb24oY3RvcikgJiYgIShjdG9yIGluc3RhbmNlb2YgY3RvcikpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIEluIG1vc3QgZW52aXJvbm1lbnRzIGFuIG9iamVjdCdzIG93biBwcm9wZXJ0aWVzIGFyZSBpdGVyYXRlZCBiZWZvcmVcbiAgICAgIC8vIGl0cyBpbmhlcml0ZWQgcHJvcGVydGllcy4gSWYgdGhlIGxhc3QgaXRlcmF0ZWQgcHJvcGVydHkgaXMgYW4gb2JqZWN0J3NcbiAgICAgIC8vIG93biBwcm9wZXJ0eSB0aGVuIHRoZXJlIGFyZSBubyBpbmhlcml0ZWQgZW51bWVyYWJsZSBwcm9wZXJ0aWVzLlxuICAgICAgZm9ySW4odmFsdWUsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgcmVzdWx0ID0ga2V5O1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gdHlwZW9mIHJlc3VsdCA9PSAndW5kZWZpbmVkJyB8fCBoYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCByZXN1bHQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVzZWQgYnkgYHVuZXNjYXBlYCB0byBjb252ZXJ0IEhUTUwgZW50aXRpZXMgdG8gY2hhcmFjdGVycy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1hdGNoIFRoZSBtYXRjaGVkIGNoYXJhY3RlciB0byB1bmVzY2FwZS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSB1bmVzY2FwZWQgY2hhcmFjdGVyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVuZXNjYXBlSHRtbENoYXIobWF0Y2gpIHtcbiAgICAgIHJldHVybiBodG1sVW5lc2NhcGVzW21hdGNoXTtcbiAgICB9XG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGFuIGBhcmd1bWVudHNgIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGFuIGBhcmd1bWVudHNgIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAoZnVuY3Rpb24oKSB7IHJldHVybiBfLmlzQXJndW1lbnRzKGFyZ3VtZW50cyk7IH0pKDEsIDIsIDMpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uaXNBcmd1bWVudHMoWzEsIDIsIDNdKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzQXJndW1lbnRzKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnICYmIHR5cGVvZiB2YWx1ZS5sZW5ndGggPT0gJ251bWJlcicgJiZcbiAgICAgICAgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT0gYXJnc0NsYXNzIHx8IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGFuIGFycmF5LlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBhbiBhcnJheSwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAoZnVuY3Rpb24oKSB7IHJldHVybiBfLmlzQXJyYXkoYXJndW1lbnRzKTsgfSkoKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqXG4gICAgICogXy5pc0FycmF5KFsxLCAyLCAzXSk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIHZhciBpc0FycmF5ID0gbmF0aXZlSXNBcnJheSB8fCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUubGVuZ3RoID09ICdudW1iZXInICYmXG4gICAgICAgIHRvU3RyaW5nLmNhbGwodmFsdWUpID09IGFycmF5Q2xhc3MgfHwgZmFsc2U7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEEgZmFsbGJhY2sgaW1wbGVtZW50YXRpb24gb2YgYE9iamVjdC5rZXlzYCB3aGljaCBwcm9kdWNlcyBhbiBhcnJheSBvZiB0aGVcbiAgICAgKiBnaXZlbiBvYmplY3QncyBvd24gZW51bWVyYWJsZSBwcm9wZXJ0eSBuYW1lcy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaW5zcGVjdC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYW4gYXJyYXkgb2YgcHJvcGVydHkgbmFtZXMuXG4gICAgICovXG4gICAgdmFyIHNoaW1LZXlzID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICB2YXIgaW5kZXgsIGl0ZXJhYmxlID0gb2JqZWN0LCByZXN1bHQgPSBbXTtcbiAgICAgIGlmICghaXRlcmFibGUpIHJldHVybiByZXN1bHQ7XG4gICAgICBpZiAoIShvYmplY3RUeXBlc1t0eXBlb2Ygb2JqZWN0XSkpIHJldHVybiByZXN1bHQ7XG4gICAgICAgIGZvciAoaW5kZXggaW4gaXRlcmFibGUpIHtcbiAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChpdGVyYWJsZSwgaW5kZXgpKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChpbmRleCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgY29tcG9zZWQgb2YgdGhlIG93biBlbnVtZXJhYmxlIHByb3BlcnR5IG5hbWVzIG9mIGFuIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGluc3BlY3QuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGFuIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmtleXMoeyAnb25lJzogMSwgJ3R3byc6IDIsICd0aHJlZSc6IDMgfSk7XG4gICAgICogLy8gPT4gWydvbmUnLCAndHdvJywgJ3RocmVlJ10gKHByb3BlcnR5IG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkIGFjcm9zcyBlbnZpcm9ubWVudHMpXG4gICAgICovXG4gICAgdmFyIGtleXMgPSAhbmF0aXZlS2V5cyA/IHNoaW1LZXlzIDogZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICBpZiAoIWlzT2JqZWN0KG9iamVjdCkpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5hdGl2ZUtleXMob2JqZWN0KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVXNlZCB0byBjb252ZXJ0IGNoYXJhY3RlcnMgdG8gSFRNTCBlbnRpdGllczpcbiAgICAgKlxuICAgICAqIFRob3VnaCB0aGUgYD5gIGNoYXJhY3RlciBpcyBlc2NhcGVkIGZvciBzeW1tZXRyeSwgY2hhcmFjdGVycyBsaWtlIGA+YCBhbmQgYC9gXG4gICAgICogZG9uJ3QgcmVxdWlyZSBlc2NhcGluZyBpbiBIVE1MIGFuZCBoYXZlIG5vIHNwZWNpYWwgbWVhbmluZyB1bmxlc3MgdGhleSdyZSBwYXJ0XG4gICAgICogb2YgYSB0YWcgb3IgYW4gdW5xdW90ZWQgYXR0cmlidXRlIHZhbHVlLlxuICAgICAqIGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2FtYmlndW91cy1hbXBlcnNhbmRzICh1bmRlciBcInNlbWktcmVsYXRlZCBmdW4gZmFjdFwiKVxuICAgICAqL1xuICAgIHZhciBodG1sRXNjYXBlcyA9IHtcbiAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICc8JzogJyZsdDsnLFxuICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgIFwiJ1wiOiAnJiMzOTsnXG4gICAgfTtcblxuICAgIC8qKiBVc2VkIHRvIGNvbnZlcnQgSFRNTCBlbnRpdGllcyB0byBjaGFyYWN0ZXJzICovXG4gICAgdmFyIGh0bWxVbmVzY2FwZXMgPSBpbnZlcnQoaHRtbEVzY2FwZXMpO1xuXG4gICAgLyoqIFVzZWQgdG8gbWF0Y2ggSFRNTCBlbnRpdGllcyBhbmQgSFRNTCBjaGFyYWN0ZXJzICovXG4gICAgdmFyIHJlRXNjYXBlZEh0bWwgPSBSZWdFeHAoJygnICsga2V5cyhodG1sVW5lc2NhcGVzKS5qb2luKCd8JykgKyAnKScsICdnJyksXG4gICAgICAgIHJlVW5lc2NhcGVkSHRtbCA9IFJlZ0V4cCgnWycgKyBrZXlzKGh0bWxFc2NhcGVzKS5qb2luKCcnKSArICddJywgJ2cnKTtcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqXG4gICAgICogQXNzaWducyBvd24gZW51bWVyYWJsZSBwcm9wZXJ0aWVzIG9mIHNvdXJjZSBvYmplY3QocykgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICogb2JqZWN0LiBTdWJzZXF1ZW50IHNvdXJjZXMgd2lsbCBvdmVyd3JpdGUgcHJvcGVydHkgYXNzaWdubWVudHMgb2YgcHJldmlvdXNcbiAgICAgKiBzb3VyY2VzLiBJZiBhIGNhbGxiYWNrIGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgZXhlY3V0ZWQgdG8gcHJvZHVjZSB0aGVcbiAgICAgKiBhc3NpZ25lZCB2YWx1ZXMuIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCB0d29cbiAgICAgKiBhcmd1bWVudHM7IChvYmplY3RWYWx1ZSwgc291cmNlVmFsdWUpLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgKiBAYWxpYXMgZXh0ZW5kXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gICAgICogQHBhcmFtIHsuLi5PYmplY3R9IFtzb3VyY2VdIFRoZSBzb3VyY2Ugb2JqZWN0cy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIFRoZSBmdW5jdGlvbiB0byBjdXN0b21pemUgYXNzaWduaW5nIHZhbHVlcy5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uYXNzaWduKHsgJ25hbWUnOiAnZnJlZCcgfSwgeyAnZW1wbG95ZXInOiAnc2xhdGUnIH0pO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnZnJlZCcsICdlbXBsb3llcic6ICdzbGF0ZScgfVxuICAgICAqXG4gICAgICogdmFyIGRlZmF1bHRzID0gXy5wYXJ0aWFsUmlnaHQoXy5hc3NpZ24sIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgKiAgIHJldHVybiB0eXBlb2YgYSA9PSAndW5kZWZpbmVkJyA/IGIgOiBhO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogdmFyIG9iamVjdCA9IHsgJ25hbWUnOiAnYmFybmV5JyB9O1xuICAgICAqIGRlZmF1bHRzKG9iamVjdCwgeyAnbmFtZSc6ICdmcmVkJywgJ2VtcGxveWVyJzogJ3NsYXRlJyB9KTtcbiAgICAgKiAvLyA9PiB7ICduYW1lJzogJ2Jhcm5leScsICdlbXBsb3llcic6ICdzbGF0ZScgfVxuICAgICAqL1xuICAgIHZhciBhc3NpZ24gPSBmdW5jdGlvbihvYmplY3QsIHNvdXJjZSwgZ3VhcmQpIHtcbiAgICAgIHZhciBpbmRleCwgaXRlcmFibGUgPSBvYmplY3QsIHJlc3VsdCA9IGl0ZXJhYmxlO1xuICAgICAgaWYgKCFpdGVyYWJsZSkgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzLFxuICAgICAgICAgIGFyZ3NJbmRleCA9IDAsXG4gICAgICAgICAgYXJnc0xlbmd0aCA9IHR5cGVvZiBndWFyZCA9PSAnbnVtYmVyJyA/IDIgOiBhcmdzLmxlbmd0aDtcbiAgICAgIGlmIChhcmdzTGVuZ3RoID4gMyAmJiB0eXBlb2YgYXJnc1thcmdzTGVuZ3RoIC0gMl0gPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSBiYXNlQ3JlYXRlQ2FsbGJhY2soYXJnc1stLWFyZ3NMZW5ndGggLSAxXSwgYXJnc1thcmdzTGVuZ3RoLS1dLCAyKTtcbiAgICAgIH0gZWxzZSBpZiAoYXJnc0xlbmd0aCA+IDIgJiYgdHlwZW9mIGFyZ3NbYXJnc0xlbmd0aCAtIDFdID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBhcmdzWy0tYXJnc0xlbmd0aF07XG4gICAgICB9XG4gICAgICB3aGlsZSAoKythcmdzSW5kZXggPCBhcmdzTGVuZ3RoKSB7XG4gICAgICAgIGl0ZXJhYmxlID0gYXJnc1thcmdzSW5kZXhdO1xuICAgICAgICBpZiAoaXRlcmFibGUgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIGl0ZXJhYmxlXSkge1xuICAgICAgICB2YXIgb3duSW5kZXggPSAtMSxcbiAgICAgICAgICAgIG93blByb3BzID0gb2JqZWN0VHlwZXNbdHlwZW9mIGl0ZXJhYmxlXSAmJiBrZXlzKGl0ZXJhYmxlKSxcbiAgICAgICAgICAgIGxlbmd0aCA9IG93blByb3BzID8gb3duUHJvcHMubGVuZ3RoIDogMDtcblxuICAgICAgICB3aGlsZSAoKytvd25JbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgIGluZGV4ID0gb3duUHJvcHNbb3duSW5kZXhdO1xuICAgICAgICAgIHJlc3VsdFtpbmRleF0gPSBjYWxsYmFjayA/IGNhbGxiYWNrKHJlc3VsdFtpbmRleF0sIGl0ZXJhYmxlW2luZGV4XSkgOiBpdGVyYWJsZVtpbmRleF07XG4gICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgY2xvbmUgb2YgYHZhbHVlYC4gSWYgYGlzRGVlcGAgaXMgYHRydWVgIG5lc3RlZCBvYmplY3RzIHdpbGwgYWxzb1xuICAgICAqIGJlIGNsb25lZCwgb3RoZXJ3aXNlIHRoZXkgd2lsbCBiZSBhc3NpZ25lZCBieSByZWZlcmVuY2UuIElmIGEgY2FsbGJhY2tcbiAgICAgKiBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIGV4ZWN1dGVkIHRvIHByb2R1Y2UgdGhlIGNsb25lZCB2YWx1ZXMuIElmIHRoZVxuICAgICAqIGNhbGxiYWNrIHJldHVybnMgYHVuZGVmaW5lZGAgY2xvbmluZyB3aWxsIGJlIGhhbmRsZWQgYnkgdGhlIG1ldGhvZCBpbnN0ZWFkLlxuICAgICAqIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCBvbmUgYXJndW1lbnQ7ICh2YWx1ZSkuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNsb25lLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lzRGVlcD1mYWxzZV0gU3BlY2lmeSBhIGRlZXAgY2xvbmUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGNsb25pbmcgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBjbG9uZWQgdmFsdWUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAnZnJlZCcsICAgJ2FnZSc6IDQwIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogdmFyIHNoYWxsb3cgPSBfLmNsb25lKGNoYXJhY3RlcnMpO1xuICAgICAqIHNoYWxsb3dbMF0gPT09IGNoYXJhY3RlcnNbMF07XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqXG4gICAgICogdmFyIGRlZXAgPSBfLmNsb25lKGNoYXJhY3RlcnMsIHRydWUpO1xuICAgICAqIGRlZXBbMF0gPT09IGNoYXJhY3RlcnNbMF07XG4gICAgICogLy8gPT4gZmFsc2VcbiAgICAgKlxuICAgICAqIF8ubWl4aW4oe1xuICAgICAqICAgJ2Nsb25lJzogXy5wYXJ0aWFsUmlnaHQoXy5jbG9uZSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgKiAgICAgcmV0dXJuIF8uaXNFbGVtZW50KHZhbHVlKSA/IHZhbHVlLmNsb25lTm9kZShmYWxzZSkgOiB1bmRlZmluZWQ7XG4gICAgICogICB9KVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogdmFyIGNsb25lID0gXy5jbG9uZShkb2N1bWVudC5ib2R5KTtcbiAgICAgKiBjbG9uZS5jaGlsZE5vZGVzLmxlbmd0aDtcbiAgICAgKiAvLyA9PiAwXG4gICAgICovXG4gICAgZnVuY3Rpb24gY2xvbmUodmFsdWUsIGlzRGVlcCwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIC8vIGFsbG93cyB3b3JraW5nIHdpdGggXCJDb2xsZWN0aW9uc1wiIG1ldGhvZHMgd2l0aG91dCB1c2luZyB0aGVpciBgaW5kZXhgXG4gICAgICAvLyBhbmQgYGNvbGxlY3Rpb25gIGFyZ3VtZW50cyBmb3IgYGlzRGVlcGAgYW5kIGBjYWxsYmFja2BcbiAgICAgIGlmICh0eXBlb2YgaXNEZWVwICE9ICdib29sZWFuJyAmJiBpc0RlZXAgIT0gbnVsbCkge1xuICAgICAgICB0aGlzQXJnID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrID0gaXNEZWVwO1xuICAgICAgICBpc0RlZXAgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBiYXNlQ2xvbmUodmFsdWUsIGlzRGVlcCwgdHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicgJiYgYmFzZUNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAxKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGRlZXAgY2xvbmUgb2YgYHZhbHVlYC4gSWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZCBpdCB3aWxsIGJlXG4gICAgICogZXhlY3V0ZWQgdG8gcHJvZHVjZSB0aGUgY2xvbmVkIHZhbHVlcy4gSWYgdGhlIGNhbGxiYWNrIHJldHVybnMgYHVuZGVmaW5lZGBcbiAgICAgKiBjbG9uaW5nIHdpbGwgYmUgaGFuZGxlZCBieSB0aGUgbWV0aG9kIGluc3RlYWQuIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0b1xuICAgICAqIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIG9uZSBhcmd1bWVudDsgKHZhbHVlKS5cbiAgICAgKlxuICAgICAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIGxvb3NlbHkgYmFzZWQgb24gdGhlIHN0cnVjdHVyZWQgY2xvbmUgYWxnb3JpdGhtLiBGdW5jdGlvbnNcbiAgICAgKiBhbmQgRE9NIG5vZGVzIGFyZSAqKm5vdCoqIGNsb25lZC4gVGhlIGVudW1lcmFibGUgcHJvcGVydGllcyBvZiBgYXJndW1lbnRzYCBvYmplY3RzIGFuZFxuICAgICAqIG9iamVjdHMgY3JlYXRlZCBieSBjb25zdHJ1Y3RvcnMgb3RoZXIgdGhhbiBgT2JqZWN0YCBhcmUgY2xvbmVkIHRvIHBsYWluIGBPYmplY3RgIG9iamVjdHMuXG4gICAgICogU2VlIGh0dHA6Ly93d3cudzMub3JnL1RSL2h0bWw1L2luZnJhc3RydWN0dXJlLmh0bWwjaW50ZXJuYWwtc3RydWN0dXJlZC1jbG9uaW5nLWFsZ29yaXRobS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gZGVlcCBjbG9uZS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIFRoZSBmdW5jdGlvbiB0byBjdXN0b21pemUgY2xvbmluZyB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGRlZXAgY2xvbmVkIHZhbHVlLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IFtcbiAgICAgKiAgIHsgJ25hbWUnOiAnYmFybmV5JywgJ2FnZSc6IDM2IH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICdhZ2UnOiA0MCB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIHZhciBkZWVwID0gXy5jbG9uZURlZXAoY2hhcmFjdGVycyk7XG4gICAgICogZGVlcFswXSA9PT0gY2hhcmFjdGVyc1swXTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqXG4gICAgICogdmFyIHZpZXcgPSB7XG4gICAgICogICAnbGFiZWwnOiAnZG9jcycsXG4gICAgICogICAnbm9kZSc6IGVsZW1lbnRcbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogdmFyIGNsb25lID0gXy5jbG9uZURlZXAodmlldywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgKiAgIHJldHVybiBfLmlzRWxlbWVudCh2YWx1ZSkgPyB2YWx1ZS5jbG9uZU5vZGUodHJ1ZSkgOiB1bmRlZmluZWQ7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBjbG9uZS5ub2RlID09IHZpZXcubm9kZTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNsb25lRGVlcCh2YWx1ZSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHJldHVybiBiYXNlQ2xvbmUodmFsdWUsIHRydWUsIHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nICYmIGJhc2VDcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gb2JqZWN0IHRoYXQgaW5oZXJpdHMgZnJvbSB0aGUgZ2l2ZW4gYHByb3RvdHlwZWAgb2JqZWN0LiBJZiBhXG4gICAgICogYHByb3BlcnRpZXNgIG9iamVjdCBpcyBwcm92aWRlZCBpdHMgb3duIGVudW1lcmFibGUgcHJvcGVydGllcyBhcmUgYXNzaWduZWRcbiAgICAgKiB0byB0aGUgY3JlYXRlZCBvYmplY3QuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwcm90b3R5cGUgVGhlIG9iamVjdCB0byBpbmhlcml0IGZyb20uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtwcm9wZXJ0aWVzXSBUaGUgcHJvcGVydGllcyB0byBhc3NpZ24gdG8gdGhlIG9iamVjdC5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBuZXcgb2JqZWN0LlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBmdW5jdGlvbiBTaGFwZSgpIHtcbiAgICAgKiAgIHRoaXMueCA9IDA7XG4gICAgICogICB0aGlzLnkgPSAwO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIGZ1bmN0aW9uIENpcmNsZSgpIHtcbiAgICAgKiAgIFNoYXBlLmNhbGwodGhpcyk7XG4gICAgICogfVxuICAgICAqXG4gICAgICogQ2lyY2xlLnByb3RvdHlwZSA9IF8uY3JlYXRlKFNoYXBlLnByb3RvdHlwZSwgeyAnY29uc3RydWN0b3InOiBDaXJjbGUgfSk7XG4gICAgICpcbiAgICAgKiB2YXIgY2lyY2xlID0gbmV3IENpcmNsZTtcbiAgICAgKiBjaXJjbGUgaW5zdGFuY2VvZiBDaXJjbGU7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqXG4gICAgICogY2lyY2xlIGluc3RhbmNlb2YgU2hhcGU7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZShwcm90b3R5cGUsIHByb3BlcnRpZXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBiYXNlQ3JlYXRlKHByb3RvdHlwZSk7XG4gICAgICByZXR1cm4gcHJvcGVydGllcyA/IGFzc2lnbihyZXN1bHQsIHByb3BlcnRpZXMpIDogcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFzc2lnbnMgb3duIGVudW1lcmFibGUgcHJvcGVydGllcyBvZiBzb3VyY2Ugb2JqZWN0KHMpIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAqIG9iamVjdCBmb3IgYWxsIGRlc3RpbmF0aW9uIHByb3BlcnRpZXMgdGhhdCByZXNvbHZlIHRvIGB1bmRlZmluZWRgLiBPbmNlIGFcbiAgICAgKiBwcm9wZXJ0eSBpcyBzZXQsIGFkZGl0aW9uYWwgZGVmYXVsdHMgb2YgdGhlIHNhbWUgcHJvcGVydHkgd2lsbCBiZSBpZ25vcmVkLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gW3NvdXJjZV0gVGhlIHNvdXJjZSBvYmplY3RzLlxuICAgICAqIEBwYXJhbS0ge09iamVjdH0gW2d1YXJkXSBBbGxvd3Mgd29ya2luZyB3aXRoIGBfLnJlZHVjZWAgd2l0aG91dCB1c2luZyBpdHNcbiAgICAgKiAgYGtleWAgYW5kIGBvYmplY3RgIGFyZ3VtZW50cyBhcyBzb3VyY2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIG9iamVjdCA9IHsgJ25hbWUnOiAnYmFybmV5JyB9O1xuICAgICAqIF8uZGVmYXVsdHMob2JqZWN0LCB7ICduYW1lJzogJ2ZyZWQnLCAnZW1wbG95ZXInOiAnc2xhdGUnIH0pO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnYmFybmV5JywgJ2VtcGxveWVyJzogJ3NsYXRlJyB9XG4gICAgICovXG4gICAgdmFyIGRlZmF1bHRzID0gZnVuY3Rpb24ob2JqZWN0LCBzb3VyY2UsIGd1YXJkKSB7XG4gICAgICB2YXIgaW5kZXgsIGl0ZXJhYmxlID0gb2JqZWN0LCByZXN1bHQgPSBpdGVyYWJsZTtcbiAgICAgIGlmICghaXRlcmFibGUpIHJldHVybiByZXN1bHQ7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cyxcbiAgICAgICAgICBhcmdzSW5kZXggPSAwLFxuICAgICAgICAgIGFyZ3NMZW5ndGggPSB0eXBlb2YgZ3VhcmQgPT0gJ251bWJlcicgPyAyIDogYXJncy5sZW5ndGg7XG4gICAgICB3aGlsZSAoKythcmdzSW5kZXggPCBhcmdzTGVuZ3RoKSB7XG4gICAgICAgIGl0ZXJhYmxlID0gYXJnc1thcmdzSW5kZXhdO1xuICAgICAgICBpZiAoaXRlcmFibGUgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIGl0ZXJhYmxlXSkge1xuICAgICAgICB2YXIgb3duSW5kZXggPSAtMSxcbiAgICAgICAgICAgIG93blByb3BzID0gb2JqZWN0VHlwZXNbdHlwZW9mIGl0ZXJhYmxlXSAmJiBrZXlzKGl0ZXJhYmxlKSxcbiAgICAgICAgICAgIGxlbmd0aCA9IG93blByb3BzID8gb3duUHJvcHMubGVuZ3RoIDogMDtcblxuICAgICAgICB3aGlsZSAoKytvd25JbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgIGluZGV4ID0gb3duUHJvcHNbb3duSW5kZXhdO1xuICAgICAgICAgIGlmICh0eXBlb2YgcmVzdWx0W2luZGV4XSA9PSAndW5kZWZpbmVkJykgcmVzdWx0W2luZGV4XSA9IGl0ZXJhYmxlW2luZGV4XTtcbiAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGxpa2UgYF8uZmluZEluZGV4YCBleGNlcHQgdGhhdCBpdCByZXR1cm5zIHRoZSBrZXkgb2YgdGhlXG4gICAgICogZmlyc3QgZWxlbWVudCB0aGF0IHBhc3NlcyB0aGUgY2FsbGJhY2sgY2hlY2ssIGluc3RlYWQgb2YgdGhlIGVsZW1lbnQgaXRzZWxmLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBzZWFyY2guXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWQgcGVyXG4gICAgICogIGl0ZXJhdGlvbi4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWQgdG9cbiAgICAgKiAgY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfHVuZGVmaW5lZH0gUmV0dXJucyB0aGUga2V5IG9mIHRoZSBmb3VuZCBlbGVtZW50LCBlbHNlIGB1bmRlZmluZWRgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IHtcbiAgICAgKiAgICdiYXJuZXknOiB7ICAnYWdlJzogMzYsICdibG9ja2VkJzogZmFsc2UgfSxcbiAgICAgKiAgICdmcmVkJzogeyAgICAnYWdlJzogNDAsICdibG9ja2VkJzogdHJ1ZSB9LFxuICAgICAqICAgJ3BlYmJsZXMnOiB7ICdhZ2UnOiAxLCAgJ2Jsb2NrZWQnOiBmYWxzZSB9XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIF8uZmluZEtleShjaGFyYWN0ZXJzLCBmdW5jdGlvbihjaHIpIHtcbiAgICAgKiAgIHJldHVybiBjaHIuYWdlIDwgNDA7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4gJ2Jhcm5leScgKHByb3BlcnR5IG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkIGFjcm9zcyBlbnZpcm9ubWVudHMpXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ud2hlcmVcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLmZpbmRLZXkoY2hhcmFjdGVycywgeyAnYWdlJzogMSB9KTtcbiAgICAgKiAvLyA9PiAncGViYmxlcydcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmluZEtleShjaGFyYWN0ZXJzLCAnYmxvY2tlZCcpO1xuICAgICAqIC8vID0+ICdmcmVkJ1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmRLZXkob2JqZWN0LCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIHJlc3VsdDtcbiAgICAgIGNhbGxiYWNrID0gbG9kYXNoLmNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgIGZvck93bihvYmplY3QsIGZ1bmN0aW9uKHZhbHVlLCBrZXksIG9iamVjdCkge1xuICAgICAgICBpZiAoY2FsbGJhY2sodmFsdWUsIGtleSwgb2JqZWN0KSkge1xuICAgICAgICAgIHJlc3VsdCA9IGtleTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBsaWtlIGBfLmZpbmRLZXlgIGV4Y2VwdCB0aGF0IGl0IGl0ZXJhdGVzIG92ZXIgZWxlbWVudHNcbiAgICAgKiBvZiBhIGBjb2xsZWN0aW9uYCBpbiB0aGUgb3Bwb3NpdGUgb3JkZXIuXG4gICAgICpcbiAgICAgKiBJZiBhIHByb3BlcnR5IG5hbWUgaXMgcHJvdmlkZWQgZm9yIGBjYWxsYmFja2AgdGhlIGNyZWF0ZWQgXCJfLnBsdWNrXCIgc3R5bGVcbiAgICAgKiBjYWxsYmFjayB3aWxsIHJldHVybiB0aGUgcHJvcGVydHkgdmFsdWUgb2YgdGhlIGdpdmVuIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBJZiBhbiBvYmplY3QgaXMgcHJvdmlkZWQgZm9yIGBjYWxsYmFja2AgdGhlIGNyZWF0ZWQgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2tcbiAgICAgKiB3aWxsIHJldHVybiBgdHJ1ZWAgZm9yIGVsZW1lbnRzIHRoYXQgaGF2ZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgZ2l2ZW4gb2JqZWN0LFxuICAgICAqIGVsc2UgYGZhbHNlYC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHNlYXJjaC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZCBwZXJcbiAgICAgKiAgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZCB0b1xuICAgICAqICBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8dW5kZWZpbmVkfSBSZXR1cm5zIHRoZSBrZXkgb2YgdGhlIGZvdW5kIGVsZW1lbnQsIGVsc2UgYHVuZGVmaW5lZGAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0ge1xuICAgICAqICAgJ2Jhcm5leSc6IHsgICdhZ2UnOiAzNiwgJ2Jsb2NrZWQnOiB0cnVlIH0sXG4gICAgICogICAnZnJlZCc6IHsgICAgJ2FnZSc6IDQwLCAnYmxvY2tlZCc6IGZhbHNlIH0sXG4gICAgICogICAncGViYmxlcyc6IHsgJ2FnZSc6IDEsICAnYmxvY2tlZCc6IHRydWUgfVxuICAgICAqIH07XG4gICAgICpcbiAgICAgKiBfLmZpbmRMYXN0S2V5KGNoYXJhY3RlcnMsIGZ1bmN0aW9uKGNocikge1xuICAgICAqICAgcmV0dXJuIGNoci5hZ2UgPCA0MDtcbiAgICAgKiB9KTtcbiAgICAgKiAvLyA9PiByZXR1cm5zIGBwZWJibGVzYCwgYXNzdW1pbmcgYF8uZmluZEtleWAgcmV0dXJucyBgYmFybmV5YFxuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLndoZXJlXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5maW5kTGFzdEtleShjaGFyYWN0ZXJzLCB7ICdhZ2UnOiA0MCB9KTtcbiAgICAgKiAvLyA9PiAnZnJlZCdcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmluZExhc3RLZXkoY2hhcmFjdGVycywgJ2Jsb2NrZWQnKTtcbiAgICAgKiAvLyA9PiAncGViYmxlcydcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaW5kTGFzdEtleShvYmplY3QsIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgcmVzdWx0O1xuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgZm9yT3duUmlnaHQob2JqZWN0LCBmdW5jdGlvbih2YWx1ZSwga2V5LCBvYmplY3QpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKHZhbHVlLCBrZXksIG9iamVjdCkpIHtcbiAgICAgICAgICByZXN1bHQgPSBrZXk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZXMgb3ZlciBvd24gYW5kIGluaGVyaXRlZCBlbnVtZXJhYmxlIHByb3BlcnRpZXMgb2YgYW4gb2JqZWN0LFxuICAgICAqIGV4ZWN1dGluZyB0aGUgY2FsbGJhY2sgZm9yIGVhY2ggcHJvcGVydHkuIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2BcbiAgICAgKiBhbmQgaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50czsgKHZhbHVlLCBrZXksIG9iamVjdCkuIENhbGxiYWNrcyBtYXkgZXhpdFxuICAgICAqIGl0ZXJhdGlvbiBlYXJseSBieSBleHBsaWNpdGx5IHJldHVybmluZyBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkIHBlciBpdGVyYXRpb24uXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogZnVuY3Rpb24gU2hhcGUoKSB7XG4gICAgICogICB0aGlzLnggPSAwO1xuICAgICAqICAgdGhpcy55ID0gMDtcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiBTaGFwZS5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgKiAgIHRoaXMueCArPSB4O1xuICAgICAqICAgdGhpcy55ICs9IHk7XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIF8uZm9ySW4obmV3IFNoYXBlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICogICBjb25zb2xlLmxvZyhrZXkpO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IGxvZ3MgJ3gnLCAneScsIGFuZCAnbW92ZScgKHByb3BlcnR5IG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkIGFjcm9zcyBlbnZpcm9ubWVudHMpXG4gICAgICovXG4gICAgdmFyIGZvckluID0gZnVuY3Rpb24oY29sbGVjdGlvbiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBpbmRleCwgaXRlcmFibGUgPSBjb2xsZWN0aW9uLCByZXN1bHQgPSBpdGVyYWJsZTtcbiAgICAgIGlmICghaXRlcmFibGUpIHJldHVybiByZXN1bHQ7XG4gICAgICBpZiAoIW9iamVjdFR5cGVzW3R5cGVvZiBpdGVyYWJsZV0pIHJldHVybiByZXN1bHQ7XG4gICAgICBjYWxsYmFjayA9IGNhbGxiYWNrICYmIHR5cGVvZiB0aGlzQXJnID09ICd1bmRlZmluZWQnID8gY2FsbGJhY2sgOiBiYXNlQ3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgICBmb3IgKGluZGV4IGluIGl0ZXJhYmxlKSB7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrKGl0ZXJhYmxlW2luZGV4XSwgaW5kZXgsIGNvbGxlY3Rpb24pID09PSBmYWxzZSkgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBsaWtlIGBfLmZvckluYCBleGNlcHQgdGhhdCBpdCBpdGVyYXRlcyBvdmVyIGVsZW1lbnRzXG4gICAgICogb2YgYSBgY29sbGVjdGlvbmAgaW4gdGhlIG9wcG9zaXRlIG9yZGVyLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZCBwZXIgaXRlcmF0aW9uLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYG9iamVjdGAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIGZ1bmN0aW9uIFNoYXBlKCkge1xuICAgICAqICAgdGhpcy54ID0gMDtcbiAgICAgKiAgIHRoaXMueSA9IDA7XG4gICAgICogfVxuICAgICAqXG4gICAgICogU2hhcGUucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICogICB0aGlzLnggKz0geDtcbiAgICAgKiAgIHRoaXMueSArPSB5O1xuICAgICAqIH07XG4gICAgICpcbiAgICAgKiBfLmZvckluUmlnaHQobmV3IFNoYXBlLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICogICBjb25zb2xlLmxvZyhrZXkpO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IGxvZ3MgJ21vdmUnLCAneScsIGFuZCAneCcgYXNzdW1pbmcgYF8uZm9ySW4gYCBsb2dzICd4JywgJ3knLCBhbmQgJ21vdmUnXG4gICAgICovXG4gICAgZnVuY3Rpb24gZm9ySW5SaWdodChvYmplY3QsIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgcGFpcnMgPSBbXTtcblxuICAgICAgZm9ySW4ob2JqZWN0LCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIHBhaXJzLnB1c2goa2V5LCB2YWx1ZSk7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGxlbmd0aCA9IHBhaXJzLmxlbmd0aDtcbiAgICAgIGNhbGxiYWNrID0gYmFzZUNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgICBpZiAoY2FsbGJhY2socGFpcnNbbGVuZ3RoLS1dLCBwYWlyc1tsZW5ndGhdLCBvYmplY3QpID09PSBmYWxzZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGVzIG92ZXIgb3duIGVudW1lcmFibGUgcHJvcGVydGllcyBvZiBhbiBvYmplY3QsIGV4ZWN1dGluZyB0aGUgY2FsbGJhY2tcbiAgICAgKiBmb3IgZWFjaCBwcm9wZXJ0eS4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIHRocmVlXG4gICAgICogYXJndW1lbnRzOyAodmFsdWUsIGtleSwgb2JqZWN0KS4gQ2FsbGJhY2tzIG1heSBleGl0IGl0ZXJhdGlvbiBlYXJseSBieVxuICAgICAqIGV4cGxpY2l0bHkgcmV0dXJuaW5nIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAdHlwZSBGdW5jdGlvblxuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGBvYmplY3RgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmZvck93bih7ICcwJzogJ3plcm8nLCAnMSc6ICdvbmUnLCAnbGVuZ3RoJzogMiB9LCBmdW5jdGlvbihudW0sIGtleSkge1xuICAgICAqICAgY29uc29sZS5sb2coa2V5KTtcbiAgICAgKiB9KTtcbiAgICAgKiAvLyA9PiBsb2dzICcwJywgJzEnLCBhbmQgJ2xlbmd0aCcgKHByb3BlcnR5IG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkIGFjcm9zcyBlbnZpcm9ubWVudHMpXG4gICAgICovXG4gICAgdmFyIGZvck93biA9IGZ1bmN0aW9uKGNvbGxlY3Rpb24sIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgaW5kZXgsIGl0ZXJhYmxlID0gY29sbGVjdGlvbiwgcmVzdWx0ID0gaXRlcmFibGU7XG4gICAgICBpZiAoIWl0ZXJhYmxlKSByZXR1cm4gcmVzdWx0O1xuICAgICAgaWYgKCFvYmplY3RUeXBlc1t0eXBlb2YgaXRlcmFibGVdKSByZXR1cm4gcmVzdWx0O1xuICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayAmJiB0eXBlb2YgdGhpc0FyZyA9PSAndW5kZWZpbmVkJyA/IGNhbGxiYWNrIDogYmFzZUNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgICAgdmFyIG93bkluZGV4ID0gLTEsXG4gICAgICAgICAgICBvd25Qcm9wcyA9IG9iamVjdFR5cGVzW3R5cGVvZiBpdGVyYWJsZV0gJiYga2V5cyhpdGVyYWJsZSksXG4gICAgICAgICAgICBsZW5ndGggPSBvd25Qcm9wcyA/IG93blByb3BzLmxlbmd0aCA6IDA7XG5cbiAgICAgICAgd2hpbGUgKCsrb3duSW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICBpbmRleCA9IG93blByb3BzW293bkluZGV4XTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2soaXRlcmFibGVbaW5kZXhdLCBpbmRleCwgY29sbGVjdGlvbikgPT09IGZhbHNlKSByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGxpa2UgYF8uZm9yT3duYCBleGNlcHQgdGhhdCBpdCBpdGVyYXRlcyBvdmVyIGVsZW1lbnRzXG4gICAgICogb2YgYSBgY29sbGVjdGlvbmAgaW4gdGhlIG9wcG9zaXRlIG9yZGVyLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZCBwZXIgaXRlcmF0aW9uLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYG9iamVjdGAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uZm9yT3duUmlnaHQoeyAnMCc6ICd6ZXJvJywgJzEnOiAnb25lJywgJ2xlbmd0aCc6IDIgfSwgZnVuY3Rpb24obnVtLCBrZXkpIHtcbiAgICAgKiAgIGNvbnNvbGUubG9nKGtleSk7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4gbG9ncyAnbGVuZ3RoJywgJzEnLCBhbmQgJzAnIGFzc3VtaW5nIGBfLmZvck93bmAgbG9ncyAnMCcsICcxJywgYW5kICdsZW5ndGgnXG4gICAgICovXG4gICAgZnVuY3Rpb24gZm9yT3duUmlnaHQob2JqZWN0LCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIHByb3BzID0ga2V5cyhvYmplY3QpLFxuICAgICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aDtcblxuICAgICAgY2FsbGJhY2sgPSBiYXNlQ3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgIHZhciBrZXkgPSBwcm9wc1tsZW5ndGhdO1xuICAgICAgICBpZiAoY2FsbGJhY2sob2JqZWN0W2tleV0sIGtleSwgb2JqZWN0KSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgc29ydGVkIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzIG9mIGFsbCBlbnVtZXJhYmxlIHByb3BlcnRpZXMsXG4gICAgICogb3duIGFuZCBpbmhlcml0ZWQsIG9mIGBvYmplY3RgIHRoYXQgaGF2ZSBmdW5jdGlvbiB2YWx1ZXMuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAYWxpYXMgbWV0aG9kc1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGluc3BlY3QuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGFuIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzIHRoYXQgaGF2ZSBmdW5jdGlvbiB2YWx1ZXMuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uZnVuY3Rpb25zKF8pO1xuICAgICAqIC8vID0+IFsnYWxsJywgJ2FueScsICdiaW5kJywgJ2JpbmRBbGwnLCAnY2xvbmUnLCAnY29tcGFjdCcsICdjb21wb3NlJywgLi4uXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZ1bmN0aW9ucyhvYmplY3QpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIGZvckluKG9iamVjdCwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICByZXN1bHQucHVzaChrZXkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQuc29ydCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgc3BlY2lmaWVkIHByb3BlcnR5IG5hbWUgZXhpc3RzIGFzIGEgZGlyZWN0IHByb3BlcnR5IG9mIGBvYmplY3RgLFxuICAgICAqIGluc3RlYWQgb2YgYW4gaW5oZXJpdGVkIHByb3BlcnR5LlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaW5zcGVjdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSB0byBjaGVjay5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYga2V5IGlzIGEgZGlyZWN0IHByb3BlcnR5LCBlbHNlIGBmYWxzZWAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uaGFzKHsgJ2EnOiAxLCAnYic6IDIsICdjJzogMyB9LCAnYicpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBoYXMob2JqZWN0LCBrZXkpIHtcbiAgICAgIHJldHVybiBvYmplY3QgPyBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwga2V5KSA6IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gb2JqZWN0IGNvbXBvc2VkIG9mIHRoZSBpbnZlcnRlZCBrZXlzIGFuZCB2YWx1ZXMgb2YgdGhlIGdpdmVuIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGludmVydC5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBjcmVhdGVkIGludmVydGVkIG9iamVjdC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pbnZlcnQoeyAnZmlyc3QnOiAnZnJlZCcsICdzZWNvbmQnOiAnYmFybmV5JyB9KTtcbiAgICAgKiAvLyA9PiB7ICdmcmVkJzogJ2ZpcnN0JywgJ2Jhcm5leSc6ICdzZWNvbmQnIH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbnZlcnQob2JqZWN0KSB7XG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBwcm9wcyA9IGtleXMob2JqZWN0KSxcbiAgICAgICAgICBsZW5ndGggPSBwcm9wcy5sZW5ndGgsXG4gICAgICAgICAgcmVzdWx0ID0ge307XG5cbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciBrZXkgPSBwcm9wc1tpbmRleF07XG4gICAgICAgIHJlc3VsdFtvYmplY3Rba2V5XV0gPSBrZXk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgYm9vbGVhbiB2YWx1ZS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGEgYm9vbGVhbiB2YWx1ZSwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmlzQm9vbGVhbihudWxsKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzQm9vbGVhbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSB0cnVlIHx8IHZhbHVlID09PSBmYWxzZSB8fFxuICAgICAgICB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT0gYm9vbENsYXNzIHx8IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgZGF0ZS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGEgZGF0ZSwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmlzRGF0ZShuZXcgRGF0ZSk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzRGF0ZSh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PSBkYXRlQ2xhc3MgfHwgZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBET00gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGEgRE9NIGVsZW1lbnQsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pc0VsZW1lbnQoZG9jdW1lbnQuYm9keSk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzRWxlbWVudCh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlICYmIHZhbHVlLm5vZGVUeXBlID09PSAxIHx8IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGVtcHR5LiBBcnJheXMsIHN0cmluZ3MsIG9yIGBhcmd1bWVudHNgIG9iamVjdHMgd2l0aCBhXG4gICAgICogbGVuZ3RoIG9mIGAwYCBhbmQgb2JqZWN0cyB3aXRoIG5vIG93biBlbnVtZXJhYmxlIHByb3BlcnRpZXMgYXJlIGNvbnNpZGVyZWRcbiAgICAgKiBcImVtcHR5XCIuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gdmFsdWUgVGhlIHZhbHVlIHRvIGluc3BlY3QuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGVtcHR5LCBlbHNlIGBmYWxzZWAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uaXNFbXB0eShbMSwgMiwgM10pO1xuICAgICAqIC8vID0+IGZhbHNlXG4gICAgICpcbiAgICAgKiBfLmlzRW1wdHkoe30pO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uaXNFbXB0eSgnJyk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpIHtcbiAgICAgIHZhciByZXN1bHQgPSB0cnVlO1xuICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwodmFsdWUpLFxuICAgICAgICAgIGxlbmd0aCA9IHZhbHVlLmxlbmd0aDtcblxuICAgICAgaWYgKChjbGFzc05hbWUgPT0gYXJyYXlDbGFzcyB8fCBjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MgfHwgY2xhc3NOYW1lID09IGFyZ3NDbGFzcyApIHx8XG4gICAgICAgICAgKGNsYXNzTmFtZSA9PSBvYmplY3RDbGFzcyAmJiB0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInICYmIGlzRnVuY3Rpb24odmFsdWUuc3BsaWNlKSkpIHtcbiAgICAgICAgcmV0dXJuICFsZW5ndGg7XG4gICAgICB9XG4gICAgICBmb3JPd24odmFsdWUsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gKHJlc3VsdCA9IGZhbHNlKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBhIGRlZXAgY29tcGFyaXNvbiBiZXR3ZWVuIHR3byB2YWx1ZXMgdG8gZGV0ZXJtaW5lIGlmIHRoZXkgYXJlXG4gICAgICogZXF1aXZhbGVudCB0byBlYWNoIG90aGVyLiBJZiBhIGNhbGxiYWNrIGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgZXhlY3V0ZWRcbiAgICAgKiB0byBjb21wYXJlIHZhbHVlcy4gSWYgdGhlIGNhbGxiYWNrIHJldHVybnMgYHVuZGVmaW5lZGAgY29tcGFyaXNvbnMgd2lsbFxuICAgICAqIGJlIGhhbmRsZWQgYnkgdGhlIG1ldGhvZCBpbnN0ZWFkLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZFxuICAgICAqIGludm9rZWQgd2l0aCB0d28gYXJndW1lbnRzOyAoYSwgYikuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gYSBUaGUgdmFsdWUgdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0geyp9IGIgVGhlIG90aGVyIHZhbHVlIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGNvbXBhcmluZyB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSB2YWx1ZXMgYXJlIGVxdWl2YWxlbnQsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIG9iamVjdCA9IHsgJ25hbWUnOiAnZnJlZCcgfTtcbiAgICAgKiB2YXIgY29weSA9IHsgJ25hbWUnOiAnZnJlZCcgfTtcbiAgICAgKlxuICAgICAqIG9iamVjdCA9PSBjb3B5O1xuICAgICAqIC8vID0+IGZhbHNlXG4gICAgICpcbiAgICAgKiBfLmlzRXF1YWwob2JqZWN0LCBjb3B5KTtcbiAgICAgKiAvLyA9PiB0cnVlXG4gICAgICpcbiAgICAgKiB2YXIgd29yZHMgPSBbJ2hlbGxvJywgJ2dvb2RieWUnXTtcbiAgICAgKiB2YXIgb3RoZXJXb3JkcyA9IFsnaGknLCAnZ29vZGJ5ZSddO1xuICAgICAqXG4gICAgICogXy5pc0VxdWFsKHdvcmRzLCBvdGhlcldvcmRzLCBmdW5jdGlvbihhLCBiKSB7XG4gICAgICogICB2YXIgcmVHcmVldCA9IC9eKD86aGVsbG98aGkpJC9pLFxuICAgICAqICAgICAgIGFHcmVldCA9IF8uaXNTdHJpbmcoYSkgJiYgcmVHcmVldC50ZXN0KGEpLFxuICAgICAqICAgICAgIGJHcmVldCA9IF8uaXNTdHJpbmcoYikgJiYgcmVHcmVldC50ZXN0KGIpO1xuICAgICAqXG4gICAgICogICByZXR1cm4gKGFHcmVldCB8fCBiR3JlZXQpID8gKGFHcmVldCA9PSBiR3JlZXQpIDogdW5kZWZpbmVkO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc0VxdWFsKGEsIGIsIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICByZXR1cm4gYmFzZUlzRXF1YWwoYSwgYiwgdHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicgJiYgYmFzZUNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAyKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMsIG9yIGNhbiBiZSBjb2VyY2VkIHRvLCBhIGZpbml0ZSBudW1iZXIuXG4gICAgICpcbiAgICAgKiBOb3RlOiBUaGlzIGlzIG5vdCB0aGUgc2FtZSBhcyBuYXRpdmUgYGlzRmluaXRlYCB3aGljaCB3aWxsIHJldHVybiB0cnVlIGZvclxuICAgICAqIGJvb2xlYW5zIGFuZCBlbXB0eSBzdHJpbmdzLiBTZWUgaHR0cDovL2VzNS5naXRodWIuaW8vI3gxNS4xLjIuNS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGZpbml0ZSwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmlzRmluaXRlKC0xMDEpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uaXNGaW5pdGUoJzEwJyk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqXG4gICAgICogXy5pc0Zpbml0ZSh0cnVlKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqXG4gICAgICogXy5pc0Zpbml0ZSgnJyk7XG4gICAgICogLy8gPT4gZmFsc2VcbiAgICAgKlxuICAgICAqIF8uaXNGaW5pdGUoSW5maW5pdHkpO1xuICAgICAqIC8vID0+IGZhbHNlXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNGaW5pdGUodmFsdWUpIHtcbiAgICAgIHJldHVybiBuYXRpdmVJc0Zpbml0ZSh2YWx1ZSkgJiYgIW5hdGl2ZUlzTmFOKHBhcnNlRmxvYXQodmFsdWUpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIGZ1bmN0aW9uLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYSBmdW5jdGlvbiwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmlzRnVuY3Rpb24oXyk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ2Z1bmN0aW9uJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgbGFuZ3VhZ2UgdHlwZSBvZiBPYmplY3QuXG4gICAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pc09iamVjdCh7fSk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqXG4gICAgICogXy5pc09iamVjdChbMSwgMiwgM10pO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uaXNPYmplY3QoMSk7XG4gICAgICogLy8gPT4gZmFsc2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICAgICAgLy8gY2hlY2sgaWYgdGhlIHZhbHVlIGlzIHRoZSBFQ01BU2NyaXB0IGxhbmd1YWdlIHR5cGUgb2YgT2JqZWN0XG4gICAgICAvLyBodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDhcbiAgICAgIC8vIGFuZCBhdm9pZCBhIFY4IGJ1Z1xuICAgICAgLy8gaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MVxuICAgICAgcmV0dXJuICEhKHZhbHVlICYmIG9iamVjdFR5cGVzW3R5cGVvZiB2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGBOYU5gLlxuICAgICAqXG4gICAgICogTm90ZTogVGhpcyBpcyBub3QgdGhlIHNhbWUgYXMgbmF0aXZlIGBpc05hTmAgd2hpY2ggd2lsbCByZXR1cm4gYHRydWVgIGZvclxuICAgICAqIGB1bmRlZmluZWRgIGFuZCBvdGhlciBub24tbnVtZXJpYyB2YWx1ZXMuIFNlZSBodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDE1LjEuMi40LlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYE5hTmAsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pc05hTihOYU4pO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uaXNOYU4obmV3IE51bWJlcihOYU4pKTtcbiAgICAgKiAvLyA9PiB0cnVlXG4gICAgICpcbiAgICAgKiBpc05hTih1bmRlZmluZWQpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uaXNOYU4odW5kZWZpbmVkKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzTmFOKHZhbHVlKSB7XG4gICAgICAvLyBgTmFOYCBhcyBhIHByaW1pdGl2ZSBpcyB0aGUgb25seSB2YWx1ZSB0aGF0IGlzIG5vdCBlcXVhbCB0byBpdHNlbGZcbiAgICAgIC8vIChwZXJmb3JtIHRoZSBbW0NsYXNzXV0gY2hlY2sgZmlyc3QgdG8gYXZvaWQgZXJyb3JzIHdpdGggc29tZSBob3N0IG9iamVjdHMgaW4gSUUpXG4gICAgICByZXR1cm4gaXNOdW1iZXIodmFsdWUpICYmIHZhbHVlICE9ICt2YWx1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBgbnVsbGAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBgbnVsbGAsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pc051bGwobnVsbCk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqXG4gICAgICogXy5pc051bGwodW5kZWZpbmVkKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzTnVsbCh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgbnVtYmVyLlxuICAgICAqXG4gICAgICogTm90ZTogYE5hTmAgaXMgY29uc2lkZXJlZCBhIG51bWJlci4gU2VlIGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4OC41LlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYSBudW1iZXIsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pc051bWJlcig4LjQgKiA1KTtcbiAgICAgKiAvLyA9PiB0cnVlXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNOdW1iZXIodmFsdWUpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicgfHxcbiAgICAgICAgdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09IG51bWJlckNsYXNzIHx8IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCBjcmVhdGVkIGJ5IHRoZSBgT2JqZWN0YCBjb25zdHJ1Y3Rvci5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSBwbGFpbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogZnVuY3Rpb24gU2hhcGUoKSB7XG4gICAgICogICB0aGlzLnggPSAwO1xuICAgICAqICAgdGhpcy55ID0gMDtcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiBfLmlzUGxhaW5PYmplY3QobmV3IFNoYXBlKTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqXG4gICAgICogXy5pc1BsYWluT2JqZWN0KFsxLCAyLCAzXSk7XG4gICAgICogLy8gPT4gZmFsc2VcbiAgICAgKlxuICAgICAqIF8uaXNQbGFpbk9iamVjdCh7ICd4JzogMCwgJ3knOiAwIH0pO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKi9cbiAgICB2YXIgaXNQbGFpbk9iamVjdCA9ICFnZXRQcm90b3R5cGVPZiA/IHNoaW1Jc1BsYWluT2JqZWN0IDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghKHZhbHVlICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09IG9iamVjdENsYXNzKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIgdmFsdWVPZiA9IHZhbHVlLnZhbHVlT2YsXG4gICAgICAgICAgb2JqUHJvdG8gPSBpc05hdGl2ZSh2YWx1ZU9mKSAmJiAob2JqUHJvdG8gPSBnZXRQcm90b3R5cGVPZih2YWx1ZU9mKSkgJiYgZ2V0UHJvdG90eXBlT2Yob2JqUHJvdG8pO1xuXG4gICAgICByZXR1cm4gb2JqUHJvdG9cbiAgICAgICAgPyAodmFsdWUgPT0gb2JqUHJvdG8gfHwgZ2V0UHJvdG90eXBlT2YodmFsdWUpID09IG9ialByb3RvKVxuICAgICAgICA6IHNoaW1Jc1BsYWluT2JqZWN0KHZhbHVlKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBhIHJlZ3VsYXIgZXhwcmVzc2lvbiwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmlzUmVnRXhwKC9mcmVkLyk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzUmVnRXhwKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09IHJlZ2V4cENsYXNzIHx8IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgc3RyaW5nLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IE9iamVjdHNcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYSBzdHJpbmcsIGVsc2UgYGZhbHNlYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pc1N0cmluZygnZnJlZCcpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc1N0cmluZyh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJyB8fFxuICAgICAgICB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT0gc3RyaW5nQ2xhc3MgfHwgZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYHVuZGVmaW5lZGAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBgdW5kZWZpbmVkYCwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmlzVW5kZWZpbmVkKHZvaWQgMCk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICd1bmRlZmluZWQnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gb2JqZWN0IHdpdGggdGhlIHNhbWUga2V5cyBhcyBgb2JqZWN0YCBhbmQgdmFsdWVzIGdlbmVyYXRlZCBieVxuICAgICAqIHJ1bm5pbmcgZWFjaCBvd24gZW51bWVyYWJsZSBwcm9wZXJ0eSBvZiBgb2JqZWN0YCB0aHJvdWdoIHRoZSBjYWxsYmFjay5cbiAgICAgKiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWUgYXJndW1lbnRzO1xuICAgICAqICh2YWx1ZSwga2V5LCBvYmplY3QpLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWRcbiAgICAgKiAgcGVyIGl0ZXJhdGlvbi4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWRcbiAgICAgKiAgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBuZXcgb2JqZWN0IHdpdGggdmFsdWVzIG9mIHRoZSByZXN1bHRzIG9mIGVhY2ggYGNhbGxiYWNrYCBleGVjdXRpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8ubWFwVmFsdWVzKHsgJ2EnOiAxLCAnYic6IDIsICdjJzogM30gLCBmdW5jdGlvbihudW0pIHsgcmV0dXJuIG51bSAqIDM7IH0pO1xuICAgICAqIC8vID0+IHsgJ2EnOiAzLCAnYic6IDYsICdjJzogOSB9XG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IHtcbiAgICAgKiAgICdmcmVkJzogeyAnbmFtZSc6ICdmcmVkJywgJ2FnZSc6IDQwIH0sXG4gICAgICogICAncGViYmxlcyc6IHsgJ25hbWUnOiAncGViYmxlcycsICdhZ2UnOiAxIH1cbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5tYXBWYWx1ZXMoY2hhcmFjdGVycywgJ2FnZScpO1xuICAgICAqIC8vID0+IHsgJ2ZyZWQnOiA0MCwgJ3BlYmJsZXMnOiAxIH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtYXBWYWx1ZXMob2JqZWN0LCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuXG4gICAgICBmb3JPd24ob2JqZWN0LCBmdW5jdGlvbih2YWx1ZSwga2V5LCBvYmplY3QpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSBjYWxsYmFjayh2YWx1ZSwga2V5LCBvYmplY3QpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlY3Vyc2l2ZWx5IG1lcmdlcyBvd24gZW51bWVyYWJsZSBwcm9wZXJ0aWVzIG9mIHRoZSBzb3VyY2Ugb2JqZWN0KHMpLCB0aGF0XG4gICAgICogZG9uJ3QgcmVzb2x2ZSB0byBgdW5kZWZpbmVkYCBpbnRvIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuIFN1YnNlcXVlbnQgc291cmNlc1xuICAgICAqIHdpbGwgb3ZlcndyaXRlIHByb3BlcnR5IGFzc2lnbm1lbnRzIG9mIHByZXZpb3VzIHNvdXJjZXMuIElmIGEgY2FsbGJhY2sgaXNcbiAgICAgKiBwcm92aWRlZCBpdCB3aWxsIGJlIGV4ZWN1dGVkIHRvIHByb2R1Y2UgdGhlIG1lcmdlZCB2YWx1ZXMgb2YgdGhlIGRlc3RpbmF0aW9uXG4gICAgICogYW5kIHNvdXJjZSBwcm9wZXJ0aWVzLiBJZiB0aGUgY2FsbGJhY2sgcmV0dXJucyBgdW5kZWZpbmVkYCBtZXJnaW5nIHdpbGxcbiAgICAgKiBiZSBoYW5kbGVkIGJ5IHRoZSBtZXRob2QgaW5zdGVhZC4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmRcbiAgICAgKiBpbnZva2VkIHdpdGggdHdvIGFyZ3VtZW50czsgKG9iamVjdFZhbHVlLCBzb3VyY2VWYWx1ZSkuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gW3NvdXJjZV0gVGhlIHNvdXJjZSBvYmplY3RzLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gVGhlIGZ1bmN0aW9uIHRvIGN1c3RvbWl6ZSBtZXJnaW5nIHByb3BlcnRpZXMuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgZGVzdGluYXRpb24gb2JqZWN0LlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgbmFtZXMgPSB7XG4gICAgICogICAnY2hhcmFjdGVycyc6IFtcbiAgICAgKiAgICAgeyAnbmFtZSc6ICdiYXJuZXknIH0sXG4gICAgICogICAgIHsgJ25hbWUnOiAnZnJlZCcgfVxuICAgICAqICAgXVxuICAgICAqIH07XG4gICAgICpcbiAgICAgKiB2YXIgYWdlcyA9IHtcbiAgICAgKiAgICdjaGFyYWN0ZXJzJzogW1xuICAgICAqICAgICB7ICdhZ2UnOiAzNiB9LFxuICAgICAqICAgICB7ICdhZ2UnOiA0MCB9XG4gICAgICogICBdXG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIF8ubWVyZ2UobmFtZXMsIGFnZXMpO1xuICAgICAqIC8vID0+IHsgJ2NoYXJhY3RlcnMnOiBbeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYgfSwgeyAnbmFtZSc6ICdmcmVkJywgJ2FnZSc6IDQwIH1dIH1cbiAgICAgKlxuICAgICAqIHZhciBmb29kID0ge1xuICAgICAqICAgJ2ZydWl0cyc6IFsnYXBwbGUnXSxcbiAgICAgKiAgICd2ZWdldGFibGVzJzogWydiZWV0J11cbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogdmFyIG90aGVyRm9vZCA9IHtcbiAgICAgKiAgICdmcnVpdHMnOiBbJ2JhbmFuYSddLFxuICAgICAqICAgJ3ZlZ2V0YWJsZXMnOiBbJ2NhcnJvdCddXG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIF8ubWVyZ2UoZm9vZCwgb3RoZXJGb29kLCBmdW5jdGlvbihhLCBiKSB7XG4gICAgICogICByZXR1cm4gXy5pc0FycmF5KGEpID8gYS5jb25jYXQoYikgOiB1bmRlZmluZWQ7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4geyAnZnJ1aXRzJzogWydhcHBsZScsICdiYW5hbmEnXSwgJ3ZlZ2V0YWJsZXMnOiBbJ2JlZXQnLCAnY2Fycm90XSB9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWVyZ2Uob2JqZWN0KSB7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cyxcbiAgICAgICAgICBsZW5ndGggPSAyO1xuXG4gICAgICBpZiAoIWlzT2JqZWN0KG9iamVjdCkpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgIH1cbiAgICAgIC8vIGFsbG93cyB3b3JraW5nIHdpdGggYF8ucmVkdWNlYCBhbmQgYF8ucmVkdWNlUmlnaHRgIHdpdGhvdXQgdXNpbmdcbiAgICAgIC8vIHRoZWlyIGBpbmRleGAgYW5kIGBjb2xsZWN0aW9uYCBhcmd1bWVudHNcbiAgICAgIGlmICh0eXBlb2YgYXJnc1syXSAhPSAnbnVtYmVyJykge1xuICAgICAgICBsZW5ndGggPSBhcmdzLmxlbmd0aDtcbiAgICAgIH1cbiAgICAgIGlmIChsZW5ndGggPiAzICYmIHR5cGVvZiBhcmdzW2xlbmd0aCAtIDJdID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gYmFzZUNyZWF0ZUNhbGxiYWNrKGFyZ3NbLS1sZW5ndGggLSAxXSwgYXJnc1tsZW5ndGgtLV0sIDIpO1xuICAgICAgfSBlbHNlIGlmIChsZW5ndGggPiAyICYmIHR5cGVvZiBhcmdzW2xlbmd0aCAtIDFdID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBhcmdzWy0tbGVuZ3RoXTtcbiAgICAgIH1cbiAgICAgIHZhciBzb3VyY2VzID0gc2xpY2UoYXJndW1lbnRzLCAxLCBsZW5ndGgpLFxuICAgICAgICAgIGluZGV4ID0gLTEsXG4gICAgICAgICAgc3RhY2tBID0gZ2V0QXJyYXkoKSxcbiAgICAgICAgICBzdGFja0IgPSBnZXRBcnJheSgpO1xuXG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICBiYXNlTWVyZ2Uob2JqZWN0LCBzb3VyY2VzW2luZGV4XSwgY2FsbGJhY2ssIHN0YWNrQSwgc3RhY2tCKTtcbiAgICAgIH1cbiAgICAgIHJlbGVhc2VBcnJheShzdGFja0EpO1xuICAgICAgcmVsZWFzZUFycmF5KHN0YWNrQik7XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBzaGFsbG93IGNsb25lIG9mIGBvYmplY3RgIGV4Y2x1ZGluZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICogUHJvcGVydHkgbmFtZXMgbWF5IGJlIHNwZWNpZmllZCBhcyBpbmRpdmlkdWFsIGFyZ3VtZW50cyBvciBhcyBhcnJheXMgb2ZcbiAgICAgKiBwcm9wZXJ0eSBuYW1lcy4gSWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIGV4ZWN1dGVkIGZvciBlYWNoXG4gICAgICogcHJvcGVydHkgb2YgYG9iamVjdGAgb21pdHRpbmcgdGhlIHByb3BlcnRpZXMgdGhlIGNhbGxiYWNrIHJldHVybnMgdHJ1ZXlcbiAgICAgKiBmb3IuIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM7XG4gICAgICogKHZhbHVlLCBrZXksIG9iamVjdCkuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIHNvdXJjZSBvYmplY3QuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnwuLi5zdHJpbmd8c3RyaW5nW119IFtjYWxsYmFja10gVGhlIHByb3BlcnRpZXMgdG8gb21pdCBvciB0aGVcbiAgICAgKiAgZnVuY3Rpb24gY2FsbGVkIHBlciBpdGVyYXRpb24uXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBhbiBvYmplY3Qgd2l0aG91dCB0aGUgb21pdHRlZCBwcm9wZXJ0aWVzLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLm9taXQoeyAnbmFtZSc6ICdmcmVkJywgJ2FnZSc6IDQwIH0sICdhZ2UnKTtcbiAgICAgKiAvLyA9PiB7ICduYW1lJzogJ2ZyZWQnIH1cbiAgICAgKlxuICAgICAqIF8ub21pdCh7ICduYW1lJzogJ2ZyZWQnLCAnYWdlJzogNDAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgKiAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ251bWJlcic7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4geyAnbmFtZSc6ICdmcmVkJyB9XG4gICAgICovXG4gICAgZnVuY3Rpb24gb21pdChvYmplY3QsIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIHByb3BzID0gW107XG4gICAgICAgIGZvckluKG9iamVjdCwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgIHByb3BzLnB1c2goa2V5KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb3BzID0gYmFzZURpZmZlcmVuY2UocHJvcHMsIGJhc2VGbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSwgZmFsc2UsIDEpKTtcblxuICAgICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aDtcblxuICAgICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgIHZhciBrZXkgPSBwcm9wc1tpbmRleF07XG4gICAgICAgICAgcmVzdWx0W2tleV0gPSBvYmplY3Rba2V5XTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgICBmb3JJbihvYmplY3QsIGZ1bmN0aW9uKHZhbHVlLCBrZXksIG9iamVjdCkge1xuICAgICAgICAgIGlmICghY2FsbGJhY2sodmFsdWUsIGtleSwgb2JqZWN0KSkge1xuICAgICAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgdHdvIGRpbWVuc2lvbmFsIGFycmF5IG9mIGFuIG9iamVjdCdzIGtleS12YWx1ZSBwYWlycyxcbiAgICAgKiBpLmUuIGBbW2tleTEsIHZhbHVlMV0sIFtrZXkyLCB2YWx1ZTJdXWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpbnNwZWN0LlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBuZXcgYXJyYXkgb2Yga2V5LXZhbHVlIHBhaXJzLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnBhaXJzKHsgJ2Jhcm5leSc6IDM2LCAnZnJlZCc6IDQwIH0pO1xuICAgICAqIC8vID0+IFtbJ2Jhcm5leScsIDM2XSwgWydmcmVkJywgNDBdXSAocHJvcGVydHkgb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQgYWNyb3NzIGVudmlyb25tZW50cylcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBwYWlycyhvYmplY3QpIHtcbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIHByb3BzID0ga2V5cyhvYmplY3QpLFxuICAgICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aCxcbiAgICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICB2YXIga2V5ID0gcHJvcHNbaW5kZXhdO1xuICAgICAgICByZXN1bHRbaW5kZXhdID0gW2tleSwgb2JqZWN0W2tleV1dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgc2hhbGxvdyBjbG9uZSBvZiBgb2JqZWN0YCBjb21wb3NlZCBvZiB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICogUHJvcGVydHkgbmFtZXMgbWF5IGJlIHNwZWNpZmllZCBhcyBpbmRpdmlkdWFsIGFyZ3VtZW50cyBvciBhcyBhcnJheXMgb2ZcbiAgICAgKiBwcm9wZXJ0eSBuYW1lcy4gSWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIGV4ZWN1dGVkIGZvciBlYWNoXG4gICAgICogcHJvcGVydHkgb2YgYG9iamVjdGAgcGlja2luZyB0aGUgcHJvcGVydGllcyB0aGUgY2FsbGJhY2sgcmV0dXJucyB0cnVleVxuICAgICAqIGZvci4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50cztcbiAgICAgKiAodmFsdWUsIGtleSwgb2JqZWN0KS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgc291cmNlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufC4uLnN0cmluZ3xzdHJpbmdbXX0gW2NhbGxiYWNrXSBUaGUgZnVuY3Rpb24gY2FsbGVkIHBlclxuICAgICAqICBpdGVyYXRpb24gb3IgcHJvcGVydHkgbmFtZXMgdG8gcGljaywgc3BlY2lmaWVkIGFzIGluZGl2aWR1YWwgcHJvcGVydHlcbiAgICAgKiAgbmFtZXMgb3IgYXJyYXlzIG9mIHByb3BlcnR5IG5hbWVzLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYW4gb2JqZWN0IGNvbXBvc2VkIG9mIHRoZSBwaWNrZWQgcHJvcGVydGllcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5waWNrKHsgJ25hbWUnOiAnZnJlZCcsICdfdXNlcmlkJzogJ2ZyZWQxJyB9LCAnbmFtZScpO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnZnJlZCcgfVxuICAgICAqXG4gICAgICogXy5waWNrKHsgJ25hbWUnOiAnZnJlZCcsICdfdXNlcmlkJzogJ2ZyZWQxJyB9LCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICogICByZXR1cm4ga2V5LmNoYXJBdCgwKSAhPSAnXyc7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4geyAnbmFtZSc6ICdmcmVkJyB9XG4gICAgICovXG4gICAgZnVuY3Rpb24gcGljayhvYmplY3QsIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgICBwcm9wcyA9IGJhc2VGbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSwgZmFsc2UsIDEpLFxuICAgICAgICAgICAgbGVuZ3RoID0gaXNPYmplY3Qob2JqZWN0KSA/IHByb3BzLmxlbmd0aCA6IDA7XG5cbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICB2YXIga2V5ID0gcHJvcHNbaW5kZXhdO1xuICAgICAgICAgIGlmIChrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICByZXN1bHRba2V5XSA9IG9iamVjdFtrZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgICBmb3JJbihvYmplY3QsIGZ1bmN0aW9uKHZhbHVlLCBrZXksIG9iamVjdCkge1xuICAgICAgICAgIGlmIChjYWxsYmFjayh2YWx1ZSwga2V5LCBvYmplY3QpKSB7XG4gICAgICAgICAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFuIGFsdGVybmF0aXZlIHRvIGBfLnJlZHVjZWAgdGhpcyBtZXRob2QgdHJhbnNmb3JtcyBgb2JqZWN0YCB0byBhIG5ld1xuICAgICAqIGBhY2N1bXVsYXRvcmAgb2JqZWN0IHdoaWNoIGlzIHRoZSByZXN1bHQgb2YgcnVubmluZyBlYWNoIG9mIGl0cyBvd25cbiAgICAgKiBlbnVtZXJhYmxlIHByb3BlcnRpZXMgdGhyb3VnaCBhIGNhbGxiYWNrLCB3aXRoIGVhY2ggY2FsbGJhY2sgZXhlY3V0aW9uXG4gICAgICogcG90ZW50aWFsbHkgbXV0YXRpbmcgdGhlIGBhY2N1bXVsYXRvcmAgb2JqZWN0LiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG9cbiAgICAgKiBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCBmb3VyIGFyZ3VtZW50czsgKGFjY3VtdWxhdG9yLCB2YWx1ZSwga2V5LCBvYmplY3QpLlxuICAgICAqIENhbGxiYWNrcyBtYXkgZXhpdCBpdGVyYXRpb24gZWFybHkgYnkgZXhwbGljaXRseSByZXR1cm5pbmcgYGZhbHNlYC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICAgKiBAcGFyYW0geyp9IFthY2N1bXVsYXRvcl0gVGhlIGN1c3RvbSBhY2N1bXVsYXRvciB2YWx1ZS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgYWNjdW11bGF0ZWQgdmFsdWUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBzcXVhcmVzID0gXy50cmFuc2Zvcm0oWzEsIDIsIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwXSwgZnVuY3Rpb24ocmVzdWx0LCBudW0pIHtcbiAgICAgKiAgIG51bSAqPSBudW07XG4gICAgICogICBpZiAobnVtICUgMikge1xuICAgICAqICAgICByZXR1cm4gcmVzdWx0LnB1c2gobnVtKSA8IDM7XG4gICAgICogICB9XG4gICAgICogfSk7XG4gICAgICogLy8gPT4gWzEsIDksIDI1XVxuICAgICAqXG4gICAgICogdmFyIG1hcHBlZCA9IF8udHJhbnNmb3JtKHsgJ2EnOiAxLCAnYic6IDIsICdjJzogMyB9LCBmdW5jdGlvbihyZXN1bHQsIG51bSwga2V5KSB7XG4gICAgICogICByZXN1bHRba2V5XSA9IG51bSAqIDM7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4geyAnYSc6IDMsICdiJzogNiwgJ2MnOiA5IH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0cmFuc2Zvcm0ob2JqZWN0LCBjYWxsYmFjaywgYWNjdW11bGF0b3IsIHRoaXNBcmcpIHtcbiAgICAgIHZhciBpc0FyciA9IGlzQXJyYXkob2JqZWN0KTtcbiAgICAgIGlmIChhY2N1bXVsYXRvciA9PSBudWxsKSB7XG4gICAgICAgIGlmIChpc0Fycikge1xuICAgICAgICAgIGFjY3VtdWxhdG9yID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGN0b3IgPSBvYmplY3QgJiYgb2JqZWN0LmNvbnN0cnVjdG9yLFxuICAgICAgICAgICAgICBwcm90byA9IGN0b3IgJiYgY3Rvci5wcm90b3R5cGU7XG5cbiAgICAgICAgICBhY2N1bXVsYXRvciA9IGJhc2VDcmVhdGUocHJvdG8pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDQpO1xuICAgICAgICAoaXNBcnIgPyBmb3JFYWNoIDogZm9yT3duKShvYmplY3QsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgb2JqZWN0KSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIG9iamVjdCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFjY3VtdWxhdG9yO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgY29tcG9zZWQgb2YgdGhlIG93biBlbnVtZXJhYmxlIHByb3BlcnR5IHZhbHVlcyBvZiBgb2JqZWN0YC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBPYmplY3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGluc3BlY3QuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGFuIGFycmF5IG9mIHByb3BlcnR5IHZhbHVlcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy52YWx1ZXMoeyAnb25lJzogMSwgJ3R3byc6IDIsICd0aHJlZSc6IDMgfSk7XG4gICAgICogLy8gPT4gWzEsIDIsIDNdIChwcm9wZXJ0eSBvcmRlciBpcyBub3QgZ3VhcmFudGVlZCBhY3Jvc3MgZW52aXJvbm1lbnRzKVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHZhbHVlcyhvYmplY3QpIHtcbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIHByb3BzID0ga2V5cyhvYmplY3QpLFxuICAgICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aCxcbiAgICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICByZXN1bHRbaW5kZXhdID0gb2JqZWN0W3Byb3BzW2luZGV4XV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhcnJheSBvZiBlbGVtZW50cyBmcm9tIHRoZSBzcGVjaWZpZWQgaW5kZXhlcywgb3Iga2V5cywgb2YgdGhlXG4gICAgICogYGNvbGxlY3Rpb25gLiBJbmRleGVzIG1heSBiZSBzcGVjaWZpZWQgYXMgaW5kaXZpZHVhbCBhcmd1bWVudHMgb3IgYXMgYXJyYXlzXG4gICAgICogb2YgaW5kZXhlcy5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHsuLi4obnVtYmVyfG51bWJlcltdfHN0cmluZ3xzdHJpbmdbXSl9IFtpbmRleF0gVGhlIGluZGV4ZXMgb2YgYGNvbGxlY3Rpb25gXG4gICAgICogICB0byByZXRyaWV2ZSwgc3BlY2lmaWVkIGFzIGluZGl2aWR1YWwgaW5kZXhlcyBvciBhcnJheXMgb2YgaW5kZXhlcy5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBuZXcgYXJyYXkgb2YgZWxlbWVudHMgY29ycmVzcG9uZGluZyB0byB0aGVcbiAgICAgKiAgcHJvdmlkZWQgaW5kZXhlcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5hdChbJ2EnLCAnYicsICdjJywgJ2QnLCAnZSddLCBbMCwgMiwgNF0pO1xuICAgICAqIC8vID0+IFsnYScsICdjJywgJ2UnXVxuICAgICAqXG4gICAgICogXy5hdChbJ2ZyZWQnLCAnYmFybmV5JywgJ3BlYmJsZXMnXSwgMCwgMik7XG4gICAgICogLy8gPT4gWydmcmVkJywgJ3BlYmJsZXMnXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGF0KGNvbGxlY3Rpb24pIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzLFxuICAgICAgICAgIGluZGV4ID0gLTEsXG4gICAgICAgICAgcHJvcHMgPSBiYXNlRmxhdHRlbihhcmdzLCB0cnVlLCBmYWxzZSwgMSksXG4gICAgICAgICAgbGVuZ3RoID0gKGFyZ3NbMl0gJiYgYXJnc1syXVthcmdzWzFdXSA9PT0gY29sbGVjdGlvbikgPyAxIDogcHJvcHMubGVuZ3RoLFxuICAgICAgICAgIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICAgIHdoaWxlKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgcmVzdWx0W2luZGV4XSA9IGNvbGxlY3Rpb25bcHJvcHNbaW5kZXhdXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGEgZ2l2ZW4gdmFsdWUgaXMgcHJlc2VudCBpbiBhIGNvbGxlY3Rpb24gdXNpbmcgc3RyaWN0IGVxdWFsaXR5XG4gICAgICogZm9yIGNvbXBhcmlzb25zLCBpLmUuIGA9PT1gLiBJZiBgZnJvbUluZGV4YCBpcyBuZWdhdGl2ZSwgaXQgaXMgdXNlZCBhcyB0aGVcbiAgICAgKiBvZmZzZXQgZnJvbSB0aGUgZW5kIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIGluY2x1ZGVcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7Kn0gdGFyZ2V0IFRoZSB2YWx1ZSB0byBjaGVjayBmb3IuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtmcm9tSW5kZXg9MF0gVGhlIGluZGV4IHRvIHNlYXJjaCBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHRhcmdldGAgZWxlbWVudCBpcyBmb3VuZCwgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmNvbnRhaW5zKFsxLCAyLCAzXSwgMSk7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqXG4gICAgICogXy5jb250YWlucyhbMSwgMiwgM10sIDEsIDIpO1xuICAgICAqIC8vID0+IGZhbHNlXG4gICAgICpcbiAgICAgKiBfLmNvbnRhaW5zKHsgJ25hbWUnOiAnZnJlZCcsICdhZ2UnOiA0MCB9LCAnZnJlZCcpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIF8uY29udGFpbnMoJ3BlYmJsZXMnLCAnZWInKTtcbiAgICAgKiAvLyA9PiB0cnVlXG4gICAgICovXG4gICAgZnVuY3Rpb24gY29udGFpbnMoY29sbGVjdGlvbiwgdGFyZ2V0LCBmcm9tSW5kZXgpIHtcbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIGluZGV4T2YgPSBnZXRJbmRleE9mKCksXG4gICAgICAgICAgbGVuZ3RoID0gY29sbGVjdGlvbiA/IGNvbGxlY3Rpb24ubGVuZ3RoIDogMCxcbiAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcblxuICAgICAgZnJvbUluZGV4ID0gKGZyb21JbmRleCA8IDAgPyBuYXRpdmVNYXgoMCwgbGVuZ3RoICsgZnJvbUluZGV4KSA6IGZyb21JbmRleCkgfHwgMDtcbiAgICAgIGlmIChpc0FycmF5KGNvbGxlY3Rpb24pKSB7XG4gICAgICAgIHJlc3VsdCA9IGluZGV4T2YoY29sbGVjdGlvbiwgdGFyZ2V0LCBmcm9tSW5kZXgpID4gLTE7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicpIHtcbiAgICAgICAgcmVzdWx0ID0gKGlzU3RyaW5nKGNvbGxlY3Rpb24pID8gY29sbGVjdGlvbi5pbmRleE9mKHRhcmdldCwgZnJvbUluZGV4KSA6IGluZGV4T2YoY29sbGVjdGlvbiwgdGFyZ2V0LCBmcm9tSW5kZXgpKSA+IC0xO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yT3duKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKCsraW5kZXggPj0gZnJvbUluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gIShyZXN1bHQgPSB2YWx1ZSA9PT0gdGFyZ2V0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIG9iamVjdCBjb21wb3NlZCBvZiBrZXlzIGdlbmVyYXRlZCBmcm9tIHRoZSByZXN1bHRzIG9mIHJ1bm5pbmdcbiAgICAgKiBlYWNoIGVsZW1lbnQgb2YgYGNvbGxlY3Rpb25gIHRocm91Z2ggdGhlIGNhbGxiYWNrLiBUaGUgY29ycmVzcG9uZGluZyB2YWx1ZVxuICAgICAqIG9mIGVhY2gga2V5IGlzIHRoZSBudW1iZXIgb2YgdGltZXMgdGhlIGtleSB3YXMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrLlxuICAgICAqIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM7XG4gICAgICogKHZhbHVlLCBpbmRleHxrZXksIGNvbGxlY3Rpb24pLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fHN0cmluZ30gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBpdGVyYXRpb24uIElmIGEgcHJvcGVydHkgbmFtZSBvciBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkXG4gICAgICogIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgY29tcG9zZWQgYWdncmVnYXRlIG9iamVjdC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5jb3VudEJ5KFs0LjMsIDYuMSwgNi40XSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiBNYXRoLmZsb29yKG51bSk7IH0pO1xuICAgICAqIC8vID0+IHsgJzQnOiAxLCAnNic6IDIgfVxuICAgICAqXG4gICAgICogXy5jb3VudEJ5KFs0LjMsIDYuMSwgNi40XSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiB0aGlzLmZsb29yKG51bSk7IH0sIE1hdGgpO1xuICAgICAqIC8vID0+IHsgJzQnOiAxLCAnNic6IDIgfVxuICAgICAqXG4gICAgICogXy5jb3VudEJ5KFsnb25lJywgJ3R3bycsICd0aHJlZSddLCAnbGVuZ3RoJyk7XG4gICAgICogLy8gPT4geyAnMyc6IDIsICc1JzogMSB9XG4gICAgICovXG4gICAgdmFyIGNvdW50QnkgPSBjcmVhdGVBZ2dyZWdhdG9yKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgICAgKGhhc093blByb3BlcnR5LmNhbGwocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0rKyA6IHJlc3VsdFtrZXldID0gMSk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIGdpdmVuIGNhbGxiYWNrIHJldHVybnMgdHJ1ZXkgdmFsdWUgZm9yICoqYWxsKiogZWxlbWVudHMgb2ZcbiAgICAgKiBhIGNvbGxlY3Rpb24uIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCB0aHJlZVxuICAgICAqIGFyZ3VtZW50czsgKHZhbHVlLCBpbmRleHxrZXksIGNvbGxlY3Rpb24pLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAYWxpYXMgYWxsXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBhbGwgZWxlbWVudHMgcGFzc2VkIHRoZSBjYWxsYmFjayBjaGVjayxcbiAgICAgKiAgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmV2ZXJ5KFt0cnVlLCAxLCBudWxsLCAneWVzJ10pO1xuICAgICAqIC8vID0+IGZhbHNlXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IFtcbiAgICAgKiAgIHsgJ25hbWUnOiAnYmFybmV5JywgJ2FnZSc6IDM2IH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICdhZ2UnOiA0MCB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZXZlcnkoY2hhcmFjdGVycywgJ2FnZScpO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy53aGVyZVwiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZXZlcnkoY2hhcmFjdGVycywgeyAnYWdlJzogMzYgfSk7XG4gICAgICogLy8gPT4gZmFsc2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBldmVyeShjb2xsZWN0aW9uLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIHJlc3VsdCA9IHRydWU7XG4gICAgICBjYWxsYmFjayA9IGxvZGFzaC5jcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG5cbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIGxlbmd0aCA9IGNvbGxlY3Rpb24gPyBjb2xsZWN0aW9uLmxlbmd0aCA6IDA7XG5cbiAgICAgIGlmICh0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInKSB7XG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gISFjYWxsYmFjayhjb2xsZWN0aW9uW2luZGV4XSwgaW5kZXgsIGNvbGxlY3Rpb24pKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3JPd24oY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIChyZXN1bHQgPSAhIWNhbGxiYWNrKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZXMgb3ZlciBlbGVtZW50cyBvZiBhIGNvbGxlY3Rpb24sIHJldHVybmluZyBhbiBhcnJheSBvZiBhbGwgZWxlbWVudHNcbiAgICAgKiB0aGUgY2FsbGJhY2sgcmV0dXJucyB0cnVleSBmb3IuIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kXG4gICAgICogaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50czsgKHZhbHVlLCBpbmRleHxrZXksIGNvbGxlY3Rpb24pLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAYWxpYXMgc2VsZWN0XG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyBhcnJheSBvZiBlbGVtZW50cyB0aGF0IHBhc3NlZCB0aGUgY2FsbGJhY2sgY2hlY2suXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBldmVucyA9IF8uZmlsdGVyKFsxLCAyLCAzLCA0LCA1LCA2XSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiBudW0gJSAyID09IDA7IH0pO1xuICAgICAqIC8vID0+IFsyLCA0LCA2XVxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiwgJ2Jsb2NrZWQnOiBmYWxzZSB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAnYWdlJzogNDAsICdibG9ja2VkJzogdHJ1ZSB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmlsdGVyKGNoYXJhY3RlcnMsICdibG9ja2VkJyk7XG4gICAgICogLy8gPT4gW3sgJ25hbWUnOiAnZnJlZCcsICdhZ2UnOiA0MCwgJ2Jsb2NrZWQnOiB0cnVlIH1dXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ud2hlcmVcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLmZpbHRlcihjaGFyYWN0ZXJzLCB7ICdhZ2UnOiAzNiB9KTtcbiAgICAgKiAvLyA9PiBbeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYsICdibG9ja2VkJzogZmFsc2UgfV1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaWx0ZXIoY29sbGVjdGlvbiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIGNhbGxiYWNrID0gbG9kYXNoLmNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcblxuICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgbGVuZ3RoID0gY29sbGVjdGlvbiA/IGNvbGxlY3Rpb24ubGVuZ3RoIDogMDtcblxuICAgICAgaWYgKHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicpIHtcbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBjb2xsZWN0aW9uW2luZGV4XTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sodmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yT3duKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgICAgIGlmIChjYWxsYmFjayh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZXMgb3ZlciBlbGVtZW50cyBvZiBhIGNvbGxlY3Rpb24sIHJldHVybmluZyB0aGUgZmlyc3QgZWxlbWVudCB0aGF0XG4gICAgICogdGhlIGNhbGxiYWNrIHJldHVybnMgdHJ1ZXkgZm9yLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZFxuICAgICAqIGludm9rZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIGRldGVjdCwgZmluZFdoZXJlXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBmb3VuZCBlbGVtZW50LCBlbHNlIGB1bmRlZmluZWRgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IFtcbiAgICAgKiAgIHsgJ25hbWUnOiAnYmFybmV5JywgICdhZ2UnOiAzNiwgJ2Jsb2NrZWQnOiBmYWxzZSB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAgJ2FnZSc6IDQwLCAnYmxvY2tlZCc6IHRydWUgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAncGViYmxlcycsICdhZ2UnOiAxLCAgJ2Jsb2NrZWQnOiBmYWxzZSB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIF8uZmluZChjaGFyYWN0ZXJzLCBmdW5jdGlvbihjaHIpIHtcbiAgICAgKiAgIHJldHVybiBjaHIuYWdlIDwgNDA7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4geyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYsICdibG9ja2VkJzogZmFsc2UgfVxuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLndoZXJlXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5maW5kKGNoYXJhY3RlcnMsIHsgJ2FnZSc6IDEgfSk7XG4gICAgICogLy8gPT4gIHsgJ25hbWUnOiAncGViYmxlcycsICdhZ2UnOiAxLCAnYmxvY2tlZCc6IGZhbHNlIH1cbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmluZChjaGFyYWN0ZXJzLCAnYmxvY2tlZCcpO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnZnJlZCcsICdhZ2UnOiA0MCwgJ2Jsb2NrZWQnOiB0cnVlIH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaW5kKGNvbGxlY3Rpb24sIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICBjYWxsYmFjayA9IGxvZGFzaC5jcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG5cbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIGxlbmd0aCA9IGNvbGxlY3Rpb24gPyBjb2xsZWN0aW9uLmxlbmd0aCA6IDA7XG5cbiAgICAgIGlmICh0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInKSB7XG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIHZhbHVlID0gY29sbGVjdGlvbltpbmRleF07XG4gICAgICAgICAgaWYgKGNhbGxiYWNrKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgIGZvck93bihjb2xsZWN0aW9uLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sodmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSkge1xuICAgICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBsaWtlIGBfLmZpbmRgIGV4Y2VwdCB0aGF0IGl0IGl0ZXJhdGVzIG92ZXIgZWxlbWVudHNcbiAgICAgKiBvZiBhIGBjb2xsZWN0aW9uYCBmcm9tIHJpZ2h0IHRvIGxlZnQuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fHN0cmluZ30gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBpdGVyYXRpb24uIElmIGEgcHJvcGVydHkgbmFtZSBvciBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkXG4gICAgICogIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGZvdW5kIGVsZW1lbnQsIGVsc2UgYHVuZGVmaW5lZGAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uZmluZExhc3QoWzEsIDIsIDMsIDRdLCBmdW5jdGlvbihudW0pIHtcbiAgICAgKiAgIHJldHVybiBudW0gJSAyID09IDE7XG4gICAgICogfSk7XG4gICAgICogLy8gPT4gM1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmRMYXN0KGNvbGxlY3Rpb24sIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgcmVzdWx0O1xuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgZm9yRWFjaFJpZ2h0KGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgICBpZiAoY2FsbGJhY2sodmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSkge1xuICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGVzIG92ZXIgZWxlbWVudHMgb2YgYSBjb2xsZWN0aW9uLCBleGVjdXRpbmcgdGhlIGNhbGxiYWNrIGZvciBlYWNoXG4gICAgICogZWxlbWVudC4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50cztcbiAgICAgKiAodmFsdWUsIGluZGV4fGtleSwgY29sbGVjdGlvbikuIENhbGxiYWNrcyBtYXkgZXhpdCBpdGVyYXRpb24gZWFybHkgYnlcbiAgICAgKiBleHBsaWNpdGx5IHJldHVybmluZyBgZmFsc2VgLlxuICAgICAqXG4gICAgICogTm90ZTogQXMgd2l0aCBvdGhlciBcIkNvbGxlY3Rpb25zXCIgbWV0aG9kcywgb2JqZWN0cyB3aXRoIGEgYGxlbmd0aGAgcHJvcGVydHlcbiAgICAgKiBhcmUgaXRlcmF0ZWQgbGlrZSBhcnJheXMuIFRvIGF2b2lkIHRoaXMgYmVoYXZpb3IgYF8uZm9ySW5gIG9yIGBfLmZvck93bmBcbiAgICAgKiBtYXkgYmUgdXNlZCBmb3Igb2JqZWN0IGl0ZXJhdGlvbi5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBhbGlhcyBlYWNoXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl8T2JqZWN0fHN0cmluZ30gUmV0dXJucyBgY29sbGVjdGlvbmAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8oWzEsIDIsIDNdKS5mb3JFYWNoKGZ1bmN0aW9uKG51bSkgeyBjb25zb2xlLmxvZyhudW0pOyB9KS5qb2luKCcsJyk7XG4gICAgICogLy8gPT4gbG9ncyBlYWNoIG51bWJlciBhbmQgcmV0dXJucyAnMSwyLDMnXG4gICAgICpcbiAgICAgKiBfLmZvckVhY2goeyAnb25lJzogMSwgJ3R3byc6IDIsICd0aHJlZSc6IDMgfSwgZnVuY3Rpb24obnVtKSB7IGNvbnNvbGUubG9nKG51bSk7IH0pO1xuICAgICAqIC8vID0+IGxvZ3MgZWFjaCBudW1iZXIgYW5kIHJldHVybnMgdGhlIG9iamVjdCAocHJvcGVydHkgb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQgYWNyb3NzIGVudmlyb25tZW50cylcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmb3JFYWNoKGNvbGxlY3Rpb24sIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBjb2xsZWN0aW9uID8gY29sbGVjdGlvbi5sZW5ndGggOiAwO1xuXG4gICAgICBjYWxsYmFjayA9IGNhbGxiYWNrICYmIHR5cGVvZiB0aGlzQXJnID09ICd1bmRlZmluZWQnID8gY2FsbGJhY2sgOiBiYXNlQ3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgaWYgKHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicpIHtcbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICBpZiAoY2FsbGJhY2soY29sbGVjdGlvbltpbmRleF0sIGluZGV4LCBjb2xsZWN0aW9uKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yT3duKGNvbGxlY3Rpb24sIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb2xsZWN0aW9uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGxpa2UgYF8uZm9yRWFjaGAgZXhjZXB0IHRoYXQgaXQgaXRlcmF0ZXMgb3ZlciBlbGVtZW50c1xuICAgICAqIG9mIGEgYGNvbGxlY3Rpb25gIGZyb20gcmlnaHQgdG8gbGVmdC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBhbGlhcyBlYWNoUmlnaHRcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZCBwZXIgaXRlcmF0aW9uLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtBcnJheXxPYmplY3R8c3RyaW5nfSBSZXR1cm5zIGBjb2xsZWN0aW9uYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXyhbMSwgMiwgM10pLmZvckVhY2hSaWdodChmdW5jdGlvbihudW0pIHsgY29uc29sZS5sb2cobnVtKTsgfSkuam9pbignLCcpO1xuICAgICAqIC8vID0+IGxvZ3MgZWFjaCBudW1iZXIgZnJvbSByaWdodCB0byBsZWZ0IGFuZCByZXR1cm5zICczLDIsMSdcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmb3JFYWNoUmlnaHQoY29sbGVjdGlvbiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBsZW5ndGggPSBjb2xsZWN0aW9uID8gY29sbGVjdGlvbi5sZW5ndGggOiAwO1xuICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayAmJiB0eXBlb2YgdGhpc0FyZyA9PSAndW5kZWZpbmVkJyA/IGNhbGxiYWNrIDogYmFzZUNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgIGlmICh0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInKSB7XG4gICAgICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgICAgIGlmIChjYWxsYmFjayhjb2xsZWN0aW9uW2xlbmd0aF0sIGxlbmd0aCwgY29sbGVjdGlvbikgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwcm9wcyA9IGtleXMoY29sbGVjdGlvbik7XG4gICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aDtcbiAgICAgICAgZm9yT3duKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBrZXksIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgICBrZXkgPSBwcm9wcyA/IHByb3BzWy0tbGVuZ3RoXSA6IC0tbGVuZ3RoO1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhjb2xsZWN0aW9uW2tleV0sIGtleSwgY29sbGVjdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBvYmplY3QgY29tcG9zZWQgb2Yga2V5cyBnZW5lcmF0ZWQgZnJvbSB0aGUgcmVzdWx0cyBvZiBydW5uaW5nXG4gICAgICogZWFjaCBlbGVtZW50IG9mIGEgY29sbGVjdGlvbiB0aHJvdWdoIHRoZSBjYWxsYmFjay4gVGhlIGNvcnJlc3BvbmRpbmcgdmFsdWVcbiAgICAgKiBvZiBlYWNoIGtleSBpcyBhbiBhcnJheSBvZiB0aGUgZWxlbWVudHMgcmVzcG9uc2libGUgZm9yIGdlbmVyYXRpbmcgdGhlIGtleS5cbiAgICAgKiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWUgYXJndW1lbnRzO1xuICAgICAqICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fHN0cmluZ30gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBpdGVyYXRpb24uIElmIGEgcHJvcGVydHkgbmFtZSBvciBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkXG4gICAgICogIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgY29tcG9zZWQgYWdncmVnYXRlIG9iamVjdC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5ncm91cEJ5KFs0LjIsIDYuMSwgNi40XSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiBNYXRoLmZsb29yKG51bSk7IH0pO1xuICAgICAqIC8vID0+IHsgJzQnOiBbNC4yXSwgJzYnOiBbNi4xLCA2LjRdIH1cbiAgICAgKlxuICAgICAqIF8uZ3JvdXBCeShbNC4yLCA2LjEsIDYuNF0sIGZ1bmN0aW9uKG51bSkgeyByZXR1cm4gdGhpcy5mbG9vcihudW0pOyB9LCBNYXRoKTtcbiAgICAgKiAvLyA9PiB7ICc0JzogWzQuMl0sICc2JzogWzYuMSwgNi40XSB9XG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ucGx1Y2tcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLmdyb3VwQnkoWydvbmUnLCAndHdvJywgJ3RocmVlJ10sICdsZW5ndGgnKTtcbiAgICAgKiAvLyA9PiB7ICczJzogWydvbmUnLCAndHdvJ10sICc1JzogWyd0aHJlZSddIH1cbiAgICAgKi9cbiAgICB2YXIgZ3JvdXBCeSA9IGNyZWF0ZUFnZ3JlZ2F0b3IoZnVuY3Rpb24ocmVzdWx0LCB2YWx1ZSwga2V5KSB7XG4gICAgICAoaGFzT3duUHJvcGVydHkuY2FsbChyZXN1bHQsIGtleSkgPyByZXN1bHRba2V5XSA6IHJlc3VsdFtrZXldID0gW10pLnB1c2godmFsdWUpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBvYmplY3QgY29tcG9zZWQgb2Yga2V5cyBnZW5lcmF0ZWQgZnJvbSB0aGUgcmVzdWx0cyBvZiBydW5uaW5nXG4gICAgICogZWFjaCBlbGVtZW50IG9mIHRoZSBjb2xsZWN0aW9uIHRocm91Z2ggdGhlIGdpdmVuIGNhbGxiYWNrLiBUaGUgY29ycmVzcG9uZGluZ1xuICAgICAqIHZhbHVlIG9mIGVhY2gga2V5IGlzIHRoZSBsYXN0IGVsZW1lbnQgcmVzcG9uc2libGUgZm9yIGdlbmVyYXRpbmcgdGhlIGtleS5cbiAgICAgKiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWUgYXJndW1lbnRzO1xuICAgICAqICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGNvbXBvc2VkIGFnZ3JlZ2F0ZSBvYmplY3QuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBrZXlzID0gW1xuICAgICAqICAgeyAnZGlyJzogJ2xlZnQnLCAnY29kZSc6IDk3IH0sXG4gICAgICogICB7ICdkaXInOiAncmlnaHQnLCAnY29kZSc6IDEwMCB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIF8uaW5kZXhCeShrZXlzLCAnZGlyJyk7XG4gICAgICogLy8gPT4geyAnbGVmdCc6IHsgJ2Rpcic6ICdsZWZ0JywgJ2NvZGUnOiA5NyB9LCAncmlnaHQnOiB7ICdkaXInOiAncmlnaHQnLCAnY29kZSc6IDEwMCB9IH1cbiAgICAgKlxuICAgICAqIF8uaW5kZXhCeShrZXlzLCBmdW5jdGlvbihrZXkpIHsgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5LmNvZGUpOyB9KTtcbiAgICAgKiAvLyA9PiB7ICdhJzogeyAnZGlyJzogJ2xlZnQnLCAnY29kZSc6IDk3IH0sICdkJzogeyAnZGlyJzogJ3JpZ2h0JywgJ2NvZGUnOiAxMDAgfSB9XG4gICAgICpcbiAgICAgKiBfLmluZGV4QnkoY2hhcmFjdGVycywgZnVuY3Rpb24oa2V5KSB7IHRoaXMuZnJvbUNoYXJDb2RlKGtleS5jb2RlKTsgfSwgU3RyaW5nKTtcbiAgICAgKiAvLyA9PiB7ICdhJzogeyAnZGlyJzogJ2xlZnQnLCAnY29kZSc6IDk3IH0sICdkJzogeyAnZGlyJzogJ3JpZ2h0JywgJ2NvZGUnOiAxMDAgfSB9XG4gICAgICovXG4gICAgdmFyIGluZGV4QnkgPSBjcmVhdGVBZ2dyZWdhdG9yKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEludm9rZXMgdGhlIG1ldGhvZCBuYW1lZCBieSBgbWV0aG9kTmFtZWAgb24gZWFjaCBlbGVtZW50IGluIHRoZSBgY29sbGVjdGlvbmBcbiAgICAgKiByZXR1cm5pbmcgYW4gYXJyYXkgb2YgdGhlIHJlc3VsdHMgb2YgZWFjaCBpbnZva2VkIG1ldGhvZC4gQWRkaXRpb25hbCBhcmd1bWVudHNcbiAgICAgKiB3aWxsIGJlIHByb3ZpZGVkIHRvIGVhY2ggaW52b2tlZCBtZXRob2QuIElmIGBtZXRob2ROYW1lYCBpcyBhIGZ1bmN0aW9uIGl0XG4gICAgICogd2lsbCBiZSBpbnZva2VkIGZvciwgYW5kIGB0aGlzYCBib3VuZCB0bywgZWFjaCBlbGVtZW50IGluIHRoZSBgY29sbGVjdGlvbmAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258c3RyaW5nfSBtZXRob2ROYW1lIFRoZSBuYW1lIG9mIHRoZSBtZXRob2QgdG8gaW52b2tlIG9yXG4gICAgICogIHRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gICAgICogQHBhcmFtIHsuLi4qfSBbYXJnXSBBcmd1bWVudHMgdG8gaW52b2tlIHRoZSBtZXRob2Qgd2l0aC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBuZXcgYXJyYXkgb2YgdGhlIHJlc3VsdHMgb2YgZWFjaCBpbnZva2VkIG1ldGhvZC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pbnZva2UoW1s1LCAxLCA3XSwgWzMsIDIsIDFdXSwgJ3NvcnQnKTtcbiAgICAgKiAvLyA9PiBbWzEsIDUsIDddLCBbMSwgMiwgM11dXG4gICAgICpcbiAgICAgKiBfLmludm9rZShbMTIzLCA0NTZdLCBTdHJpbmcucHJvdG90eXBlLnNwbGl0LCAnJyk7XG4gICAgICogLy8gPT4gW1snMScsICcyJywgJzMnXSwgWyc0JywgJzUnLCAnNiddXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGludm9rZShjb2xsZWN0aW9uLCBtZXRob2ROYW1lKSB7XG4gICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMiksXG4gICAgICAgICAgaW5kZXggPSAtMSxcbiAgICAgICAgICBpc0Z1bmMgPSB0eXBlb2YgbWV0aG9kTmFtZSA9PSAnZnVuY3Rpb24nLFxuICAgICAgICAgIGxlbmd0aCA9IGNvbGxlY3Rpb24gPyBjb2xsZWN0aW9uLmxlbmd0aCA6IDAsXG4gICAgICAgICAgcmVzdWx0ID0gQXJyYXkodHlwZW9mIGxlbmd0aCA9PSAnbnVtYmVyJyA/IGxlbmd0aCA6IDApO1xuXG4gICAgICBmb3JFYWNoKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJlc3VsdFsrK2luZGV4XSA9IChpc0Z1bmMgPyBtZXRob2ROYW1lIDogdmFsdWVbbWV0aG9kTmFtZV0pLmFwcGx5KHZhbHVlLCBhcmdzKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IG9mIHZhbHVlcyBieSBydW5uaW5nIGVhY2ggZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvblxuICAgICAqIHRocm91Z2ggdGhlIGNhbGxiYWNrLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGhcbiAgICAgKiB0aHJlZSBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIGNvbGxlY3RcbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fHN0cmluZ30gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBpdGVyYXRpb24uIElmIGEgcHJvcGVydHkgbmFtZSBvciBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkXG4gICAgICogIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGEgbmV3IGFycmF5IG9mIHRoZSByZXN1bHRzIG9mIGVhY2ggYGNhbGxiYWNrYCBleGVjdXRpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8ubWFwKFsxLCAyLCAzXSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiBudW0gKiAzOyB9KTtcbiAgICAgKiAvLyA9PiBbMywgNiwgOV1cbiAgICAgKlxuICAgICAqIF8ubWFwKHsgJ29uZSc6IDEsICd0d28nOiAyLCAndGhyZWUnOiAzIH0sIGZ1bmN0aW9uKG51bSkgeyByZXR1cm4gbnVtICogMzsgfSk7XG4gICAgICogLy8gPT4gWzMsIDYsIDldIChwcm9wZXJ0eSBvcmRlciBpcyBub3QgZ3VhcmFudGVlZCBhY3Jvc3MgZW52aXJvbm1lbnRzKVxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAnYWdlJzogNDAgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ucGx1Y2tcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLm1hcChjaGFyYWN0ZXJzLCAnbmFtZScpO1xuICAgICAqIC8vID0+IFsnYmFybmV5JywgJ2ZyZWQnXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1hcChjb2xsZWN0aW9uLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgbGVuZ3RoID0gY29sbGVjdGlvbiA/IGNvbGxlY3Rpb24ubGVuZ3RoIDogMDtcblxuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgaWYgKHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgcmVzdWx0W2luZGV4XSA9IGNhbGxiYWNrKGNvbGxlY3Rpb25baW5kZXhdLCBpbmRleCwgY29sbGVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IFtdO1xuICAgICAgICBmb3JPd24oY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGtleSwgY29sbGVjdGlvbikge1xuICAgICAgICAgIHJlc3VsdFsrK2luZGV4XSA9IGNhbGxiYWNrKHZhbHVlLCBrZXksIGNvbGxlY3Rpb24pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBtYXhpbXVtIHZhbHVlIG9mIGEgY29sbGVjdGlvbi4gSWYgdGhlIGNvbGxlY3Rpb24gaXMgZW1wdHkgb3JcbiAgICAgKiBmYWxzZXkgYC1JbmZpbml0eWAgaXMgcmV0dXJuZWQuIElmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSBleGVjdXRlZFxuICAgICAqIGZvciBlYWNoIHZhbHVlIGluIHRoZSBjb2xsZWN0aW9uIHRvIGdlbmVyYXRlIHRoZSBjcml0ZXJpb24gYnkgd2hpY2ggdGhlIHZhbHVlXG4gICAgICogaXMgcmFua2VkLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWVcbiAgICAgKiBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fHN0cmluZ30gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBpdGVyYXRpb24uIElmIGEgcHJvcGVydHkgbmFtZSBvciBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkXG4gICAgICogIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIG1heGltdW0gdmFsdWUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8ubWF4KFs0LCAyLCA4LCA2XSk7XG4gICAgICogLy8gPT4gOFxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAnYWdlJzogNDAgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiBfLm1heChjaGFyYWN0ZXJzLCBmdW5jdGlvbihjaHIpIHsgcmV0dXJuIGNoci5hZ2U7IH0pO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnZnJlZCcsICdhZ2UnOiA0MCB9O1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5tYXgoY2hhcmFjdGVycywgJ2FnZScpO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnZnJlZCcsICdhZ2UnOiA0MCB9O1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1heChjb2xsZWN0aW9uLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIGNvbXB1dGVkID0gLUluZmluaXR5LFxuICAgICAgICAgIHJlc3VsdCA9IGNvbXB1dGVkO1xuXG4gICAgICAvLyBhbGxvd3Mgd29ya2luZyB3aXRoIGZ1bmN0aW9ucyBsaWtlIGBfLm1hcGAgd2l0aG91dCB1c2luZ1xuICAgICAgLy8gdGhlaXIgYGluZGV4YCBhcmd1bWVudCBhcyBhIGNhbGxiYWNrXG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9ICdmdW5jdGlvbicgJiYgdGhpc0FyZyAmJiB0aGlzQXJnW2NhbGxiYWNrXSA9PT0gY29sbGVjdGlvbikge1xuICAgICAgICBjYWxsYmFjayA9IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoY2FsbGJhY2sgPT0gbnVsbCAmJiBpc0FycmF5KGNvbGxlY3Rpb24pKSB7XG4gICAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgICAgbGVuZ3RoID0gY29sbGVjdGlvbi5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBjb2xsZWN0aW9uW2luZGV4XTtcbiAgICAgICAgICBpZiAodmFsdWUgPiByZXN1bHQpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sgPSAoY2FsbGJhY2sgPT0gbnVsbCAmJiBpc1N0cmluZyhjb2xsZWN0aW9uKSlcbiAgICAgICAgICA/IGNoYXJBdENhbGxiYWNrXG4gICAgICAgICAgOiBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuXG4gICAgICAgIGZvckVhY2goY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgdmFyIGN1cnJlbnQgPSBjYWxsYmFjayh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgICAgIGlmIChjdXJyZW50ID4gY29tcHV0ZWQpIHtcbiAgICAgICAgICAgIGNvbXB1dGVkID0gY3VycmVudDtcbiAgICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgbWluaW11bSB2YWx1ZSBvZiBhIGNvbGxlY3Rpb24uIElmIHRoZSBjb2xsZWN0aW9uIGlzIGVtcHR5IG9yXG4gICAgICogZmFsc2V5IGBJbmZpbml0eWAgaXMgcmV0dXJuZWQuIElmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSBleGVjdXRlZFxuICAgICAqIGZvciBlYWNoIHZhbHVlIGluIHRoZSBjb2xsZWN0aW9uIHRvIGdlbmVyYXRlIHRoZSBjcml0ZXJpb24gYnkgd2hpY2ggdGhlIHZhbHVlXG4gICAgICogaXMgcmFua2VkLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWVcbiAgICAgKiBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fHN0cmluZ30gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBpdGVyYXRpb24uIElmIGEgcHJvcGVydHkgbmFtZSBvciBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkXG4gICAgICogIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIG1pbmltdW0gdmFsdWUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8ubWluKFs0LCAyLCA4LCA2XSk7XG4gICAgICogLy8gPT4gMlxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAnYWdlJzogNDAgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiBfLm1pbihjaGFyYWN0ZXJzLCBmdW5jdGlvbihjaHIpIHsgcmV0dXJuIGNoci5hZ2U7IH0pO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnYmFybmV5JywgJ2FnZSc6IDM2IH07XG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ucGx1Y2tcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLm1pbihjaGFyYWN0ZXJzLCAnYWdlJyk7XG4gICAgICogLy8gPT4geyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYgfTtcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtaW4oY29sbGVjdGlvbiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBjb21wdXRlZCA9IEluZmluaXR5LFxuICAgICAgICAgIHJlc3VsdCA9IGNvbXB1dGVkO1xuXG4gICAgICAvLyBhbGxvd3Mgd29ya2luZyB3aXRoIGZ1bmN0aW9ucyBsaWtlIGBfLm1hcGAgd2l0aG91dCB1c2luZ1xuICAgICAgLy8gdGhlaXIgYGluZGV4YCBhcmd1bWVudCBhcyBhIGNhbGxiYWNrXG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9ICdmdW5jdGlvbicgJiYgdGhpc0FyZyAmJiB0aGlzQXJnW2NhbGxiYWNrXSA9PT0gY29sbGVjdGlvbikge1xuICAgICAgICBjYWxsYmFjayA9IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoY2FsbGJhY2sgPT0gbnVsbCAmJiBpc0FycmF5KGNvbGxlY3Rpb24pKSB7XG4gICAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgICAgbGVuZ3RoID0gY29sbGVjdGlvbi5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBjb2xsZWN0aW9uW2luZGV4XTtcbiAgICAgICAgICBpZiAodmFsdWUgPCByZXN1bHQpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sgPSAoY2FsbGJhY2sgPT0gbnVsbCAmJiBpc1N0cmluZyhjb2xsZWN0aW9uKSlcbiAgICAgICAgICA/IGNoYXJBdENhbGxiYWNrXG4gICAgICAgICAgOiBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuXG4gICAgICAgIGZvckVhY2goY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgdmFyIGN1cnJlbnQgPSBjYWxsYmFjayh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgICAgIGlmIChjdXJyZW50IDwgY29tcHV0ZWQpIHtcbiAgICAgICAgICAgIGNvbXB1dGVkID0gY3VycmVudDtcbiAgICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgdmFsdWUgb2YgYSBzcGVjaWZpZWQgcHJvcGVydHkgZnJvbSBhbGwgZWxlbWVudHMgaW4gdGhlIGNvbGxlY3Rpb24uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAdHlwZSBGdW5jdGlvblxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3BlcnR5IFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSB0byBwbHVjay5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBuZXcgYXJyYXkgb2YgcHJvcGVydHkgdmFsdWVzLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IFtcbiAgICAgKiAgIHsgJ25hbWUnOiAnYmFybmV5JywgJ2FnZSc6IDM2IH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICdhZ2UnOiA0MCB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIF8ucGx1Y2soY2hhcmFjdGVycywgJ25hbWUnKTtcbiAgICAgKiAvLyA9PiBbJ2Jhcm5leScsICdmcmVkJ11cbiAgICAgKi9cbiAgICB2YXIgcGx1Y2sgPSBtYXA7XG5cbiAgICAvKipcbiAgICAgKiBSZWR1Y2VzIGEgY29sbGVjdGlvbiB0byBhIHZhbHVlIHdoaWNoIGlzIHRoZSBhY2N1bXVsYXRlZCByZXN1bHQgb2YgcnVubmluZ1xuICAgICAqIGVhY2ggZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvbiB0aHJvdWdoIHRoZSBjYWxsYmFjaywgd2hlcmUgZWFjaCBzdWNjZXNzaXZlXG4gICAgICogY2FsbGJhY2sgZXhlY3V0aW9uIGNvbnN1bWVzIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIHByZXZpb3VzIGV4ZWN1dGlvbi4gSWZcbiAgICAgKiBgYWNjdW11bGF0b3JgIGlzIG5vdCBwcm92aWRlZCB0aGUgZmlyc3QgZWxlbWVudCBvZiB0aGUgY29sbGVjdGlvbiB3aWxsIGJlXG4gICAgICogdXNlZCBhcyB0aGUgaW5pdGlhbCBgYWNjdW11bGF0b3JgIHZhbHVlLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgXG4gICAgICogYW5kIGludm9rZWQgd2l0aCBmb3VyIGFyZ3VtZW50czsgKGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBhbGlhcyBmb2xkbCwgaW5qZWN0XG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICAgKiBAcGFyYW0geyp9IFthY2N1bXVsYXRvcl0gSW5pdGlhbCB2YWx1ZSBvZiB0aGUgYWNjdW11bGF0b3IuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGFjY3VtdWxhdGVkIHZhbHVlLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgc3VtID0gXy5yZWR1Y2UoWzEsIDIsIDNdLCBmdW5jdGlvbihzdW0sIG51bSkge1xuICAgICAqICAgcmV0dXJuIHN1bSArIG51bTtcbiAgICAgKiB9KTtcbiAgICAgKiAvLyA9PiA2XG4gICAgICpcbiAgICAgKiB2YXIgbWFwcGVkID0gXy5yZWR1Y2UoeyAnYSc6IDEsICdiJzogMiwgJ2MnOiAzIH0sIGZ1bmN0aW9uKHJlc3VsdCwgbnVtLCBrZXkpIHtcbiAgICAgKiAgIHJlc3VsdFtrZXldID0gbnVtICogMztcbiAgICAgKiAgIHJldHVybiByZXN1bHQ7XG4gICAgICogfSwge30pO1xuICAgICAqIC8vID0+IHsgJ2EnOiAzLCAnYic6IDYsICdjJzogOSB9XG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVkdWNlKGNvbGxlY3Rpb24sIGNhbGxiYWNrLCBhY2N1bXVsYXRvciwgdGhpc0FyZykge1xuICAgICAgaWYgKCFjb2xsZWN0aW9uKSByZXR1cm4gYWNjdW11bGF0b3I7XG4gICAgICB2YXIgbm9hY2N1bSA9IGFyZ3VtZW50cy5sZW5ndGggPCAzO1xuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDQpO1xuXG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBjb2xsZWN0aW9uLmxlbmd0aDtcblxuICAgICAgaWYgKHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicpIHtcbiAgICAgICAgaWYgKG5vYWNjdW0pIHtcbiAgICAgICAgICBhY2N1bXVsYXRvciA9IGNvbGxlY3Rpb25bKytpbmRleF07XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICBhY2N1bXVsYXRvciA9IGNhbGxiYWNrKGFjY3VtdWxhdG9yLCBjb2xsZWN0aW9uW2luZGV4XSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3JPd24oY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgYWNjdW11bGF0b3IgPSBub2FjY3VtXG4gICAgICAgICAgICA/IChub2FjY3VtID0gZmFsc2UsIHZhbHVlKVxuICAgICAgICAgICAgOiBjYWxsYmFjayhhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhY2N1bXVsYXRvcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBsaWtlIGBfLnJlZHVjZWAgZXhjZXB0IHRoYXQgaXQgaXRlcmF0ZXMgb3ZlciBlbGVtZW50c1xuICAgICAqIG9mIGEgYGNvbGxlY3Rpb25gIGZyb20gcmlnaHQgdG8gbGVmdC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBhbGlhcyBmb2xkclxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrPWlkZW50aXR5XSBUaGUgZnVuY3Rpb24gY2FsbGVkIHBlciBpdGVyYXRpb24uXG4gICAgICogQHBhcmFtIHsqfSBbYWNjdW11bGF0b3JdIEluaXRpYWwgdmFsdWUgb2YgdGhlIGFjY3VtdWxhdG9yLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBhY2N1bXVsYXRlZCB2YWx1ZS5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGxpc3QgPSBbWzAsIDFdLCBbMiwgM10sIFs0LCA1XV07XG4gICAgICogdmFyIGZsYXQgPSBfLnJlZHVjZVJpZ2h0KGxpc3QsIGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGEuY29uY2F0KGIpOyB9LCBbXSk7XG4gICAgICogLy8gPT4gWzQsIDUsIDIsIDMsIDAsIDFdXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVkdWNlUmlnaHQoY29sbGVjdGlvbiwgY2FsbGJhY2ssIGFjY3VtdWxhdG9yLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgbm9hY2N1bSA9IGFyZ3VtZW50cy5sZW5ndGggPCAzO1xuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDQpO1xuICAgICAgZm9yRWFjaFJpZ2h0KGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgICBhY2N1bXVsYXRvciA9IG5vYWNjdW1cbiAgICAgICAgICA/IChub2FjY3VtID0gZmFsc2UsIHZhbHVlKVxuICAgICAgICAgIDogY2FsbGJhY2soYWNjdW11bGF0b3IsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBhY2N1bXVsYXRvcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgb3Bwb3NpdGUgb2YgYF8uZmlsdGVyYCB0aGlzIG1ldGhvZCByZXR1cm5zIHRoZSBlbGVtZW50cyBvZiBhXG4gICAgICogY29sbGVjdGlvbiB0aGF0IHRoZSBjYWxsYmFjayBkb2VzICoqbm90KiogcmV0dXJuIHRydWV5IGZvci5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyBhcnJheSBvZiBlbGVtZW50cyB0aGF0IGZhaWxlZCB0aGUgY2FsbGJhY2sgY2hlY2suXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBvZGRzID0gXy5yZWplY3QoWzEsIDIsIDMsIDQsIDUsIDZdLCBmdW5jdGlvbihudW0pIHsgcmV0dXJuIG51bSAlIDIgPT0gMDsgfSk7XG4gICAgICogLy8gPT4gWzEsIDMsIDVdXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IFtcbiAgICAgKiAgIHsgJ25hbWUnOiAnYmFybmV5JywgJ2FnZSc6IDM2LCAnYmxvY2tlZCc6IGZhbHNlIH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICdhZ2UnOiA0MCwgJ2Jsb2NrZWQnOiB0cnVlIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5yZWplY3QoY2hhcmFjdGVycywgJ2Jsb2NrZWQnKTtcbiAgICAgKiAvLyA9PiBbeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYsICdibG9ja2VkJzogZmFsc2UgfV1cbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy53aGVyZVwiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8ucmVqZWN0KGNoYXJhY3RlcnMsIHsgJ2FnZSc6IDM2IH0pO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ2ZyZWQnLCAnYWdlJzogNDAsICdibG9ja2VkJzogdHJ1ZSB9XVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlamVjdChjb2xsZWN0aW9uLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgcmV0dXJuIGZpbHRlcihjb2xsZWN0aW9uLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuICFjYWxsYmFjayh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGEgcmFuZG9tIGVsZW1lbnQgb3IgYG5gIHJhbmRvbSBlbGVtZW50cyBmcm9tIGEgY29sbGVjdGlvbi5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBzYW1wbGUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtuXSBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHNhbXBsZS5cbiAgICAgKiBAcGFyYW0tIHtPYmplY3R9IFtndWFyZF0gQWxsb3dzIHdvcmtpbmcgd2l0aCBmdW5jdGlvbnMgbGlrZSBgXy5tYXBgXG4gICAgICogIHdpdGhvdXQgdXNpbmcgdGhlaXIgYGluZGV4YCBhcmd1bWVudHMgYXMgYG5gLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgcmFuZG9tIHNhbXBsZShzKSBvZiBgY29sbGVjdGlvbmAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uc2FtcGxlKFsxLCAyLCAzLCA0XSk7XG4gICAgICogLy8gPT4gMlxuICAgICAqXG4gICAgICogXy5zYW1wbGUoWzEsIDIsIDMsIDRdLCAyKTtcbiAgICAgKiAvLyA9PiBbMywgMV1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzYW1wbGUoY29sbGVjdGlvbiwgbiwgZ3VhcmQpIHtcbiAgICAgIGlmIChjb2xsZWN0aW9uICYmIHR5cGVvZiBjb2xsZWN0aW9uLmxlbmd0aCAhPSAnbnVtYmVyJykge1xuICAgICAgICBjb2xsZWN0aW9uID0gdmFsdWVzKGNvbGxlY3Rpb24pO1xuICAgICAgfVxuICAgICAgaWYgKG4gPT0gbnVsbCB8fCBndWFyZCkge1xuICAgICAgICByZXR1cm4gY29sbGVjdGlvbiA/IGNvbGxlY3Rpb25bYmFzZVJhbmRvbSgwLCBjb2xsZWN0aW9uLmxlbmd0aCAtIDEpXSA6IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHZhciByZXN1bHQgPSBzaHVmZmxlKGNvbGxlY3Rpb24pO1xuICAgICAgcmVzdWx0Lmxlbmd0aCA9IG5hdGl2ZU1pbihuYXRpdmVNYXgoMCwgbiksIHJlc3VsdC5sZW5ndGgpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IG9mIHNodWZmbGVkIHZhbHVlcywgdXNpbmcgYSB2ZXJzaW9uIG9mIHRoZSBGaXNoZXItWWF0ZXNcbiAgICAgKiBzaHVmZmxlLiBTZWUgaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaXNoZXItWWF0ZXNfc2h1ZmZsZS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBzaHVmZmxlLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyBzaHVmZmxlZCBjb2xsZWN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnNodWZmbGUoWzEsIDIsIDMsIDQsIDUsIDZdKTtcbiAgICAgKiAvLyA9PiBbNCwgMSwgNiwgMywgNSwgMl1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaHVmZmxlKGNvbGxlY3Rpb24pIHtcbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIGxlbmd0aCA9IGNvbGxlY3Rpb24gPyBjb2xsZWN0aW9uLmxlbmd0aCA6IDAsXG4gICAgICAgICAgcmVzdWx0ID0gQXJyYXkodHlwZW9mIGxlbmd0aCA9PSAnbnVtYmVyJyA/IGxlbmd0aCA6IDApO1xuXG4gICAgICBmb3JFYWNoKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHZhciByYW5kID0gYmFzZVJhbmRvbSgwLCArK2luZGV4KTtcbiAgICAgICAgcmVzdWx0W2luZGV4XSA9IHJlc3VsdFtyYW5kXTtcbiAgICAgICAgcmVzdWx0W3JhbmRdID0gdmFsdWU7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgc2l6ZSBvZiB0aGUgYGNvbGxlY3Rpb25gIGJ5IHJldHVybmluZyBgY29sbGVjdGlvbi5sZW5ndGhgIGZvciBhcnJheXNcbiAgICAgKiBhbmQgYXJyYXktbGlrZSBvYmplY3RzIG9yIHRoZSBudW1iZXIgb2Ygb3duIGVudW1lcmFibGUgcHJvcGVydGllcyBmb3Igb2JqZWN0cy5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpbnNwZWN0LlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgYGNvbGxlY3Rpb24ubGVuZ3RoYCBvciBudW1iZXIgb2Ygb3duIGVudW1lcmFibGUgcHJvcGVydGllcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5zaXplKFsxLCAyXSk7XG4gICAgICogLy8gPT4gMlxuICAgICAqXG4gICAgICogXy5zaXplKHsgJ29uZSc6IDEsICd0d28nOiAyLCAndGhyZWUnOiAzIH0pO1xuICAgICAqIC8vID0+IDNcbiAgICAgKlxuICAgICAqIF8uc2l6ZSgncGViYmxlcycpO1xuICAgICAqIC8vID0+IDdcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaXplKGNvbGxlY3Rpb24pIHtcbiAgICAgIHZhciBsZW5ndGggPSBjb2xsZWN0aW9uID8gY29sbGVjdGlvbi5sZW5ndGggOiAwO1xuICAgICAgcmV0dXJuIHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicgPyBsZW5ndGggOiBrZXlzKGNvbGxlY3Rpb24pLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIGNhbGxiYWNrIHJldHVybnMgYSB0cnVleSB2YWx1ZSBmb3IgKiphbnkqKiBlbGVtZW50IG9mIGFcbiAgICAgKiBjb2xsZWN0aW9uLiBUaGUgZnVuY3Rpb24gcmV0dXJucyBhcyBzb29uIGFzIGl0IGZpbmRzIGEgcGFzc2luZyB2YWx1ZSBhbmRcbiAgICAgKiBkb2VzIG5vdCBpdGVyYXRlIG92ZXIgdGhlIGVudGlyZSBjb2xsZWN0aW9uLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG9cbiAgICAgKiBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIGFueVxuICAgICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWRcbiAgICAgKiAgcGVyIGl0ZXJhdGlvbi4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWRcbiAgICAgKiAgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYW55IGVsZW1lbnQgcGFzc2VkIHRoZSBjYWxsYmFjayBjaGVjayxcbiAgICAgKiAgZWxzZSBgZmFsc2VgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnNvbWUoW251bGwsIDAsICd5ZXMnLCBmYWxzZV0sIEJvb2xlYW4pO1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYsICdibG9ja2VkJzogZmFsc2UgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAnZnJlZCcsICAgJ2FnZSc6IDQwLCAnYmxvY2tlZCc6IHRydWUgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ucGx1Y2tcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLnNvbWUoY2hhcmFjdGVycywgJ2Jsb2NrZWQnKTtcbiAgICAgKiAvLyA9PiB0cnVlXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ud2hlcmVcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLnNvbWUoY2hhcmFjdGVycywgeyAnYWdlJzogMSB9KTtcbiAgICAgKiAvLyA9PiBmYWxzZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNvbWUoY29sbGVjdGlvbiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciByZXN1bHQ7XG4gICAgICBjYWxsYmFjayA9IGxvZGFzaC5jcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG5cbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIGxlbmd0aCA9IGNvbGxlY3Rpb24gPyBjb2xsZWN0aW9uLmxlbmd0aCA6IDA7XG5cbiAgICAgIGlmICh0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInKSB7XG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKChyZXN1bHQgPSBjYWxsYmFjayhjb2xsZWN0aW9uW2luZGV4XSwgaW5kZXgsIGNvbGxlY3Rpb24pKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3JPd24oY29sbGVjdGlvbiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuICEocmVzdWx0ID0gY2FsbGJhY2sodmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuICEhcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgZWxlbWVudHMsIHNvcnRlZCBpbiBhc2NlbmRpbmcgb3JkZXIgYnkgdGhlIHJlc3VsdHMgb2ZcbiAgICAgKiBydW5uaW5nIGVhY2ggZWxlbWVudCBpbiBhIGNvbGxlY3Rpb24gdGhyb3VnaCB0aGUgY2FsbGJhY2suIFRoaXMgbWV0aG9kXG4gICAgICogcGVyZm9ybXMgYSBzdGFibGUgc29ydCwgdGhhdCBpcywgaXQgd2lsbCBwcmVzZXJ2ZSB0aGUgb3JpZ2luYWwgc29ydCBvcmRlclxuICAgICAqIG9mIGVxdWFsIGVsZW1lbnRzLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGhcbiAgICAgKiB0aHJlZSBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjb2xsZWN0aW9uXG4gICAgICogd2lsbCBiZSBzb3J0ZWQgYnkgZWFjaCBwcm9wZXJ0eSB2YWx1ZS5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge0FycmF5fEZ1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyBhcnJheSBvZiBzb3J0ZWQgZWxlbWVudHMuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uc29ydEJ5KFsxLCAyLCAzXSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiBNYXRoLnNpbihudW0pOyB9KTtcbiAgICAgKiAvLyA9PiBbMywgMSwgMl1cbiAgICAgKlxuICAgICAqIF8uc29ydEJ5KFsxLCAyLCAzXSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiB0aGlzLnNpbihudW0pOyB9LCBNYXRoKTtcbiAgICAgKiAvLyA9PiBbMywgMSwgMl1cbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAgJ2FnZSc6IDM2IH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICAnYWdlJzogNDAgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAnYmFybmV5JywgICdhZ2UnOiAyNiB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAgJ2FnZSc6IDMwIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5tYXAoXy5zb3J0QnkoY2hhcmFjdGVycywgJ2FnZScpLCBfLnZhbHVlcyk7XG4gICAgICogLy8gPT4gW1snYmFybmV5JywgMjZdLCBbJ2ZyZWQnLCAzMF0sIFsnYmFybmV5JywgMzZdLCBbJ2ZyZWQnLCA0MF1dXG4gICAgICpcbiAgICAgKiAvLyBzb3J0aW5nIGJ5IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgKiBfLm1hcChfLnNvcnRCeShjaGFyYWN0ZXJzLCBbJ25hbWUnLCAnYWdlJ10pLCBfLnZhbHVlcyk7XG4gICAgICogLy8gPSA+IFtbJ2Jhcm5leScsIDI2XSwgWydiYXJuZXknLCAzNl0sIFsnZnJlZCcsIDMwXSwgWydmcmVkJywgNDBdXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNvcnRCeShjb2xsZWN0aW9uLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgaXNBcnIgPSBpc0FycmF5KGNhbGxiYWNrKSxcbiAgICAgICAgICBsZW5ndGggPSBjb2xsZWN0aW9uID8gY29sbGVjdGlvbi5sZW5ndGggOiAwLFxuICAgICAgICAgIHJlc3VsdCA9IEFycmF5KHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicgPyBsZW5ndGggOiAwKTtcblxuICAgICAgaWYgKCFpc0Fycikge1xuICAgICAgICBjYWxsYmFjayA9IGxvZGFzaC5jcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG4gICAgICB9XG4gICAgICBmb3JFYWNoKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBrZXksIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgdmFyIG9iamVjdCA9IHJlc3VsdFsrK2luZGV4XSA9IGdldE9iamVjdCgpO1xuICAgICAgICBpZiAoaXNBcnIpIHtcbiAgICAgICAgICBvYmplY3QuY3JpdGVyaWEgPSBtYXAoY2FsbGJhY2ssIGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gdmFsdWVba2V5XTsgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgKG9iamVjdC5jcml0ZXJpYSA9IGdldEFycmF5KCkpWzBdID0gY2FsbGJhY2sodmFsdWUsIGtleSwgY29sbGVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgb2JqZWN0LmluZGV4ID0gaW5kZXg7XG4gICAgICAgIG9iamVjdC52YWx1ZSA9IHZhbHVlO1xuICAgICAgfSk7XG5cbiAgICAgIGxlbmd0aCA9IHJlc3VsdC5sZW5ndGg7XG4gICAgICByZXN1bHQuc29ydChjb21wYXJlQXNjZW5kaW5nKTtcbiAgICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgICB2YXIgb2JqZWN0ID0gcmVzdWx0W2xlbmd0aF07XG4gICAgICAgIHJlc3VsdFtsZW5ndGhdID0gb2JqZWN0LnZhbHVlO1xuICAgICAgICBpZiAoIWlzQXJyKSB7XG4gICAgICAgICAgcmVsZWFzZUFycmF5KG9iamVjdC5jcml0ZXJpYSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVsZWFzZU9iamVjdChvYmplY3QpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0aGUgYGNvbGxlY3Rpb25gIHRvIGFuIGFycmF5LlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGNvbnZlcnQuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBuZXcgY29udmVydGVkIGFycmF5LlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAoZnVuY3Rpb24oKSB7IHJldHVybiBfLnRvQXJyYXkoYXJndW1lbnRzKS5zbGljZSgxKTsgfSkoMSwgMiwgMywgNCk7XG4gICAgICogLy8gPT4gWzIsIDMsIDRdXG4gICAgICovXG4gICAgZnVuY3Rpb24gdG9BcnJheShjb2xsZWN0aW9uKSB7XG4gICAgICBpZiAoY29sbGVjdGlvbiAmJiB0eXBlb2YgY29sbGVjdGlvbi5sZW5ndGggPT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIHNsaWNlKGNvbGxlY3Rpb24pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlcyhjb2xsZWN0aW9uKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtcyBhIGRlZXAgY29tcGFyaXNvbiBvZiBlYWNoIGVsZW1lbnQgaW4gYSBgY29sbGVjdGlvbmAgdG8gdGhlIGdpdmVuXG4gICAgICogYHByb3BlcnRpZXNgIG9iamVjdCwgcmV0dXJuaW5nIGFuIGFycmF5IG9mIGFsbCBlbGVtZW50cyB0aGF0IGhhdmUgZXF1aXZhbGVudFxuICAgICAqIHByb3BlcnR5IHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEB0eXBlIEZ1bmN0aW9uXG4gICAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25zXG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcHJvcHMgVGhlIG9iamVjdCBvZiBwcm9wZXJ0eSB2YWx1ZXMgdG8gZmlsdGVyIGJ5LlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyBhcnJheSBvZiBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIGdpdmVuIHByb3BlcnRpZXMuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYsICdwZXRzJzogWydob3BweSddIH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICdhZ2UnOiA0MCwgJ3BldHMnOiBbJ2JhYnkgcHVzcycsICdkaW5vJ10gfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiBfLndoZXJlKGNoYXJhY3RlcnMsIHsgJ2FnZSc6IDM2IH0pO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiwgJ3BldHMnOiBbJ2hvcHB5J10gfV1cbiAgICAgKlxuICAgICAqIF8ud2hlcmUoY2hhcmFjdGVycywgeyAncGV0cyc6IFsnZGlubyddIH0pO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ2ZyZWQnLCAnYWdlJzogNDAsICdwZXRzJzogWydiYWJ5IHB1c3MnLCAnZGlubyddIH1dXG4gICAgICovXG4gICAgdmFyIHdoZXJlID0gZmlsdGVyO1xuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IHdpdGggYWxsIGZhbHNleSB2YWx1ZXMgcmVtb3ZlZC4gVGhlIHZhbHVlcyBgZmFsc2VgLCBgbnVsbGAsXG4gICAgICogYDBgLCBgXCJcImAsIGB1bmRlZmluZWRgLCBhbmQgYE5hTmAgYXJlIGFsbCBmYWxzZXkuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGNvbXBhY3QuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGEgbmV3IGFycmF5IG9mIGZpbHRlcmVkIHZhbHVlcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5jb21wYWN0KFswLCAxLCBmYWxzZSwgMiwgJycsIDNdKTtcbiAgICAgKiAvLyA9PiBbMSwgMiwgM11cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjb21wYWN0KGFycmF5KSB7XG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDAsXG4gICAgICAgICAgcmVzdWx0ID0gW107XG5cbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGFycmF5W2luZGV4XTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgZXhjbHVkaW5nIGFsbCB2YWx1ZXMgb2YgdGhlIHByb3ZpZGVkIGFycmF5cyB1c2luZyBzdHJpY3RcbiAgICAgKiBlcXVhbGl0eSBmb3IgY29tcGFyaXNvbnMsIGkuZS4gYD09PWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHByb2Nlc3MuXG4gICAgICogQHBhcmFtIHsuLi5BcnJheX0gW3ZhbHVlc10gVGhlIGFycmF5cyBvZiB2YWx1ZXMgdG8gZXhjbHVkZS5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBuZXcgYXJyYXkgb2YgZmlsdGVyZWQgdmFsdWVzLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmRpZmZlcmVuY2UoWzEsIDIsIDMsIDQsIDVdLCBbNSwgMiwgMTBdKTtcbiAgICAgKiAvLyA9PiBbMSwgMywgNF1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkaWZmZXJlbmNlKGFycmF5KSB7XG4gICAgICByZXR1cm4gYmFzZURpZmZlcmVuY2UoYXJyYXksIGJhc2VGbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSwgdHJ1ZSwgMSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGxpa2UgYF8uZmluZGAgZXhjZXB0IHRoYXQgaXQgcmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGZpcnN0XG4gICAgICogZWxlbWVudCB0aGF0IHBhc3NlcyB0aGUgY2FsbGJhY2sgY2hlY2ssIGluc3RlYWQgb2YgdGhlIGVsZW1lbnQgaXRzZWxmLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHNlYXJjaC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBmb3VuZCBlbGVtZW50LCBlbHNlIGAtMWAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAgJ2FnZSc6IDM2LCAnYmxvY2tlZCc6IGZhbHNlIH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICAnYWdlJzogNDAsICdibG9ja2VkJzogdHJ1ZSB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdwZWJibGVzJywgJ2FnZSc6IDEsICAnYmxvY2tlZCc6IGZhbHNlIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogXy5maW5kSW5kZXgoY2hhcmFjdGVycywgZnVuY3Rpb24oY2hyKSB7XG4gICAgICogICByZXR1cm4gY2hyLmFnZSA8IDIwO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IDJcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy53aGVyZVwiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmluZEluZGV4KGNoYXJhY3RlcnMsIHsgJ2FnZSc6IDM2IH0pO1xuICAgICAqIC8vID0+IDBcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmluZEluZGV4KGNoYXJhY3RlcnMsICdibG9ja2VkJyk7XG4gICAgICogLy8gPT4gMVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmRJbmRleChhcnJheSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIGxlbmd0aCA9IGFycmF5ID8gYXJyYXkubGVuZ3RoIDogMDtcblxuICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKGFycmF5W2luZGV4XSwgaW5kZXgsIGFycmF5KSkge1xuICAgICAgICAgIHJldHVybiBpbmRleDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGxpa2UgYF8uZmluZEluZGV4YCBleGNlcHQgdGhhdCBpdCBpdGVyYXRlcyBvdmVyIGVsZW1lbnRzXG4gICAgICogb2YgYSBgY29sbGVjdGlvbmAgZnJvbSByaWdodCB0byBsZWZ0LlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHNlYXJjaC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBmb3VuZCBlbGVtZW50LCBlbHNlIGAtMWAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAgJ2FnZSc6IDM2LCAnYmxvY2tlZCc6IHRydWUgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAnZnJlZCcsICAgICdhZ2UnOiA0MCwgJ2Jsb2NrZWQnOiBmYWxzZSB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdwZWJibGVzJywgJ2FnZSc6IDEsICAnYmxvY2tlZCc6IHRydWUgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiBfLmZpbmRMYXN0SW5kZXgoY2hhcmFjdGVycywgZnVuY3Rpb24oY2hyKSB7XG4gICAgICogICByZXR1cm4gY2hyLmFnZSA+IDMwO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IDFcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy53aGVyZVwiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmluZExhc3RJbmRleChjaGFyYWN0ZXJzLCB7ICdhZ2UnOiAzNiB9KTtcbiAgICAgKiAvLyA9PiAwXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ucGx1Y2tcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLmZpbmRMYXN0SW5kZXgoY2hhcmFjdGVycywgJ2Jsb2NrZWQnKTtcbiAgICAgKiAvLyA9PiAyXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmluZExhc3RJbmRleChhcnJheSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDA7XG4gICAgICBjYWxsYmFjayA9IGxvZGFzaC5jcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG4gICAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKGFycmF5W2xlbmd0aF0sIGxlbmd0aCwgYXJyYXkpKSB7XG4gICAgICAgICAgcmV0dXJuIGxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGZpcnN0IGVsZW1lbnQgb3IgZmlyc3QgYG5gIGVsZW1lbnRzIG9mIGFuIGFycmF5LiBJZiBhIGNhbGxiYWNrXG4gICAgICogaXMgcHJvdmlkZWQgZWxlbWVudHMgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgYXJyYXkgYXJlIHJldHVybmVkIGFzIGxvbmdcbiAgICAgKiBhcyB0aGUgY2FsbGJhY2sgcmV0dXJucyB0cnVleS4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmRcbiAgICAgKiBpbnZva2VkIHdpdGggdGhyZWUgYXJndW1lbnRzOyAodmFsdWUsIGluZGV4LCBhcnJheSkuXG4gICAgICpcbiAgICAgKiBJZiBhIHByb3BlcnR5IG5hbWUgaXMgcHJvdmlkZWQgZm9yIGBjYWxsYmFja2AgdGhlIGNyZWF0ZWQgXCJfLnBsdWNrXCIgc3R5bGVcbiAgICAgKiBjYWxsYmFjayB3aWxsIHJldHVybiB0aGUgcHJvcGVydHkgdmFsdWUgb2YgdGhlIGdpdmVuIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBJZiBhbiBvYmplY3QgaXMgcHJvdmlkZWQgZm9yIGBjYWxsYmFja2AgdGhlIGNyZWF0ZWQgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2tcbiAgICAgKiB3aWxsIHJldHVybiBgdHJ1ZWAgZm9yIGVsZW1lbnRzIHRoYXQgaGF2ZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgZ2l2ZW4gb2JqZWN0LFxuICAgICAqIGVsc2UgYGZhbHNlYC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBhbGlhcyBoZWFkLCB0YWtlXG4gICAgICogQGNhdGVnb3J5IEFycmF5c1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBxdWVyeS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxudW1iZXJ8c3RyaW5nfSBbY2FsbGJhY2tdIFRoZSBmdW5jdGlvbiBjYWxsZWRcbiAgICAgKiAgcGVyIGVsZW1lbnQgb3IgdGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZXR1cm4uIElmIGEgcHJvcGVydHkgbmFtZSBvclxuICAgICAqICBvYmplY3QgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkIHRvIGNyZWF0ZSBhIFwiXy5wbHVja1wiIG9yIFwiXy53aGVyZVwiXG4gICAgICogIHN0eWxlIGNhbGxiYWNrLCByZXNwZWN0aXZlbHkuXG4gICAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjYWxsYmFja2AuXG4gICAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGZpcnN0IGVsZW1lbnQocykgb2YgYGFycmF5YC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5maXJzdChbMSwgMiwgM10pO1xuICAgICAqIC8vID0+IDFcbiAgICAgKlxuICAgICAqIF8uZmlyc3QoWzEsIDIsIDNdLCAyKTtcbiAgICAgKiAvLyA9PiBbMSwgMl1cbiAgICAgKlxuICAgICAqIF8uZmlyc3QoWzEsIDIsIDNdLCBmdW5jdGlvbihudW0pIHtcbiAgICAgKiAgIHJldHVybiBudW0gPCAzO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IFsxLCAyXVxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICAnYmxvY2tlZCc6IHRydWUsICAnZW1wbG95ZXInOiAnc2xhdGUnIH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICAnYmxvY2tlZCc6IGZhbHNlLCAnZW1wbG95ZXInOiAnc2xhdGUnIH0sXG4gICAgICogICB7ICduYW1lJzogJ3BlYmJsZXMnLCAnYmxvY2tlZCc6IHRydWUsICAnZW1wbG95ZXInOiAnbmEnIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5maXJzdChjaGFyYWN0ZXJzLCAnYmxvY2tlZCcpO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ2Jhcm5leScsICdibG9ja2VkJzogdHJ1ZSwgJ2VtcGxveWVyJzogJ3NsYXRlJyB9XVxuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLndoZXJlXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5wbHVjayhfLmZpcnN0KGNoYXJhY3RlcnMsIHsgJ2VtcGxveWVyJzogJ3NsYXRlJyB9KSwgJ25hbWUnKTtcbiAgICAgKiAvLyA9PiBbJ2Jhcm5leScsICdmcmVkJ11cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaXJzdChhcnJheSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBuID0gMCxcbiAgICAgICAgICBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDA7XG5cbiAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT0gJ251bWJlcicgJiYgY2FsbGJhY2sgIT0gbnVsbCkge1xuICAgICAgICB2YXIgaW5kZXggPSAtMTtcbiAgICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCAmJiBjYWxsYmFjayhhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSkpIHtcbiAgICAgICAgICBuKys7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG4gPSBjYWxsYmFjaztcbiAgICAgICAgaWYgKG4gPT0gbnVsbCB8fCB0aGlzQXJnKSB7XG4gICAgICAgICAgcmV0dXJuIGFycmF5ID8gYXJyYXlbMF0gOiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBzbGljZShhcnJheSwgMCwgbmF0aXZlTWluKG5hdGl2ZU1heCgwLCBuKSwgbGVuZ3RoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmxhdHRlbnMgYSBuZXN0ZWQgYXJyYXkgKHRoZSBuZXN0aW5nIGNhbiBiZSB0byBhbnkgZGVwdGgpLiBJZiBgaXNTaGFsbG93YFxuICAgICAqIGlzIHRydWV5LCB0aGUgYXJyYXkgd2lsbCBvbmx5IGJlIGZsYXR0ZW5lZCBhIHNpbmdsZSBsZXZlbC4gSWYgYSBjYWxsYmFja1xuICAgICAqIGlzIHByb3ZpZGVkIGVhY2ggZWxlbWVudCBvZiB0aGUgYXJyYXkgaXMgcGFzc2VkIHRocm91Z2ggdGhlIGNhbGxiYWNrIGJlZm9yZVxuICAgICAqIGZsYXR0ZW5pbmcuIFRoZSBjYWxsYmFjayBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCB0aHJlZVxuICAgICAqIGFyZ3VtZW50czsgKHZhbHVlLCBpbmRleCwgYXJyYXkpLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGZsYXR0ZW4uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbaXNTaGFsbG93PWZhbHNlXSBBIGZsYWcgdG8gcmVzdHJpY3QgZmxhdHRlbmluZyB0byBhIHNpbmdsZSBsZXZlbC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtjYWxsYmFjaz1pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGNhbGxlZFxuICAgICAqICBwZXIgaXRlcmF0aW9uLiBJZiBhIHByb3BlcnR5IG5hbWUgb3Igb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZFxuICAgICAqICB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyBmbGF0dGVuZWQgYXJyYXkuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uZmxhdHRlbihbMSwgWzJdLCBbMywgW1s0XV1dXSk7XG4gICAgICogLy8gPT4gWzEsIDIsIDMsIDRdO1xuICAgICAqXG4gICAgICogXy5mbGF0dGVuKFsxLCBbMl0sIFszLCBbWzRdXV1dLCB0cnVlKTtcbiAgICAgKiAvLyA9PiBbMSwgMiwgMywgW1s0XV1dO1xuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzMCwgJ3BldHMnOiBbJ2hvcHB5J10gfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAnZnJlZCcsICAgJ2FnZSc6IDQwLCAncGV0cyc6IFsnYmFieSBwdXNzJywgJ2Rpbm8nXSB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uZmxhdHRlbihjaGFyYWN0ZXJzLCAncGV0cycpO1xuICAgICAqIC8vID0+IFsnaG9wcHknLCAnYmFieSBwdXNzJywgJ2Rpbm8nXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZsYXR0ZW4oYXJyYXksIGlzU2hhbGxvdywgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIC8vIGp1Z2dsZSBhcmd1bWVudHNcbiAgICAgIGlmICh0eXBlb2YgaXNTaGFsbG93ICE9ICdib29sZWFuJyAmJiBpc1NoYWxsb3cgIT0gbnVsbCkge1xuICAgICAgICB0aGlzQXJnID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrID0gKHR5cGVvZiBpc1NoYWxsb3cgIT0gJ2Z1bmN0aW9uJyAmJiB0aGlzQXJnICYmIHRoaXNBcmdbaXNTaGFsbG93XSA9PT0gYXJyYXkpID8gbnVsbCA6IGlzU2hhbGxvdztcbiAgICAgICAgaXNTaGFsbG93ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCkge1xuICAgICAgICBhcnJheSA9IG1hcChhcnJheSwgY2FsbGJhY2ssIHRoaXNBcmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGJhc2VGbGF0dGVuKGFycmF5LCBpc1NoYWxsb3cpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGluZGV4IGF0IHdoaWNoIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIGB2YWx1ZWAgaXMgZm91bmQgdXNpbmdcbiAgICAgKiBzdHJpY3QgZXF1YWxpdHkgZm9yIGNvbXBhcmlzb25zLCBpLmUuIGA9PT1gLiBJZiB0aGUgYXJyYXkgaXMgYWxyZWFkeSBzb3J0ZWRcbiAgICAgKiBwcm92aWRpbmcgYHRydWVgIGZvciBgZnJvbUluZGV4YCB3aWxsIHJ1biBhIGZhc3RlciBiaW5hcnkgc2VhcmNoLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEFycmF5c1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBzZWFyY2guXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2VhcmNoIGZvci5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58bnVtYmVyfSBbZnJvbUluZGV4PTBdIFRoZSBpbmRleCB0byBzZWFyY2ggZnJvbSBvciBgdHJ1ZWBcbiAgICAgKiAgdG8gcGVyZm9ybSBhIGJpbmFyeSBzZWFyY2ggb24gYSBzb3J0ZWQgYXJyYXkuXG4gICAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIG1hdGNoZWQgdmFsdWUgb3IgYC0xYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5pbmRleE9mKFsxLCAyLCAzLCAxLCAyLCAzXSwgMik7XG4gICAgICogLy8gPT4gMVxuICAgICAqXG4gICAgICogXy5pbmRleE9mKFsxLCAyLCAzLCAxLCAyLCAzXSwgMiwgMyk7XG4gICAgICogLy8gPT4gNFxuICAgICAqXG4gICAgICogXy5pbmRleE9mKFsxLCAxLCAyLCAyLCAzLCAzXSwgMiwgdHJ1ZSk7XG4gICAgICogLy8gPT4gMlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGluZGV4T2YoYXJyYXksIHZhbHVlLCBmcm9tSW5kZXgpIHtcbiAgICAgIGlmICh0eXBlb2YgZnJvbUluZGV4ID09ICdudW1iZXInKSB7XG4gICAgICAgIHZhciBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDA7XG4gICAgICAgIGZyb21JbmRleCA9IChmcm9tSW5kZXggPCAwID8gbmF0aXZlTWF4KDAsIGxlbmd0aCArIGZyb21JbmRleCkgOiBmcm9tSW5kZXggfHwgMCk7XG4gICAgICB9IGVsc2UgaWYgKGZyb21JbmRleCkge1xuICAgICAgICB2YXIgaW5kZXggPSBzb3J0ZWRJbmRleChhcnJheSwgdmFsdWUpO1xuICAgICAgICByZXR1cm4gYXJyYXlbaW5kZXhdID09PSB2YWx1ZSA/IGluZGV4IDogLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gYmFzZUluZGV4T2YoYXJyYXksIHZhbHVlLCBmcm9tSW5kZXgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgYWxsIGJ1dCB0aGUgbGFzdCBlbGVtZW50IG9yIGxhc3QgYG5gIGVsZW1lbnRzIG9mIGFuIGFycmF5LiBJZiBhXG4gICAgICogY2FsbGJhY2sgaXMgcHJvdmlkZWQgZWxlbWVudHMgYXQgdGhlIGVuZCBvZiB0aGUgYXJyYXkgYXJlIGV4Y2x1ZGVkIGZyb21cbiAgICAgKiB0aGUgcmVzdWx0IGFzIGxvbmcgYXMgdGhlIGNhbGxiYWNrIHJldHVybnMgdHJ1ZXkuIFRoZSBjYWxsYmFjayBpcyBib3VuZFxuICAgICAqIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50czsgKHZhbHVlLCBpbmRleCwgYXJyYXkpLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHF1ZXJ5LlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fG51bWJlcnxzdHJpbmd9IFtjYWxsYmFjaz0xXSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBlbGVtZW50IG9yIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gZXhjbHVkZS4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yXG4gICAgICogIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWQgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCJcbiAgICAgKiAgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBzbGljZSBvZiBgYXJyYXlgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLmluaXRpYWwoWzEsIDIsIDNdKTtcbiAgICAgKiAvLyA9PiBbMSwgMl1cbiAgICAgKlxuICAgICAqIF8uaW5pdGlhbChbMSwgMiwgM10sIDIpO1xuICAgICAqIC8vID0+IFsxXVxuICAgICAqXG4gICAgICogXy5pbml0aWFsKFsxLCAyLCAzXSwgZnVuY3Rpb24obnVtKSB7XG4gICAgICogICByZXR1cm4gbnVtID4gMTtcbiAgICAgKiB9KTtcbiAgICAgKiAvLyA9PiBbMV1cbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAgJ2Jsb2NrZWQnOiBmYWxzZSwgJ2VtcGxveWVyJzogJ3NsYXRlJyB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAgJ2Jsb2NrZWQnOiB0cnVlLCAgJ2VtcGxveWVyJzogJ3NsYXRlJyB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdwZWJibGVzJywgJ2Jsb2NrZWQnOiB0cnVlLCAgJ2VtcGxveWVyJzogJ25hJyB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8uaW5pdGlhbChjaGFyYWN0ZXJzLCAnYmxvY2tlZCcpO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ2Jhcm5leScsICAnYmxvY2tlZCc6IGZhbHNlLCAnZW1wbG95ZXInOiAnc2xhdGUnIH1dXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ud2hlcmVcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLnBsdWNrKF8uaW5pdGlhbChjaGFyYWN0ZXJzLCB7ICdlbXBsb3llcic6ICduYScgfSksICduYW1lJyk7XG4gICAgICogLy8gPT4gWydiYXJuZXknLCAnZnJlZCddXG4gICAgICovXG4gICAgZnVuY3Rpb24gaW5pdGlhbChhcnJheSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBuID0gMCxcbiAgICAgICAgICBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDA7XG5cbiAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT0gJ251bWJlcicgJiYgY2FsbGJhY2sgIT0gbnVsbCkge1xuICAgICAgICB2YXIgaW5kZXggPSBsZW5ndGg7XG4gICAgICAgIGNhbGxiYWNrID0gbG9kYXNoLmNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgICAgd2hpbGUgKGluZGV4LS0gJiYgY2FsbGJhY2soYXJyYXlbaW5kZXhdLCBpbmRleCwgYXJyYXkpKSB7XG4gICAgICAgICAgbisrO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuID0gKGNhbGxiYWNrID09IG51bGwgfHwgdGhpc0FyZykgPyAxIDogY2FsbGJhY2sgfHwgbjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzbGljZShhcnJheSwgMCwgbmF0aXZlTWluKG5hdGl2ZU1heCgwLCBsZW5ndGggLSBuKSwgbGVuZ3RoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhcnJheSBvZiB1bmlxdWUgdmFsdWVzIHByZXNlbnQgaW4gYWxsIHByb3ZpZGVkIGFycmF5cyB1c2luZ1xuICAgICAqIHN0cmljdCBlcXVhbGl0eSBmb3IgY29tcGFyaXNvbnMsIGkuZS4gYD09PWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHsuLi5BcnJheX0gW2FycmF5XSBUaGUgYXJyYXlzIHRvIGluc3BlY3QuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGFuIGFycmF5IG9mIHNoYXJlZCB2YWx1ZXMuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uaW50ZXJzZWN0aW9uKFsxLCAyLCAzXSwgWzUsIDIsIDEsIDRdLCBbMiwgMV0pO1xuICAgICAqIC8vID0+IFsxLCAyXVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGludGVyc2VjdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gW10sXG4gICAgICAgICAgYXJnc0luZGV4ID0gLTEsXG4gICAgICAgICAgYXJnc0xlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG4gICAgICAgICAgY2FjaGVzID0gZ2V0QXJyYXkoKSxcbiAgICAgICAgICBpbmRleE9mID0gZ2V0SW5kZXhPZigpLFxuICAgICAgICAgIHRydXN0SW5kZXhPZiA9IGluZGV4T2YgPT09IGJhc2VJbmRleE9mLFxuICAgICAgICAgIHNlZW4gPSBnZXRBcnJheSgpO1xuXG4gICAgICB3aGlsZSAoKythcmdzSW5kZXggPCBhcmdzTGVuZ3RoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGFyZ3VtZW50c1thcmdzSW5kZXhdO1xuICAgICAgICBpZiAoaXNBcnJheSh2YWx1ZSkgfHwgaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICAgICAgYXJncy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICBjYWNoZXMucHVzaCh0cnVzdEluZGV4T2YgJiYgdmFsdWUubGVuZ3RoID49IGxhcmdlQXJyYXlTaXplICYmXG4gICAgICAgICAgICBjcmVhdGVDYWNoZShhcmdzSW5kZXggPyBhcmdzW2FyZ3NJbmRleF0gOiBzZWVuKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBhcnJheSA9IGFyZ3NbMF0sXG4gICAgICAgICAgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDAsXG4gICAgICAgICAgcmVzdWx0ID0gW107XG5cbiAgICAgIG91dGVyOlxuICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIGNhY2hlID0gY2FjaGVzWzBdO1xuICAgICAgICB2YWx1ZSA9IGFycmF5W2luZGV4XTtcblxuICAgICAgICBpZiAoKGNhY2hlID8gY2FjaGVJbmRleE9mKGNhY2hlLCB2YWx1ZSkgOiBpbmRleE9mKHNlZW4sIHZhbHVlKSkgPCAwKSB7XG4gICAgICAgICAgYXJnc0luZGV4ID0gYXJnc0xlbmd0aDtcbiAgICAgICAgICAoY2FjaGUgfHwgc2VlbikucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgd2hpbGUgKC0tYXJnc0luZGV4KSB7XG4gICAgICAgICAgICBjYWNoZSA9IGNhY2hlc1thcmdzSW5kZXhdO1xuICAgICAgICAgICAgaWYgKChjYWNoZSA/IGNhY2hlSW5kZXhPZihjYWNoZSwgdmFsdWUpIDogaW5kZXhPZihhcmdzW2FyZ3NJbmRleF0sIHZhbHVlKSkgPCAwKSB7XG4gICAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHdoaWxlIChhcmdzTGVuZ3RoLS0pIHtcbiAgICAgICAgY2FjaGUgPSBjYWNoZXNbYXJnc0xlbmd0aF07XG4gICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgIHJlbGVhc2VPYmplY3QoY2FjaGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZWxlYXNlQXJyYXkoY2FjaGVzKTtcbiAgICAgIHJlbGVhc2VBcnJheShzZWVuKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgbGFzdCBlbGVtZW50IG9yIGxhc3QgYG5gIGVsZW1lbnRzIG9mIGFuIGFycmF5LiBJZiBhIGNhbGxiYWNrIGlzXG4gICAgICogcHJvdmlkZWQgZWxlbWVudHMgYXQgdGhlIGVuZCBvZiB0aGUgYXJyYXkgYXJlIHJldHVybmVkIGFzIGxvbmcgYXMgdGhlXG4gICAgICogY2FsbGJhY2sgcmV0dXJucyB0cnVleS4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZFxuICAgICAqIHdpdGggdGhyZWUgYXJndW1lbnRzOyAodmFsdWUsIGluZGV4LCBhcnJheSkuXG4gICAgICpcbiAgICAgKiBJZiBhIHByb3BlcnR5IG5hbWUgaXMgcHJvdmlkZWQgZm9yIGBjYWxsYmFja2AgdGhlIGNyZWF0ZWQgXCJfLnBsdWNrXCIgc3R5bGVcbiAgICAgKiBjYWxsYmFjayB3aWxsIHJldHVybiB0aGUgcHJvcGVydHkgdmFsdWUgb2YgdGhlIGdpdmVuIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBJZiBhbiBvYmplY3QgaXMgcHJvdmlkZWQgZm9yIGBjYWxsYmFja2AgdGhlIGNyZWF0ZWQgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2tcbiAgICAgKiB3aWxsIHJldHVybiBgdHJ1ZWAgZm9yIGVsZW1lbnRzIHRoYXQgaGF2ZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgZ2l2ZW4gb2JqZWN0LFxuICAgICAqIGVsc2UgYGZhbHNlYC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBBcnJheXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gcXVlcnkuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8bnVtYmVyfHN0cmluZ30gW2NhbGxiYWNrXSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBlbGVtZW50IG9yIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmV0dXJuLiBJZiBhIHByb3BlcnR5IG5hbWUgb3JcbiAgICAgKiAgb2JqZWN0IGlzIHByb3ZpZGVkIGl0IHdpbGwgYmUgdXNlZCB0byBjcmVhdGUgYSBcIl8ucGx1Y2tcIiBvciBcIl8ud2hlcmVcIlxuICAgICAqICBzdHlsZSBjYWxsYmFjaywgcmVzcGVjdGl2ZWx5LlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBsYXN0IGVsZW1lbnQocykgb2YgYGFycmF5YC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5sYXN0KFsxLCAyLCAzXSk7XG4gICAgICogLy8gPT4gM1xuICAgICAqXG4gICAgICogXy5sYXN0KFsxLCAyLCAzXSwgMik7XG4gICAgICogLy8gPT4gWzIsIDNdXG4gICAgICpcbiAgICAgKiBfLmxhc3QoWzEsIDIsIDNdLCBmdW5jdGlvbihudW0pIHtcbiAgICAgKiAgIHJldHVybiBudW0gPiAxO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IFsyLCAzXVxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICAnYmxvY2tlZCc6IGZhbHNlLCAnZW1wbG95ZXInOiAnc2xhdGUnIH0sXG4gICAgICogICB7ICduYW1lJzogJ2ZyZWQnLCAgICAnYmxvY2tlZCc6IHRydWUsICAnZW1wbG95ZXInOiAnc2xhdGUnIH0sXG4gICAgICogICB7ICduYW1lJzogJ3BlYmJsZXMnLCAnYmxvY2tlZCc6IHRydWUsICAnZW1wbG95ZXInOiAnbmEnIH1cbiAgICAgKiBdO1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5wbHVjayhfLmxhc3QoY2hhcmFjdGVycywgJ2Jsb2NrZWQnKSwgJ25hbWUnKTtcbiAgICAgKiAvLyA9PiBbJ2ZyZWQnLCAncGViYmxlcyddXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ud2hlcmVcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLmxhc3QoY2hhcmFjdGVycywgeyAnZW1wbG95ZXInOiAnbmEnIH0pO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ3BlYmJsZXMnLCAnYmxvY2tlZCc6IHRydWUsICdlbXBsb3llcic6ICduYScgfV1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsYXN0KGFycmF5LCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIG4gPSAwLFxuICAgICAgICAgIGxlbmd0aCA9IGFycmF5ID8gYXJyYXkubGVuZ3RoIDogMDtcblxuICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPSAnbnVtYmVyJyAmJiBjYWxsYmFjayAhPSBudWxsKSB7XG4gICAgICAgIHZhciBpbmRleCA9IGxlbmd0aDtcbiAgICAgICAgY2FsbGJhY2sgPSBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDMpO1xuICAgICAgICB3aGlsZSAoaW5kZXgtLSAmJiBjYWxsYmFjayhhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSkpIHtcbiAgICAgICAgICBuKys7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG4gPSBjYWxsYmFjaztcbiAgICAgICAgaWYgKG4gPT0gbnVsbCB8fCB0aGlzQXJnKSB7XG4gICAgICAgICAgcmV0dXJuIGFycmF5ID8gYXJyYXlbbGVuZ3RoIC0gMV0gOiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBzbGljZShhcnJheSwgbmF0aXZlTWF4KDAsIGxlbmd0aCAtIG4pKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBpbmRleCBhdCB3aGljaCB0aGUgbGFzdCBvY2N1cnJlbmNlIG9mIGB2YWx1ZWAgaXMgZm91bmQgdXNpbmcgc3RyaWN0XG4gICAgICogZXF1YWxpdHkgZm9yIGNvbXBhcmlzb25zLCBpLmUuIGA9PT1gLiBJZiBgZnJvbUluZGV4YCBpcyBuZWdhdGl2ZSwgaXQgaXMgdXNlZFxuICAgICAqIGFzIHRoZSBvZmZzZXQgZnJvbSB0aGUgZW5kIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHNlYXJjaC5cbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBzZWFyY2ggZm9yLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbZnJvbUluZGV4PWFycmF5Lmxlbmd0aC0xXSBUaGUgaW5kZXggdG8gc2VhcmNoIGZyb20uXG4gICAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIG1hdGNoZWQgdmFsdWUgb3IgYC0xYC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5sYXN0SW5kZXhPZihbMSwgMiwgMywgMSwgMiwgM10sIDIpO1xuICAgICAqIC8vID0+IDRcbiAgICAgKlxuICAgICAqIF8ubGFzdEluZGV4T2YoWzEsIDIsIDMsIDEsIDIsIDNdLCAyLCAzKTtcbiAgICAgKiAvLyA9PiAxXG4gICAgICovXG4gICAgZnVuY3Rpb24gbGFzdEluZGV4T2YoYXJyYXksIHZhbHVlLCBmcm9tSW5kZXgpIHtcbiAgICAgIHZhciBpbmRleCA9IGFycmF5ID8gYXJyYXkubGVuZ3RoIDogMDtcbiAgICAgIGlmICh0eXBlb2YgZnJvbUluZGV4ID09ICdudW1iZXInKSB7XG4gICAgICAgIGluZGV4ID0gKGZyb21JbmRleCA8IDAgPyBuYXRpdmVNYXgoMCwgaW5kZXggKyBmcm9tSW5kZXgpIDogbmF0aXZlTWluKGZyb21JbmRleCwgaW5kZXggLSAxKSkgKyAxO1xuICAgICAgfVxuICAgICAgd2hpbGUgKGluZGV4LS0pIHtcbiAgICAgICAgaWYgKGFycmF5W2luZGV4XSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gaW5kZXg7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGFsbCBwcm92aWRlZCB2YWx1ZXMgZnJvbSB0aGUgZ2l2ZW4gYXJyYXkgdXNpbmcgc3RyaWN0IGVxdWFsaXR5IGZvclxuICAgICAqIGNvbXBhcmlzb25zLCBpLmUuIGA9PT1gLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEFycmF5c1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBtb2RpZnkuXG4gICAgICogQHBhcmFtIHsuLi4qfSBbdmFsdWVdIFRoZSB2YWx1ZXMgdG8gcmVtb3ZlLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBgYXJyYXlgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgYXJyYXkgPSBbMSwgMiwgMywgMSwgMiwgM107XG4gICAgICogXy5wdWxsKGFycmF5LCAyLCAzKTtcbiAgICAgKiBjb25zb2xlLmxvZyhhcnJheSk7XG4gICAgICogLy8gPT4gWzEsIDFdXG4gICAgICovXG4gICAgZnVuY3Rpb24gcHVsbChhcnJheSkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHMsXG4gICAgICAgICAgYXJnc0luZGV4ID0gMCxcbiAgICAgICAgICBhcmdzTGVuZ3RoID0gYXJncy5sZW5ndGgsXG4gICAgICAgICAgbGVuZ3RoID0gYXJyYXkgPyBhcnJheS5sZW5ndGggOiAwO1xuXG4gICAgICB3aGlsZSAoKythcmdzSW5kZXggPCBhcmdzTGVuZ3RoKSB7XG4gICAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgICAgdmFsdWUgPSBhcmdzW2FyZ3NJbmRleF07XG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKGFycmF5W2luZGV4XSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHNwbGljZS5jYWxsKGFycmF5LCBpbmRleC0tLCAxKTtcbiAgICAgICAgICAgIGxlbmd0aC0tO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGFycmF5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgbnVtYmVycyAocG9zaXRpdmUgYW5kL29yIG5lZ2F0aXZlKSBwcm9ncmVzc2luZyBmcm9tXG4gICAgICogYHN0YXJ0YCB1cCB0byBidXQgbm90IGluY2x1ZGluZyBgZW5kYC4gSWYgYHN0YXJ0YCBpcyBsZXNzIHRoYW4gYHN0b3BgIGFcbiAgICAgKiB6ZXJvLWxlbmd0aCByYW5nZSBpcyBjcmVhdGVkIHVubGVzcyBhIG5lZ2F0aXZlIGBzdGVwYCBpcyBzcGVjaWZpZWQuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtzdGFydD0wXSBUaGUgc3RhcnQgb2YgdGhlIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgVGhlIGVuZCBvZiB0aGUgcmFuZ2UuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtzdGVwPTFdIFRoZSB2YWx1ZSB0byBpbmNyZW1lbnQgb3IgZGVjcmVtZW50IGJ5LlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhIG5ldyByYW5nZSBhcnJheS5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5yYW5nZSg0KTtcbiAgICAgKiAvLyA9PiBbMCwgMSwgMiwgM11cbiAgICAgKlxuICAgICAqIF8ucmFuZ2UoMSwgNSk7XG4gICAgICogLy8gPT4gWzEsIDIsIDMsIDRdXG4gICAgICpcbiAgICAgKiBfLnJhbmdlKDAsIDIwLCA1KTtcbiAgICAgKiAvLyA9PiBbMCwgNSwgMTAsIDE1XVxuICAgICAqXG4gICAgICogXy5yYW5nZSgwLCAtNCwgLTEpO1xuICAgICAqIC8vID0+IFswLCAtMSwgLTIsIC0zXVxuICAgICAqXG4gICAgICogXy5yYW5nZSgxLCA0LCAwKTtcbiAgICAgKiAvLyA9PiBbMSwgMSwgMV1cbiAgICAgKlxuICAgICAqIF8ucmFuZ2UoMCk7XG4gICAgICogLy8gPT4gW11cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByYW5nZShzdGFydCwgZW5kLCBzdGVwKSB7XG4gICAgICBzdGFydCA9ICtzdGFydCB8fCAwO1xuICAgICAgc3RlcCA9IHR5cGVvZiBzdGVwID09ICdudW1iZXInID8gc3RlcCA6ICgrc3RlcCB8fCAxKTtcblxuICAgICAgaWYgKGVuZCA9PSBudWxsKSB7XG4gICAgICAgIGVuZCA9IHN0YXJ0O1xuICAgICAgICBzdGFydCA9IDA7XG4gICAgICB9XG4gICAgICAvLyB1c2UgYEFycmF5KGxlbmd0aClgIHNvIGVuZ2luZXMgbGlrZSBDaGFrcmEgYW5kIFY4IGF2b2lkIHNsb3dlciBtb2Rlc1xuICAgICAgLy8gaHR0cDovL3lvdXR1LmJlL1hBcUlwR1U4WlprI3Q9MTdtMjVzXG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBuYXRpdmVNYXgoMCwgY2VpbCgoZW5kIC0gc3RhcnQpIC8gKHN0ZXAgfHwgMSkpKSxcbiAgICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICByZXN1bHRbaW5kZXhdID0gc3RhcnQ7XG4gICAgICAgIHN0YXJ0ICs9IHN0ZXA7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYWxsIGVsZW1lbnRzIGZyb20gYW4gYXJyYXkgdGhhdCB0aGUgY2FsbGJhY2sgcmV0dXJucyB0cnVleSBmb3JcbiAgICAgKiBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiByZW1vdmVkIGVsZW1lbnRzLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgXG4gICAgICogYW5kIGludm9rZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXgsIGFycmF5KS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEFycmF5c1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBtb2RpZnkuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWRcbiAgICAgKiAgcGVyIGl0ZXJhdGlvbi4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWRcbiAgICAgKiAgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBuZXcgYXJyYXkgb2YgcmVtb3ZlZCBlbGVtZW50cy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGFycmF5ID0gWzEsIDIsIDMsIDQsIDUsIDZdO1xuICAgICAqIHZhciBldmVucyA9IF8ucmVtb3ZlKGFycmF5LCBmdW5jdGlvbihudW0pIHsgcmV0dXJuIG51bSAlIDIgPT0gMDsgfSk7XG4gICAgICpcbiAgICAgKiBjb25zb2xlLmxvZyhhcnJheSk7XG4gICAgICogLy8gPT4gWzEsIDMsIDVdXG4gICAgICpcbiAgICAgKiBjb25zb2xlLmxvZyhldmVucyk7XG4gICAgICogLy8gPT4gWzIsIDQsIDZdXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVtb3ZlKGFycmF5LCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgbGVuZ3RoID0gYXJyYXkgPyBhcnJheS5sZW5ndGggOiAwLFxuICAgICAgICAgIHJlc3VsdCA9IFtdO1xuXG4gICAgICBjYWxsYmFjayA9IGxvZGFzaC5jcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBhcnJheVtpbmRleF07XG4gICAgICAgIGlmIChjYWxsYmFjayh2YWx1ZSwgaW5kZXgsIGFycmF5KSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgICAgICBzcGxpY2UuY2FsbChhcnJheSwgaW5kZXgtLSwgMSk7XG4gICAgICAgICAgbGVuZ3RoLS07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIG9wcG9zaXRlIG9mIGBfLmluaXRpYWxgIHRoaXMgbWV0aG9kIGdldHMgYWxsIGJ1dCB0aGUgZmlyc3QgZWxlbWVudCBvclxuICAgICAqIGZpcnN0IGBuYCBlbGVtZW50cyBvZiBhbiBhcnJheS4gSWYgYSBjYWxsYmFjayBmdW5jdGlvbiBpcyBwcm92aWRlZCBlbGVtZW50c1xuICAgICAqIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGFycmF5IGFyZSBleGNsdWRlZCBmcm9tIHRoZSByZXN1bHQgYXMgbG9uZyBhcyB0aGVcbiAgICAgKiBjYWxsYmFjayByZXR1cm5zIHRydWV5LiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkXG4gICAgICogd2l0aCB0aHJlZSBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXgsIGFycmF5KS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIGRyb3AsIHRhaWxcbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHF1ZXJ5LlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fG51bWJlcnxzdHJpbmd9IFtjYWxsYmFjaz0xXSBUaGUgZnVuY3Rpb24gY2FsbGVkXG4gICAgICogIHBlciBlbGVtZW50IG9yIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gZXhjbHVkZS4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yXG4gICAgICogIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWQgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCJcbiAgICAgKiAgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBzbGljZSBvZiBgYXJyYXlgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnJlc3QoWzEsIDIsIDNdKTtcbiAgICAgKiAvLyA9PiBbMiwgM11cbiAgICAgKlxuICAgICAqIF8ucmVzdChbMSwgMiwgM10sIDIpO1xuICAgICAqIC8vID0+IFszXVxuICAgICAqXG4gICAgICogXy5yZXN0KFsxLCAyLCAzXSwgZnVuY3Rpb24obnVtKSB7XG4gICAgICogICByZXR1cm4gbnVtIDwgMztcbiAgICAgKiB9KTtcbiAgICAgKiAvLyA9PiBbM11cbiAgICAgKlxuICAgICAqIHZhciBjaGFyYWN0ZXJzID0gW1xuICAgICAqICAgeyAnbmFtZSc6ICdiYXJuZXknLCAgJ2Jsb2NrZWQnOiB0cnVlLCAgJ2VtcGxveWVyJzogJ3NsYXRlJyB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAgJ2Jsb2NrZWQnOiBmYWxzZSwgICdlbXBsb3llcic6ICdzbGF0ZScgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAncGViYmxlcycsICdibG9ja2VkJzogdHJ1ZSwgJ2VtcGxveWVyJzogJ25hJyB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIFwiXy5wbHVja1wiIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgICAqIF8ucGx1Y2soXy5yZXN0KGNoYXJhY3RlcnMsICdibG9ja2VkJyksICduYW1lJyk7XG4gICAgICogLy8gPT4gWydmcmVkJywgJ3BlYmJsZXMnXVxuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLndoZXJlXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5yZXN0KGNoYXJhY3RlcnMsIHsgJ2VtcGxveWVyJzogJ3NsYXRlJyB9KTtcbiAgICAgKiAvLyA9PiBbeyAnbmFtZSc6ICdwZWJibGVzJywgJ2Jsb2NrZWQnOiB0cnVlLCAnZW1wbG95ZXInOiAnbmEnIH1dXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVzdChhcnJheSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT0gJ251bWJlcicgJiYgY2FsbGJhY2sgIT0gbnVsbCkge1xuICAgICAgICB2YXIgbiA9IDAsXG4gICAgICAgICAgICBpbmRleCA9IC0xLFxuICAgICAgICAgICAgbGVuZ3RoID0gYXJyYXkgPyBhcnJheS5sZW5ndGggOiAwO1xuXG4gICAgICAgIGNhbGxiYWNrID0gbG9kYXNoLmNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGggJiYgY2FsbGJhY2soYXJyYXlbaW5kZXhdLCBpbmRleCwgYXJyYXkpKSB7XG4gICAgICAgICAgbisrO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuID0gKGNhbGxiYWNrID09IG51bGwgfHwgdGhpc0FyZykgPyAxIDogbmF0aXZlTWF4KDAsIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzbGljZShhcnJheSwgbik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXNlcyBhIGJpbmFyeSBzZWFyY2ggdG8gZGV0ZXJtaW5lIHRoZSBzbWFsbGVzdCBpbmRleCBhdCB3aGljaCBhIHZhbHVlXG4gICAgICogc2hvdWxkIGJlIGluc2VydGVkIGludG8gYSBnaXZlbiBzb3J0ZWQgYXJyYXkgaW4gb3JkZXIgdG8gbWFpbnRhaW4gdGhlIHNvcnRcbiAgICAgKiBvcmRlciBvZiB0aGUgYXJyYXkuIElmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQgaXQgd2lsbCBiZSBleGVjdXRlZCBmb3JcbiAgICAgKiBgdmFsdWVgIGFuZCBlYWNoIGVsZW1lbnQgb2YgYGFycmF5YCB0byBjb21wdXRlIHRoZWlyIHNvcnQgcmFua2luZy4gVGhlXG4gICAgICogY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggb25lIGFyZ3VtZW50OyAodmFsdWUpLlxuICAgICAqXG4gICAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy5wbHVja1wiIHN0eWxlXG4gICAgICogY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgY2FsbGJhY2tgIHRoZSBjcmVhdGVkIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrXG4gICAgICogd2lsbCByZXR1cm4gYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuIG9iamVjdCxcbiAgICAgKiBlbHNlIGBmYWxzZWAuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGluc3BlY3QuXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gZXZhbHVhdGUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWRcbiAgICAgKiAgcGVyIGl0ZXJhdGlvbi4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWRcbiAgICAgKiAgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSBpbmRleCBhdCB3aGljaCBgdmFsdWVgIHNob3VsZCBiZSBpbnNlcnRlZFxuICAgICAqICBpbnRvIGBhcnJheWAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uc29ydGVkSW5kZXgoWzIwLCAzMCwgNTBdLCA0MCk7XG4gICAgICogLy8gPT4gMlxuICAgICAqXG4gICAgICogLy8gdXNpbmcgXCJfLnBsdWNrXCIgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAgICogXy5zb3J0ZWRJbmRleChbeyAneCc6IDIwIH0sIHsgJ3gnOiAzMCB9LCB7ICd4JzogNTAgfV0sIHsgJ3gnOiA0MCB9LCAneCcpO1xuICAgICAqIC8vID0+IDJcbiAgICAgKlxuICAgICAqIHZhciBkaWN0ID0ge1xuICAgICAqICAgJ3dvcmRUb051bWJlcic6IHsgJ3R3ZW50eSc6IDIwLCAndGhpcnR5JzogMzAsICdmb3VydHknOiA0MCwgJ2ZpZnR5JzogNTAgfVxuICAgICAqIH07XG4gICAgICpcbiAgICAgKiBfLnNvcnRlZEluZGV4KFsndHdlbnR5JywgJ3RoaXJ0eScsICdmaWZ0eSddLCAnZm91cnR5JywgZnVuY3Rpb24od29yZCkge1xuICAgICAqICAgcmV0dXJuIGRpY3Qud29yZFRvTnVtYmVyW3dvcmRdO1xuICAgICAqIH0pO1xuICAgICAqIC8vID0+IDJcbiAgICAgKlxuICAgICAqIF8uc29ydGVkSW5kZXgoWyd0d2VudHknLCAndGhpcnR5JywgJ2ZpZnR5J10sICdmb3VydHknLCBmdW5jdGlvbih3b3JkKSB7XG4gICAgICogICByZXR1cm4gdGhpcy53b3JkVG9OdW1iZXJbd29yZF07XG4gICAgICogfSwgZGljdCk7XG4gICAgICogLy8gPT4gMlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNvcnRlZEluZGV4KGFycmF5LCB2YWx1ZSwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgIHZhciBsb3cgPSAwLFxuICAgICAgICAgIGhpZ2ggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IGxvdztcblxuICAgICAgLy8gZXhwbGljaXRseSByZWZlcmVuY2UgYGlkZW50aXR5YCBmb3IgYmV0dGVyIGlubGluaW5nIGluIEZpcmVmb3hcbiAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgPyBsb2Rhc2guY3JlYXRlQ2FsbGJhY2soY2FsbGJhY2ssIHRoaXNBcmcsIDEpIDogaWRlbnRpdHk7XG4gICAgICB2YWx1ZSA9IGNhbGxiYWNrKHZhbHVlKTtcblxuICAgICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgICAgdmFyIG1pZCA9IChsb3cgKyBoaWdoKSA+Pj4gMTtcbiAgICAgICAgKGNhbGxiYWNrKGFycmF5W21pZF0pIDwgdmFsdWUpXG4gICAgICAgICAgPyBsb3cgPSBtaWQgKyAxXG4gICAgICAgICAgOiBoaWdoID0gbWlkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxvdztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IG9mIHVuaXF1ZSB2YWx1ZXMsIGluIG9yZGVyLCBvZiB0aGUgcHJvdmlkZWQgYXJyYXlzIHVzaW5nXG4gICAgICogc3RyaWN0IGVxdWFsaXR5IGZvciBjb21wYXJpc29ucywgaS5lLiBgPT09YC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBBcnJheXNcbiAgICAgKiBAcGFyYW0gey4uLkFycmF5fSBbYXJyYXldIFRoZSBhcnJheXMgdG8gaW5zcGVjdC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYW4gYXJyYXkgb2YgY29tYmluZWQgdmFsdWVzLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnVuaW9uKFsxLCAyLCAzXSwgWzUsIDIsIDEsIDRdLCBbMiwgMV0pO1xuICAgICAqIC8vID0+IFsxLCAyLCAzLCA1LCA0XVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVuaW9uKCkge1xuICAgICAgcmV0dXJuIGJhc2VVbmlxKGJhc2VGbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSwgdHJ1ZSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBkdXBsaWNhdGUtdmFsdWUtZnJlZSB2ZXJzaW9uIG9mIGFuIGFycmF5IHVzaW5nIHN0cmljdCBlcXVhbGl0eVxuICAgICAqIGZvciBjb21wYXJpc29ucywgaS5lLiBgPT09YC4gSWYgdGhlIGFycmF5IGlzIHNvcnRlZCwgcHJvdmlkaW5nXG4gICAgICogYHRydWVgIGZvciBgaXNTb3J0ZWRgIHdpbGwgdXNlIGEgZmFzdGVyIGFsZ29yaXRobS4gSWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZFxuICAgICAqIGVhY2ggZWxlbWVudCBvZiBgYXJyYXlgIGlzIHBhc3NlZCB0aHJvdWdoIHRoZSBjYWxsYmFjayBiZWZvcmUgdW5pcXVlbmVzc1xuICAgICAqIGlzIGNvbXB1dGVkLiBUaGUgY2FsbGJhY2sgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWVcbiAgICAgKiBhcmd1bWVudHM7ICh2YWx1ZSwgaW5kZXgsIGFycmF5KS5cbiAgICAgKlxuICAgICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ucGx1Y2tcIiBzdHlsZVxuICAgICAqIGNhbGxiYWNrIHdpbGwgcmV0dXJuIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGNhbGxiYWNrYCB0aGUgY3JlYXRlZCBcIl8ud2hlcmVcIiBzdHlsZSBjYWxsYmFja1xuICAgICAqIHdpbGwgcmV0dXJuIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlbiBvYmplY3QsXG4gICAgICogZWxzZSBgZmFsc2VgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIHVuaXF1ZVxuICAgICAqIEBjYXRlZ29yeSBBcnJheXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gcHJvY2Vzcy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtpc1NvcnRlZD1mYWxzZV0gQSBmbGFnIHRvIGluZGljYXRlIHRoYXQgYGFycmF5YCBpcyBzb3J0ZWQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWRcbiAgICAgKiAgcGVyIGl0ZXJhdGlvbi4gSWYgYSBwcm9wZXJ0eSBuYW1lIG9yIG9iamVjdCBpcyBwcm92aWRlZCBpdCB3aWxsIGJlIHVzZWRcbiAgICAgKiAgdG8gY3JlYXRlIGEgXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2ssIHJlc3BlY3RpdmVseS5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGNhbGxiYWNrYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYSBkdXBsaWNhdGUtdmFsdWUtZnJlZSBhcnJheS5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy51bmlxKFsxLCAyLCAxLCAzLCAxXSk7XG4gICAgICogLy8gPT4gWzEsIDIsIDNdXG4gICAgICpcbiAgICAgKiBfLnVuaXEoWzEsIDEsIDIsIDIsIDNdLCB0cnVlKTtcbiAgICAgKiAvLyA9PiBbMSwgMiwgM11cbiAgICAgKlxuICAgICAqIF8udW5pcShbJ0EnLCAnYicsICdDJywgJ2EnLCAnQicsICdjJ10sIGZ1bmN0aW9uKGxldHRlcikgeyByZXR1cm4gbGV0dGVyLnRvTG93ZXJDYXNlKCk7IH0pO1xuICAgICAqIC8vID0+IFsnQScsICdiJywgJ0MnXVxuICAgICAqXG4gICAgICogXy51bmlxKFsxLCAyLjUsIDMsIDEuNSwgMiwgMy41XSwgZnVuY3Rpb24obnVtKSB7IHJldHVybiB0aGlzLmZsb29yKG51bSk7IH0sIE1hdGgpO1xuICAgICAqIC8vID0+IFsxLCAyLjUsIDNdXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyBcIl8ucGx1Y2tcIiBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICAgKiBfLnVuaXEoW3sgJ3gnOiAxIH0sIHsgJ3gnOiAyIH0sIHsgJ3gnOiAxIH1dLCAneCcpO1xuICAgICAqIC8vID0+IFt7ICd4JzogMSB9LCB7ICd4JzogMiB9XVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVuaXEoYXJyYXksIGlzU29ydGVkLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgLy8ganVnZ2xlIGFyZ3VtZW50c1xuICAgICAgaWYgKHR5cGVvZiBpc1NvcnRlZCAhPSAnYm9vbGVhbicgJiYgaXNTb3J0ZWQgIT0gbnVsbCkge1xuICAgICAgICB0aGlzQXJnID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrID0gKHR5cGVvZiBpc1NvcnRlZCAhPSAnZnVuY3Rpb24nICYmIHRoaXNBcmcgJiYgdGhpc0FyZ1tpc1NvcnRlZF0gPT09IGFycmF5KSA/IG51bGwgOiBpc1NvcnRlZDtcbiAgICAgICAgaXNTb3J0ZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsKSB7XG4gICAgICAgIGNhbGxiYWNrID0gbG9kYXNoLmNyZWF0ZUNhbGxiYWNrKGNhbGxiYWNrLCB0aGlzQXJnLCAzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBiYXNlVW5pcShhcnJheSwgaXNTb3J0ZWQsIGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IGV4Y2x1ZGluZyBhbGwgcHJvdmlkZWQgdmFsdWVzIHVzaW5nIHN0cmljdCBlcXVhbGl0eSBmb3JcbiAgICAgKiBjb21wYXJpc29ucywgaS5lLiBgPT09YC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBBcnJheXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gZmlsdGVyLlxuICAgICAqIEBwYXJhbSB7Li4uKn0gW3ZhbHVlXSBUaGUgdmFsdWVzIHRvIGV4Y2x1ZGUuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGEgbmV3IGFycmF5IG9mIGZpbHRlcmVkIHZhbHVlcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy53aXRob3V0KFsxLCAyLCAxLCAwLCAzLCAxLCA0XSwgMCwgMSk7XG4gICAgICogLy8gPT4gWzIsIDMsIDRdXG4gICAgICovXG4gICAgZnVuY3Rpb24gd2l0aG91dChhcnJheSkge1xuICAgICAgcmV0dXJuIGJhc2VEaWZmZXJlbmNlKGFycmF5LCBzbGljZShhcmd1bWVudHMsIDEpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFycmF5IHRoYXQgaXMgdGhlIHN5bW1ldHJpYyBkaWZmZXJlbmNlIG9mIHRoZSBwcm92aWRlZCBhcnJheXMuXG4gICAgICogU2VlIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvU3ltbWV0cmljX2RpZmZlcmVuY2UuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQXJyYXlzXG4gICAgICogQHBhcmFtIHsuLi5BcnJheX0gW2FycmF5XSBUaGUgYXJyYXlzIHRvIGluc3BlY3QuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGFuIGFycmF5IG9mIHZhbHVlcy5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy54b3IoWzEsIDIsIDNdLCBbNSwgMiwgMSwgNF0pO1xuICAgICAqIC8vID0+IFszLCA1LCA0XVxuICAgICAqXG4gICAgICogXy54b3IoWzEsIDIsIDVdLCBbMiwgMywgNV0sIFszLCA0LCA1XSk7XG4gICAgICogLy8gPT4gWzEsIDQsIDVdXG4gICAgICovXG4gICAgZnVuY3Rpb24geG9yKCkge1xuICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcblxuICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIGFycmF5ID0gYXJndW1lbnRzW2luZGV4XTtcbiAgICAgICAgaWYgKGlzQXJyYXkoYXJyYXkpIHx8IGlzQXJndW1lbnRzKGFycmF5KSkge1xuICAgICAgICAgIHZhciByZXN1bHQgPSByZXN1bHRcbiAgICAgICAgICAgID8gYmFzZVVuaXEoYmFzZURpZmZlcmVuY2UocmVzdWx0LCBhcnJheSkuY29uY2F0KGJhc2VEaWZmZXJlbmNlKGFycmF5LCByZXN1bHQpKSlcbiAgICAgICAgICAgIDogYXJyYXk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQgfHwgW107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhcnJheSBvZiBncm91cGVkIGVsZW1lbnRzLCB0aGUgZmlyc3Qgb2Ygd2hpY2ggY29udGFpbnMgdGhlIGZpcnN0XG4gICAgICogZWxlbWVudHMgb2YgdGhlIGdpdmVuIGFycmF5cywgdGhlIHNlY29uZCBvZiB3aGljaCBjb250YWlucyB0aGUgc2Vjb25kXG4gICAgICogZWxlbWVudHMgb2YgdGhlIGdpdmVuIGFycmF5cywgYW5kIHNvIG9uLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGFsaWFzIHVuemlwXG4gICAgICogQGNhdGVnb3J5IEFycmF5c1xuICAgICAqIEBwYXJhbSB7Li4uQXJyYXl9IFthcnJheV0gQXJyYXlzIHRvIHByb2Nlc3MuXG4gICAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGEgbmV3IGFycmF5IG9mIGdyb3VwZWQgZWxlbWVudHMuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uemlwKFsnZnJlZCcsICdiYXJuZXknXSwgWzMwLCA0MF0sIFt0cnVlLCBmYWxzZV0pO1xuICAgICAqIC8vID0+IFtbJ2ZyZWQnLCAzMCwgdHJ1ZV0sIFsnYmFybmV5JywgNDAsIGZhbHNlXV1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB6aXAoKSB7XG4gICAgICB2YXIgYXJyYXkgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50cyA6IGFyZ3VtZW50c1swXSxcbiAgICAgICAgICBpbmRleCA9IC0xLFxuICAgICAgICAgIGxlbmd0aCA9IGFycmF5ID8gbWF4KHBsdWNrKGFycmF5LCAnbGVuZ3RoJykpIDogMCxcbiAgICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGggPCAwID8gMCA6IGxlbmd0aCk7XG5cbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdFtpbmRleF0gPSBwbHVjayhhcnJheSwgaW5kZXgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIG9iamVjdCBjb21wb3NlZCBmcm9tIGFycmF5cyBvZiBga2V5c2AgYW5kIGB2YWx1ZXNgLiBQcm92aWRlXG4gICAgICogZWl0aGVyIGEgc2luZ2xlIHR3byBkaW1lbnNpb25hbCBhcnJheSwgaS5lLiBgW1trZXkxLCB2YWx1ZTFdLCBba2V5MiwgdmFsdWUyXV1gXG4gICAgICogb3IgdHdvIGFycmF5cywgb25lIG9mIGBrZXlzYCBhbmQgb25lIG9mIGNvcnJlc3BvbmRpbmcgYHZhbHVlc2AuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAYWxpYXMgb2JqZWN0XG4gICAgICogQGNhdGVnb3J5IEFycmF5c1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGtleXMgVGhlIGFycmF5IG9mIGtleXMuXG4gICAgICogQHBhcmFtIHtBcnJheX0gW3ZhbHVlcz1bXV0gVGhlIGFycmF5IG9mIHZhbHVlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGFuIG9iamVjdCBjb21wb3NlZCBvZiB0aGUgZ2l2ZW4ga2V5cyBhbmRcbiAgICAgKiAgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uemlwT2JqZWN0KFsnZnJlZCcsICdiYXJuZXknXSwgWzMwLCA0MF0pO1xuICAgICAqIC8vID0+IHsgJ2ZyZWQnOiAzMCwgJ2Jhcm5leSc6IDQwIH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB6aXBPYmplY3Qoa2V5cywgdmFsdWVzKSB7XG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBrZXlzID8ga2V5cy5sZW5ndGggOiAwLFxuICAgICAgICAgIHJlc3VsdCA9IHt9O1xuXG4gICAgICBpZiAoIXZhbHVlcyAmJiBsZW5ndGggJiYgIWlzQXJyYXkoa2V5c1swXSkpIHtcbiAgICAgICAgdmFsdWVzID0gW107XG4gICAgICB9XG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tpbmRleF07XG4gICAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgICByZXN1bHRba2V5XSA9IHZhbHVlc1tpbmRleF07XG4gICAgICAgIH0gZWxzZSBpZiAoa2V5KSB7XG4gICAgICAgICAgcmVzdWx0W2tleVswXV0gPSBrZXlbMV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCBleGVjdXRlcyBgZnVuY2AsIHdpdGggIHRoZSBgdGhpc2AgYmluZGluZyBhbmRcbiAgICAgKiBhcmd1bWVudHMgb2YgdGhlIGNyZWF0ZWQgZnVuY3Rpb24sIG9ubHkgYWZ0ZXIgYmVpbmcgY2FsbGVkIGBuYCB0aW1lcy5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBGdW5jdGlvbnNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbiBUaGUgbnVtYmVyIG9mIHRpbWVzIHRoZSBmdW5jdGlvbiBtdXN0IGJlIGNhbGxlZCBiZWZvcmVcbiAgICAgKiAgYGZ1bmNgIGlzIGV4ZWN1dGVkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIHJlc3RyaWN0LlxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IHJlc3RyaWN0ZWQgZnVuY3Rpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBzYXZlcyA9IFsncHJvZmlsZScsICdzZXR0aW5ncyddO1xuICAgICAqXG4gICAgICogdmFyIGRvbmUgPSBfLmFmdGVyKHNhdmVzLmxlbmd0aCwgZnVuY3Rpb24oKSB7XG4gICAgICogICBjb25zb2xlLmxvZygnRG9uZSBzYXZpbmchJyk7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBfLmZvckVhY2goc2F2ZXMsIGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgKiAgIGFzeW5jU2F2ZSh7ICd0eXBlJzogdHlwZSwgJ2NvbXBsZXRlJzogZG9uZSB9KTtcbiAgICAgKiB9KTtcbiAgICAgKiAvLyA9PiBsb2dzICdEb25lIHNhdmluZyEnLCBhZnRlciBhbGwgc2F2ZXMgaGF2ZSBjb21wbGV0ZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBhZnRlcihuLCBmdW5jKSB7XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oZnVuYykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKC0tbiA8IDEpIHtcbiAgICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCwgaW52b2tlcyBgZnVuY2Agd2l0aCB0aGUgYHRoaXNgXG4gICAgICogYmluZGluZyBvZiBgdGhpc0FyZ2AgYW5kIHByZXBlbmRzIGFueSBhZGRpdGlvbmFsIGBiaW5kYCBhcmd1bWVudHMgdG8gdGhvc2VcbiAgICAgKiBwcm92aWRlZCB0byB0aGUgYm91bmQgZnVuY3Rpb24uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gYmluZC5cbiAgICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGZ1bmNgLlxuICAgICAqIEBwYXJhbSB7Li4uKn0gW2FyZ10gQXJndW1lbnRzIHRvIGJlIHBhcnRpYWxseSBhcHBsaWVkLlxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGJvdW5kIGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgZnVuYyA9IGZ1bmN0aW9uKGdyZWV0aW5nKSB7XG4gICAgICogICByZXR1cm4gZ3JlZXRpbmcgKyAnICcgKyB0aGlzLm5hbWU7XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIGZ1bmMgPSBfLmJpbmQoZnVuYywgeyAnbmFtZSc6ICdmcmVkJyB9LCAnaGknKTtcbiAgICAgKiBmdW5jKCk7XG4gICAgICogLy8gPT4gJ2hpIGZyZWQnXG4gICAgICovXG4gICAgZnVuY3Rpb24gYmluZChmdW5jLCB0aGlzQXJnKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDJcbiAgICAgICAgPyBjcmVhdGVXcmFwcGVyKGZ1bmMsIDE3LCBzbGljZShhcmd1bWVudHMsIDIpLCBudWxsLCB0aGlzQXJnKVxuICAgICAgICA6IGNyZWF0ZVdyYXBwZXIoZnVuYywgMSwgbnVsbCwgbnVsbCwgdGhpc0FyZyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQmluZHMgbWV0aG9kcyBvZiBhbiBvYmplY3QgdG8gdGhlIG9iamVjdCBpdHNlbGYsIG92ZXJ3cml0aW5nIHRoZSBleGlzdGluZ1xuICAgICAqIG1ldGhvZC4gTWV0aG9kIG5hbWVzIG1heSBiZSBzcGVjaWZpZWQgYXMgaW5kaXZpZHVhbCBhcmd1bWVudHMgb3IgYXMgYXJyYXlzXG4gICAgICogb2YgbWV0aG9kIG5hbWVzLiBJZiBubyBtZXRob2QgbmFtZXMgYXJlIHByb3ZpZGVkIGFsbCB0aGUgZnVuY3Rpb24gcHJvcGVydGllc1xuICAgICAqIG9mIGBvYmplY3RgIHdpbGwgYmUgYm91bmQuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGJpbmQgYW5kIGFzc2lnbiB0aGUgYm91bmQgbWV0aG9kcyB0by5cbiAgICAgKiBAcGFyYW0gey4uLnN0cmluZ30gW21ldGhvZE5hbWVdIFRoZSBvYmplY3QgbWV0aG9kIG5hbWVzIHRvXG4gICAgICogIGJpbmQsIHNwZWNpZmllZCBhcyBpbmRpdmlkdWFsIG1ldGhvZCBuYW1lcyBvciBhcnJheXMgb2YgbWV0aG9kIG5hbWVzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYG9iamVjdGAuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciB2aWV3ID0ge1xuICAgICAqICAgJ2xhYmVsJzogJ2RvY3MnLFxuICAgICAqICAgJ29uQ2xpY2snOiBmdW5jdGlvbigpIHsgY29uc29sZS5sb2coJ2NsaWNrZWQgJyArIHRoaXMubGFiZWwpOyB9XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIF8uYmluZEFsbCh2aWV3KTtcbiAgICAgKiBqUXVlcnkoJyNkb2NzJykub24oJ2NsaWNrJywgdmlldy5vbkNsaWNrKTtcbiAgICAgKiAvLyA9PiBsb2dzICdjbGlja2VkIGRvY3MnLCB3aGVuIHRoZSBidXR0b24gaXMgY2xpY2tlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGJpbmRBbGwob2JqZWN0KSB7XG4gICAgICB2YXIgZnVuY3MgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGJhc2VGbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSwgZmFsc2UsIDEpIDogZnVuY3Rpb25zKG9iamVjdCksXG4gICAgICAgICAgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBmdW5jcy5sZW5ndGg7XG5cbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciBrZXkgPSBmdW5jc1tpbmRleF07XG4gICAgICAgIG9iamVjdFtrZXldID0gY3JlYXRlV3JhcHBlcihvYmplY3Rba2V5XSwgMSwgbnVsbCwgbnVsbCwgb2JqZWN0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQsIHdoZW4gY2FsbGVkLCBpbnZva2VzIHRoZSBtZXRob2QgYXQgYG9iamVjdFtrZXldYFxuICAgICAqIGFuZCBwcmVwZW5kcyBhbnkgYWRkaXRpb25hbCBgYmluZEtleWAgYXJndW1lbnRzIHRvIHRob3NlIHByb3ZpZGVkIHRvIHRoZSBib3VuZFxuICAgICAqIGZ1bmN0aW9uLiBUaGlzIG1ldGhvZCBkaWZmZXJzIGZyb20gYF8uYmluZGAgYnkgYWxsb3dpbmcgYm91bmQgZnVuY3Rpb25zIHRvXG4gICAgICogcmVmZXJlbmNlIG1ldGhvZHMgdGhhdCB3aWxsIGJlIHJlZGVmaW5lZCBvciBkb24ndCB5ZXQgZXhpc3QuXG4gICAgICogU2VlIGh0dHA6Ly9taWNoYXV4LmNhL2FydGljbGVzL2xhenktZnVuY3Rpb24tZGVmaW5pdGlvbi1wYXR0ZXJuLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEZ1bmN0aW9uc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0aGUgbWV0aG9kIGJlbG9uZ3MgdG8uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBtZXRob2QuXG4gICAgICogQHBhcmFtIHsuLi4qfSBbYXJnXSBBcmd1bWVudHMgdG8gYmUgcGFydGlhbGx5IGFwcGxpZWQuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYm91bmQgZnVuY3Rpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBvYmplY3QgPSB7XG4gICAgICogICAnbmFtZSc6ICdmcmVkJyxcbiAgICAgKiAgICdncmVldCc6IGZ1bmN0aW9uKGdyZWV0aW5nKSB7XG4gICAgICogICAgIHJldHVybiBncmVldGluZyArICcgJyArIHRoaXMubmFtZTtcbiAgICAgKiAgIH1cbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogdmFyIGZ1bmMgPSBfLmJpbmRLZXkob2JqZWN0LCAnZ3JlZXQnLCAnaGknKTtcbiAgICAgKiBmdW5jKCk7XG4gICAgICogLy8gPT4gJ2hpIGZyZWQnXG4gICAgICpcbiAgICAgKiBvYmplY3QuZ3JlZXQgPSBmdW5jdGlvbihncmVldGluZykge1xuICAgICAqICAgcmV0dXJuIGdyZWV0aW5nICsgJ3lhICcgKyB0aGlzLm5hbWUgKyAnISc7XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIGZ1bmMoKTtcbiAgICAgKiAvLyA9PiAnaGl5YSBmcmVkISdcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBiaW5kS2V5KG9iamVjdCwga2V5KSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDJcbiAgICAgICAgPyBjcmVhdGVXcmFwcGVyKGtleSwgMTksIHNsaWNlKGFyZ3VtZW50cywgMiksIG51bGwsIG9iamVjdClcbiAgICAgICAgOiBjcmVhdGVXcmFwcGVyKGtleSwgMywgbnVsbCwgbnVsbCwgb2JqZWN0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCBpcyB0aGUgY29tcG9zaXRpb24gb2YgdGhlIHByb3ZpZGVkIGZ1bmN0aW9ucyxcbiAgICAgKiB3aGVyZSBlYWNoIGZ1bmN0aW9uIGNvbnN1bWVzIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgZm9sbG93cy5cbiAgICAgKiBGb3IgZXhhbXBsZSwgY29tcG9zaW5nIHRoZSBmdW5jdGlvbnMgYGYoKWAsIGBnKClgLCBhbmQgYGgoKWAgcHJvZHVjZXMgYGYoZyhoKCkpKWAuXG4gICAgICogRWFjaCBmdW5jdGlvbiBpcyBleGVjdXRlZCB3aXRoIHRoZSBgdGhpc2AgYmluZGluZyBvZiB0aGUgY29tcG9zZWQgZnVuY3Rpb24uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHsuLi5GdW5jdGlvbn0gW2Z1bmNdIEZ1bmN0aW9ucyB0byBjb21wb3NlLlxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGNvbXBvc2VkIGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgcmVhbE5hbWVNYXAgPSB7XG4gICAgICogICAncGViYmxlcyc6ICdwZW5lbG9wZSdcbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogdmFyIGZvcm1hdCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgKiAgIG5hbWUgPSByZWFsTmFtZU1hcFtuYW1lLnRvTG93ZXJDYXNlKCldIHx8IG5hbWU7XG4gICAgICogICByZXR1cm4gbmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5hbWUuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogdmFyIGdyZWV0ID0gZnVuY3Rpb24oZm9ybWF0dGVkKSB7XG4gICAgICogICByZXR1cm4gJ0hpeWEgJyArIGZvcm1hdHRlZCArICchJztcbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogdmFyIHdlbGNvbWUgPSBfLmNvbXBvc2UoZ3JlZXQsIGZvcm1hdCk7XG4gICAgICogd2VsY29tZSgncGViYmxlcycpO1xuICAgICAqIC8vID0+ICdIaXlhIFBlbmVsb3BlISdcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjb21wb3NlKCkge1xuICAgICAgdmFyIGZ1bmNzID0gYXJndW1lbnRzLFxuICAgICAgICAgIGxlbmd0aCA9IGZ1bmNzLmxlbmd0aDtcblxuICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgIGlmICghaXNGdW5jdGlvbihmdW5jc1tsZW5ndGhdKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHMsXG4gICAgICAgICAgICBsZW5ndGggPSBmdW5jcy5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgICAgYXJncyA9IFtmdW5jc1tsZW5ndGhdLmFwcGx5KHRoaXMsIGFyZ3MpXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXJnc1swXTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHdoaWNoIGFjY2VwdHMgb25lIG9yIG1vcmUgYXJndW1lbnRzIG9mIGBmdW5jYCB0aGF0IHdoZW5cbiAgICAgKiBpbnZva2VkIGVpdGhlciBleGVjdXRlcyBgZnVuY2AgcmV0dXJuaW5nIGl0cyByZXN1bHQsIGlmIGFsbCBgZnVuY2AgYXJndW1lbnRzXG4gICAgICogaGF2ZSBiZWVuIHByb3ZpZGVkLCBvciByZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZSBvciBtb3JlIG9mIHRoZVxuICAgICAqIHJlbWFpbmluZyBgZnVuY2AgYXJndW1lbnRzLCBhbmQgc28gb24uIFRoZSBhcml0eSBvZiBgZnVuY2AgY2FuIGJlIHNwZWNpZmllZFxuICAgICAqIGlmIGBmdW5jLmxlbmd0aGAgaXMgbm90IHN1ZmZpY2llbnQuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gY3VycnkuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFthcml0eT1mdW5jLmxlbmd0aF0gVGhlIGFyaXR5IG9mIGBmdW5jYC5cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBjdXJyaWVkIGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgY3VycmllZCA9IF8uY3VycnkoZnVuY3Rpb24oYSwgYiwgYykge1xuICAgICAqICAgY29uc29sZS5sb2coYSArIGIgKyBjKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIGN1cnJpZWQoMSkoMikoMyk7XG4gICAgICogLy8gPT4gNlxuICAgICAqXG4gICAgICogY3VycmllZCgxLCAyKSgzKTtcbiAgICAgKiAvLyA9PiA2XG4gICAgICpcbiAgICAgKiBjdXJyaWVkKDEsIDIsIDMpO1xuICAgICAqIC8vID0+IDZcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjdXJyeShmdW5jLCBhcml0eSkge1xuICAgICAgYXJpdHkgPSB0eXBlb2YgYXJpdHkgPT0gJ251bWJlcicgPyBhcml0eSA6ICgrYXJpdHkgfHwgZnVuYy5sZW5ndGgpO1xuICAgICAgcmV0dXJuIGNyZWF0ZVdyYXBwZXIoZnVuYywgNCwgbnVsbCwgbnVsbCwgbnVsbCwgYXJpdHkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgZGVsYXkgdGhlIGV4ZWN1dGlvbiBvZiBgZnVuY2AgdW50aWwgYWZ0ZXJcbiAgICAgKiBgd2FpdGAgbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIGl0IHdhcyBpbnZva2VkLlxuICAgICAqIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2Agc2hvdWxkIGJlIGludm9rZWQgb25cbiAgICAgKiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuIFN1YnNlcXVlbnQgY2FsbHNcbiAgICAgKiB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdpbGwgcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3QgYGZ1bmNgIGNhbGwuXG4gICAgICpcbiAgICAgKiBOb3RlOiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgIGBmdW5jYCB3aWxsIGJlIGNhbGxlZFxuICAgICAqIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gaXNcbiAgICAgKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHdhaXQgVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPWZhbHNlXSBTcGVjaWZ5IGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlIGRlbGF5ZWQgYmVmb3JlIGl0J3MgY2FsbGVkLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XG4gICAgICogdmFyIGxhenlMYXlvdXQgPSBfLmRlYm91bmNlKGNhbGN1bGF0ZUxheW91dCwgMTUwKTtcbiAgICAgKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgbGF6eUxheW91dCk7XG4gICAgICpcbiAgICAgKiAvLyBleGVjdXRlIGBzZW5kTWFpbGAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGRlYm91bmNpbmcgc3Vic2VxdWVudCBjYWxsc1xuICAgICAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAgICAgKiAgICdsZWFkaW5nJzogdHJ1ZSxcbiAgICAgKiAgICd0cmFpbGluZyc6IGZhbHNlXG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBlbnN1cmUgYGJhdGNoTG9nYCBpcyBleGVjdXRlZCBvbmNlIGFmdGVyIDEgc2Vjb25kIG9mIGRlYm91bmNlZCBjYWxsc1xuICAgICAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAgICAgKiBzb3VyY2UuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIF8uZGVib3VuY2UoYmF0Y2hMb2csIDI1MCwge1xuICAgICAqICAgJ21heFdhaXQnOiAxMDAwXG4gICAgICogfSwgZmFsc2UpO1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgICAgIHZhciBhcmdzLFxuICAgICAgICAgIG1heFRpbWVvdXRJZCxcbiAgICAgICAgICByZXN1bHQsXG4gICAgICAgICAgc3RhbXAsXG4gICAgICAgICAgdGhpc0FyZyxcbiAgICAgICAgICB0aW1lb3V0SWQsXG4gICAgICAgICAgdHJhaWxpbmdDYWxsLFxuICAgICAgICAgIGxhc3RDYWxsZWQgPSAwLFxuICAgICAgICAgIG1heFdhaXQgPSBmYWxzZSxcbiAgICAgICAgICB0cmFpbGluZyA9IHRydWU7XG5cbiAgICAgIGlmICghaXNGdW5jdGlvbihmdW5jKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgICAgfVxuICAgICAgd2FpdCA9IG5hdGl2ZU1heCgwLCB3YWl0KSB8fCAwO1xuICAgICAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xuICAgICAgICB0cmFpbGluZyA9IGZhbHNlO1xuICAgICAgfSBlbHNlIGlmIChpc09iamVjdChvcHRpb25zKSkge1xuICAgICAgICBsZWFkaW5nID0gb3B0aW9ucy5sZWFkaW5nO1xuICAgICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgKG5hdGl2ZU1heCh3YWl0LCBvcHRpb25zLm1heFdhaXQpIHx8IDApO1xuICAgICAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/IG9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcbiAgICAgIH1cbiAgICAgIHZhciBkZWxheWVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdygpIC0gc3RhbXApO1xuICAgICAgICBpZiAocmVtYWluaW5nIDw9IDApIHtcbiAgICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGlzQ2FsbGVkID0gdHJhaWxpbmdDYWxsO1xuICAgICAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBpZiAoaXNDYWxsZWQpIHtcbiAgICAgICAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICAgICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XG4gICAgICAgICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCByZW1haW5pbmcpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB2YXIgbWF4RGVsYXllZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGltZW91dElkKSB7XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgIH1cbiAgICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAodHJhaWxpbmcgfHwgKG1heFdhaXQgIT09IHdhaXQpKSB7XG4gICAgICAgICAgbGFzdENhbGxlZCA9IG5vdygpO1xuICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICAgICAgaWYgKCF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xuICAgICAgICAgICAgYXJncyA9IHRoaXNBcmcgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICBzdGFtcCA9IG5vdygpO1xuICAgICAgICB0aGlzQXJnID0gdGhpcztcbiAgICAgICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XG5cbiAgICAgICAgaWYgKG1heFdhaXQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghbWF4VGltZW91dElkICYmICFsZWFkaW5nKSB7XG4gICAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZW1haW5pbmcgPSBtYXhXYWl0IC0gKHN0YW1wIC0gbGFzdENhbGxlZCksXG4gICAgICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDA7XG5cbiAgICAgICAgICBpZiAoaXNDYWxsZWQpIHtcbiAgICAgICAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XG4gICAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmICghbWF4VGltZW91dElkKSB7XG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcbiAgICAgICAgICB0aW1lb3V0SWQgPSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcbiAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHdhaXQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsZWFkaW5nQ2FsbCkge1xuICAgICAgICAgIGlzQ2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0NhbGxlZCAmJiAhdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVmZXJzIGV4ZWN1dGluZyB0aGUgYGZ1bmNgIGZ1bmN0aW9uIHVudGlsIHRoZSBjdXJyZW50IGNhbGwgc3RhY2sgaGFzIGNsZWFyZWQuXG4gICAgICogQWRkaXRpb25hbCBhcmd1bWVudHMgd2lsbCBiZSBwcm92aWRlZCB0byBgZnVuY2Agd2hlbiBpdCBpcyBpbnZva2VkLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEZ1bmN0aW9uc1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlZmVyLlxuICAgICAqIEBwYXJhbSB7Li4uKn0gW2FyZ10gQXJndW1lbnRzIHRvIGludm9rZSB0aGUgZnVuY3Rpb24gd2l0aC5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSB0aW1lciBpZC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXy5kZWZlcihmdW5jdGlvbih0ZXh0KSB7IGNvbnNvbGUubG9nKHRleHQpOyB9LCAnZGVmZXJyZWQnKTtcbiAgICAgKiAvLyBsb2dzICdkZWZlcnJlZCcgYWZ0ZXIgb25lIG9yIG1vcmUgbWlsbGlzZWNvbmRzXG4gICAgICovXG4gICAgZnVuY3Rpb24gZGVmZXIoZnVuYykge1xuICAgICAgaWYgKCFpc0Z1bmN0aW9uKGZ1bmMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgICB9XG4gICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHsgZnVuYy5hcHBseSh1bmRlZmluZWQsIGFyZ3MpOyB9LCAxKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlcyB0aGUgYGZ1bmNgIGZ1bmN0aW9uIGFmdGVyIGB3YWl0YCBtaWxsaXNlY29uZHMuIEFkZGl0aW9uYWwgYXJndW1lbnRzXG4gICAgICogd2lsbCBiZSBwcm92aWRlZCB0byBgZnVuY2Agd2hlbiBpdCBpcyBpbnZva2VkLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEZ1bmN0aW9uc1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlbGF5LlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB3YWl0IFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5IGV4ZWN1dGlvbi5cbiAgICAgKiBAcGFyYW0gey4uLip9IFthcmddIEFyZ3VtZW50cyB0byBpbnZva2UgdGhlIGZ1bmN0aW9uIHdpdGguXG4gICAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgdGltZXIgaWQuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uZGVsYXkoZnVuY3Rpb24odGV4dCkgeyBjb25zb2xlLmxvZyh0ZXh0KTsgfSwgMTAwMCwgJ2xhdGVyJyk7XG4gICAgICogLy8gPT4gbG9ncyAnbGF0ZXInIGFmdGVyIG9uZSBzZWNvbmRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkZWxheShmdW5jLCB3YWl0KSB7XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oZnVuYykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICAgIH1cbiAgICAgIHZhciBhcmdzID0gc2xpY2UoYXJndW1lbnRzLCAyKTtcbiAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBmdW5jLmFwcGx5KHVuZGVmaW5lZCwgYXJncyk7IH0sIHdhaXQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IG1lbW9pemVzIHRoZSByZXN1bHQgb2YgYGZ1bmNgLiBJZiBgcmVzb2x2ZXJgIGlzXG4gICAgICogcHJvdmlkZWQgaXQgd2lsbCBiZSB1c2VkIHRvIGRldGVybWluZSB0aGUgY2FjaGUga2V5IGZvciBzdG9yaW5nIHRoZSByZXN1bHRcbiAgICAgKiBiYXNlZCBvbiB0aGUgYXJndW1lbnRzIHByb3ZpZGVkIHRvIHRoZSBtZW1vaXplZCBmdW5jdGlvbi4gQnkgZGVmYXVsdCwgdGhlXG4gICAgICogZmlyc3QgYXJndW1lbnQgcHJvdmlkZWQgdG8gdGhlIG1lbW9pemVkIGZ1bmN0aW9uIGlzIHVzZWQgYXMgdGhlIGNhY2hlIGtleS5cbiAgICAgKiBUaGUgYGZ1bmNgIGlzIGV4ZWN1dGVkIHdpdGggdGhlIGB0aGlzYCBiaW5kaW5nIG9mIHRoZSBtZW1vaXplZCBmdW5jdGlvbi5cbiAgICAgKiBUaGUgcmVzdWx0IGNhY2hlIGlzIGV4cG9zZWQgYXMgdGhlIGBjYWNoZWAgcHJvcGVydHkgb24gdGhlIG1lbW9pemVkIGZ1bmN0aW9uLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IEZ1bmN0aW9uc1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGhhdmUgaXRzIG91dHB1dCBtZW1vaXplZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcmVzb2x2ZXJdIEEgZnVuY3Rpb24gdXNlZCB0byByZXNvbHZlIHRoZSBjYWNoZSBrZXkuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgbWVtb2l6aW5nIGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgZmlib25hY2NpID0gXy5tZW1vaXplKGZ1bmN0aW9uKG4pIHtcbiAgICAgKiAgIHJldHVybiBuIDwgMiA/IG4gOiBmaWJvbmFjY2kobiAtIDEpICsgZmlib25hY2NpKG4gLSAyKTtcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIGZpYm9uYWNjaSg5KVxuICAgICAqIC8vID0+IDM0XG4gICAgICpcbiAgICAgKiB2YXIgZGF0YSA9IHtcbiAgICAgKiAgICdmcmVkJzogeyAnbmFtZSc6ICdmcmVkJywgJ2FnZSc6IDQwIH0sXG4gICAgICogICAncGViYmxlcyc6IHsgJ25hbWUnOiAncGViYmxlcycsICdhZ2UnOiAxIH1cbiAgICAgKiB9O1xuICAgICAqXG4gICAgICogLy8gbW9kaWZ5aW5nIHRoZSByZXN1bHQgY2FjaGVcbiAgICAgKiB2YXIgZ2V0ID0gXy5tZW1vaXplKGZ1bmN0aW9uKG5hbWUpIHsgcmV0dXJuIGRhdGFbbmFtZV07IH0sIF8uaWRlbnRpdHkpO1xuICAgICAqIGdldCgncGViYmxlcycpO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAncGViYmxlcycsICdhZ2UnOiAxIH1cbiAgICAgKlxuICAgICAqIGdldC5jYWNoZS5wZWJibGVzLm5hbWUgPSAncGVuZWxvcGUnO1xuICAgICAqIGdldCgncGViYmxlcycpO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAncGVuZWxvcGUnLCAnYWdlJzogMSB9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWVtb2l6ZShmdW5jLCByZXNvbHZlcikge1xuICAgICAgaWYgKCFpc0Z1bmN0aW9uKGZ1bmMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgICB9XG4gICAgICB2YXIgbWVtb2l6ZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNhY2hlID0gbWVtb2l6ZWQuY2FjaGUsXG4gICAgICAgICAgICBrZXkgPSByZXNvbHZlciA/IHJlc29sdmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiBrZXlQcmVmaXggKyBhcmd1bWVudHNbMF07XG5cbiAgICAgICAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwoY2FjaGUsIGtleSlcbiAgICAgICAgICA/IGNhY2hlW2tleV1cbiAgICAgICAgICA6IChjYWNoZVtrZXldID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgICAgIH1cbiAgICAgIG1lbW9pemVkLmNhY2hlID0ge307XG4gICAgICByZXR1cm4gbWVtb2l6ZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgaXMgcmVzdHJpY3RlZCB0byBleGVjdXRlIGBmdW5jYCBvbmNlLiBSZXBlYXQgY2FsbHMgdG9cbiAgICAgKiB0aGUgZnVuY3Rpb24gd2lsbCByZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBmaXJzdCBjYWxsLiBUaGUgYGZ1bmNgIGlzIGV4ZWN1dGVkXG4gICAgICogd2l0aCB0aGUgYHRoaXNgIGJpbmRpbmcgb2YgdGhlIGNyZWF0ZWQgZnVuY3Rpb24uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gcmVzdHJpY3QuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgcmVzdHJpY3RlZCBmdW5jdGlvbi5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGluaXRpYWxpemUgPSBfLm9uY2UoY3JlYXRlQXBwbGljYXRpb24pO1xuICAgICAqIGluaXRpYWxpemUoKTtcbiAgICAgKiBpbml0aWFsaXplKCk7XG4gICAgICogLy8gYGluaXRpYWxpemVgIGV4ZWN1dGVzIGBjcmVhdGVBcHBsaWNhdGlvbmAgb25jZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9uY2UoZnVuYykge1xuICAgICAgdmFyIHJhbixcbiAgICAgICAgICByZXN1bHQ7XG5cbiAgICAgIGlmICghaXNGdW5jdGlvbihmdW5jKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAocmFuKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICByYW4gPSB0cnVlO1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgICAgLy8gY2xlYXIgdGhlIGBmdW5jYCB2YXJpYWJsZSBzbyB0aGUgZnVuY3Rpb24gbWF5IGJlIGdhcmJhZ2UgY29sbGVjdGVkXG4gICAgICAgIGZ1bmMgPSBudWxsO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsIGludm9rZXMgYGZ1bmNgIHdpdGggYW55IGFkZGl0aW9uYWxcbiAgICAgKiBgcGFydGlhbGAgYXJndW1lbnRzIHByZXBlbmRlZCB0byB0aG9zZSBwcm92aWRlZCB0byB0aGUgbmV3IGZ1bmN0aW9uLiBUaGlzXG4gICAgICogbWV0aG9kIGlzIHNpbWlsYXIgdG8gYF8uYmluZGAgZXhjZXB0IGl0IGRvZXMgKipub3QqKiBhbHRlciB0aGUgYHRoaXNgIGJpbmRpbmcuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gcGFydGlhbGx5IGFwcGx5IGFyZ3VtZW50cyB0by5cbiAgICAgKiBAcGFyYW0gey4uLip9IFthcmddIEFyZ3VtZW50cyB0byBiZSBwYXJ0aWFsbHkgYXBwbGllZC5cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBwYXJ0aWFsbHkgYXBwbGllZCBmdW5jdGlvbi5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGdyZWV0ID0gZnVuY3Rpb24oZ3JlZXRpbmcsIG5hbWUpIHsgcmV0dXJuIGdyZWV0aW5nICsgJyAnICsgbmFtZTsgfTtcbiAgICAgKiB2YXIgaGkgPSBfLnBhcnRpYWwoZ3JlZXQsICdoaScpO1xuICAgICAqIGhpKCdmcmVkJyk7XG4gICAgICogLy8gPT4gJ2hpIGZyZWQnXG4gICAgICovXG4gICAgZnVuY3Rpb24gcGFydGlhbChmdW5jKSB7XG4gICAgICByZXR1cm4gY3JlYXRlV3JhcHBlcihmdW5jLCAxNiwgc2xpY2UoYXJndW1lbnRzLCAxKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhpcyBtZXRob2QgaXMgbGlrZSBgXy5wYXJ0aWFsYCBleGNlcHQgdGhhdCBgcGFydGlhbGAgYXJndW1lbnRzIGFyZVxuICAgICAqIGFwcGVuZGVkIHRvIHRob3NlIHByb3ZpZGVkIHRvIHRoZSBuZXcgZnVuY3Rpb24uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gcGFydGlhbGx5IGFwcGx5IGFyZ3VtZW50cyB0by5cbiAgICAgKiBAcGFyYW0gey4uLip9IFthcmddIEFyZ3VtZW50cyB0byBiZSBwYXJ0aWFsbHkgYXBwbGllZC5cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBwYXJ0aWFsbHkgYXBwbGllZCBmdW5jdGlvbi5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGRlZmF1bHRzRGVlcCA9IF8ucGFydGlhbFJpZ2h0KF8ubWVyZ2UsIF8uZGVmYXVsdHMpO1xuICAgICAqXG4gICAgICogdmFyIG9wdGlvbnMgPSB7XG4gICAgICogICAndmFyaWFibGUnOiAnZGF0YScsXG4gICAgICogICAnaW1wb3J0cyc6IHsgJ2pxJzogJCB9XG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIGRlZmF1bHRzRGVlcChvcHRpb25zLCBfLnRlbXBsYXRlU2V0dGluZ3MpO1xuICAgICAqXG4gICAgICogb3B0aW9ucy52YXJpYWJsZVxuICAgICAqIC8vID0+ICdkYXRhJ1xuICAgICAqXG4gICAgICogb3B0aW9ucy5pbXBvcnRzXG4gICAgICogLy8gPT4geyAnXyc6IF8sICdqcSc6ICQgfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHBhcnRpYWxSaWdodChmdW5jKSB7XG4gICAgICByZXR1cm4gY3JlYXRlV3JhcHBlcihmdW5jLCAzMiwgbnVsbCwgc2xpY2UoYXJndW1lbnRzLCAxKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQsIHdoZW4gZXhlY3V0ZWQsIHdpbGwgb25seSBjYWxsIHRoZSBgZnVuY2AgZnVuY3Rpb25cbiAgICAgKiBhdCBtb3N0IG9uY2UgcGVyIGV2ZXJ5IGB3YWl0YCBtaWxsaXNlY29uZHMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG9cbiAgICAgKiBpbmRpY2F0ZSB0aGF0IGBmdW5jYCBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZVxuICAgICAqIG9mIHRoZSBgd2FpdGAgdGltZW91dC4gU3Vic2VxdWVudCBjYWxscyB0byB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIHdpbGxcbiAgICAgKiByZXR1cm4gdGhlIHJlc3VsdCBvZiB0aGUgbGFzdCBgZnVuY2AgY2FsbC5cbiAgICAgKlxuICAgICAqIE5vdGU6IElmIGBsZWFkaW5nYCBhbmQgYHRyYWlsaW5nYCBvcHRpb25zIGFyZSBgdHJ1ZWAgYGZ1bmNgIHdpbGwgYmUgY2FsbGVkXG4gICAgICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIHRocm90dGxlZCBmdW5jdGlvbiBpc1xuICAgICAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBGdW5jdGlvbnNcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byB0aHJvdHRsZS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gd2FpdCBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byB0aHJvdHRsZSBleGVjdXRpb25zIHRvLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz10cnVlXSBTcGVjaWZ5IGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgdGhyb3R0bGVkIGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiAvLyBhdm9pZCBleGNlc3NpdmVseSB1cGRhdGluZyB0aGUgcG9zaXRpb24gd2hpbGUgc2Nyb2xsaW5nXG4gICAgICogdmFyIHRocm90dGxlZCA9IF8udGhyb3R0bGUodXBkYXRlUG9zaXRpb24sIDEwMCk7XG4gICAgICogalF1ZXJ5KHdpbmRvdykub24oJ3Njcm9sbCcsIHRocm90dGxlZCk7XG4gICAgICpcbiAgICAgKiAvLyBleGVjdXRlIGByZW5ld1Rva2VuYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgYnV0IG5vdCBtb3JlIHRoYW4gb25jZSBldmVyeSA1IG1pbnV0ZXNcbiAgICAgKiBqUXVlcnkoJy5pbnRlcmFjdGl2ZScpLm9uKCdjbGljaycsIF8udGhyb3R0bGUocmVuZXdUb2tlbiwgMzAwMDAwLCB7XG4gICAgICogICAndHJhaWxpbmcnOiBmYWxzZVxuICAgICAqIH0pKTtcbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0aHJvdHRsZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gICAgICB2YXIgbGVhZGluZyA9IHRydWUsXG4gICAgICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gICAgICBpZiAoIWlzRnVuY3Rpb24oZnVuYykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zID09PSBmYWxzZSkge1xuICAgICAgICBsZWFkaW5nID0gZmFsc2U7XG4gICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgICAgIGxlYWRpbmcgPSAnbGVhZGluZycgaW4gb3B0aW9ucyA/IG9wdGlvbnMubGVhZGluZyA6IGxlYWRpbmc7XG4gICAgICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICAgICAgfVxuICAgICAgZGVib3VuY2VPcHRpb25zLmxlYWRpbmcgPSBsZWFkaW5nO1xuICAgICAgZGVib3VuY2VPcHRpb25zLm1heFdhaXQgPSB3YWl0O1xuICAgICAgZGVib3VuY2VPcHRpb25zLnRyYWlsaW5nID0gdHJhaWxpbmc7XG5cbiAgICAgIHJldHVybiBkZWJvdW5jZShmdW5jLCB3YWl0LCBkZWJvdW5jZU9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IHByb3ZpZGVzIGB2YWx1ZWAgdG8gdGhlIHdyYXBwZXIgZnVuY3Rpb24gYXMgaXRzXG4gICAgICogZmlyc3QgYXJndW1lbnQuIEFkZGl0aW9uYWwgYXJndW1lbnRzIHByb3ZpZGVkIHRvIHRoZSBmdW5jdGlvbiBhcmUgYXBwZW5kZWRcbiAgICAgKiB0byB0aG9zZSBwcm92aWRlZCB0byB0aGUgd3JhcHBlciBmdW5jdGlvbi4gVGhlIHdyYXBwZXIgaXMgZXhlY3V0ZWQgd2l0aFxuICAgICAqIHRoZSBgdGhpc2AgYmluZGluZyBvZiB0aGUgY3JlYXRlZCBmdW5jdGlvbi5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBGdW5jdGlvbnNcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byB3cmFwLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHdyYXBwZXIgVGhlIHdyYXBwZXIgZnVuY3Rpb24uXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBwID0gXy53cmFwKF8uZXNjYXBlLCBmdW5jdGlvbihmdW5jLCB0ZXh0KSB7XG4gICAgICogICByZXR1cm4gJzxwPicgKyBmdW5jKHRleHQpICsgJzwvcD4nO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogcCgnRnJlZCwgV2lsbWEsICYgUGViYmxlcycpO1xuICAgICAqIC8vID0+ICc8cD5GcmVkLCBXaWxtYSwgJmFtcDsgUGViYmxlczwvcD4nXG4gICAgICovXG4gICAgZnVuY3Rpb24gd3JhcCh2YWx1ZSwgd3JhcHBlcikge1xuICAgICAgcmV0dXJuIGNyZWF0ZVdyYXBwZXIod3JhcHBlciwgMTYsIFt2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBgdmFsdWVgLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHJldHVybiBmcm9tIHRoZSBuZXcgZnVuY3Rpb24uXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBvYmplY3QgPSB7ICduYW1lJzogJ2ZyZWQnIH07XG4gICAgICogdmFyIGdldHRlciA9IF8uY29uc3RhbnQob2JqZWN0KTtcbiAgICAgKiBnZXR0ZXIoKSA9PT0gb2JqZWN0O1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjb25zdGFudCh2YWx1ZSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByb2R1Y2VzIGEgY2FsbGJhY2sgYm91bmQgdG8gYW4gb3B0aW9uYWwgYHRoaXNBcmdgLiBJZiBgZnVuY2AgaXMgYSBwcm9wZXJ0eVxuICAgICAqIG5hbWUgdGhlIGNyZWF0ZWQgY2FsbGJhY2sgd2lsbCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlIGZvciBhIGdpdmVuIGVsZW1lbnQuXG4gICAgICogSWYgYGZ1bmNgIGlzIGFuIG9iamVjdCB0aGUgY3JlYXRlZCBjYWxsYmFjayB3aWxsIHJldHVybiBgdHJ1ZWAgZm9yIGVsZW1lbnRzXG4gICAgICogdGhhdCBjb250YWluIHRoZSBlcXVpdmFsZW50IG9iamVjdCBwcm9wZXJ0aWVzLCBvdGhlcndpc2UgaXQgd2lsbCByZXR1cm4gYGZhbHNlYC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAgICAgKiBAcGFyYW0geyp9IFtmdW5jPWlkZW50aXR5XSBUaGUgdmFsdWUgdG8gY29udmVydCB0byBhIGNhbGxiYWNrLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiB0aGUgY3JlYXRlZCBjYWxsYmFjay5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW2FyZ0NvdW50XSBUaGUgbnVtYmVyIG9mIGFyZ3VtZW50cyB0aGUgY2FsbGJhY2sgYWNjZXB0cy5cbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgYSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAnYWdlJzogNDAgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiAvLyB3cmFwIHRvIGNyZWF0ZSBjdXN0b20gY2FsbGJhY2sgc2hvcnRoYW5kc1xuICAgICAqIF8uY3JlYXRlQ2FsbGJhY2sgPSBfLndyYXAoXy5jcmVhdGVDYWxsYmFjaywgZnVuY3Rpb24oZnVuYywgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgKiAgIHZhciBtYXRjaCA9IC9eKC4rPylfXyhbZ2xddCkoLispJC8uZXhlYyhjYWxsYmFjayk7XG4gICAgICogICByZXR1cm4gIW1hdGNoID8gZnVuYyhjYWxsYmFjaywgdGhpc0FyZykgOiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgKiAgICAgcmV0dXJuIG1hdGNoWzJdID09ICdndCcgPyBvYmplY3RbbWF0Y2hbMV1dID4gbWF0Y2hbM10gOiBvYmplY3RbbWF0Y2hbMV1dIDwgbWF0Y2hbM107XG4gICAgICogICB9O1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogXy5maWx0ZXIoY2hhcmFjdGVycywgJ2FnZV9fZ3QzOCcpO1xuICAgICAqIC8vID0+IFt7ICduYW1lJzogJ2ZyZWQnLCAnYWdlJzogNDAgfV1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVDYWxsYmFjayhmdW5jLCB0aGlzQXJnLCBhcmdDb3VudCkge1xuICAgICAgdmFyIHR5cGUgPSB0eXBlb2YgZnVuYztcbiAgICAgIGlmIChmdW5jID09IG51bGwgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBiYXNlQ3JlYXRlQ2FsbGJhY2soZnVuYywgdGhpc0FyZywgYXJnQ291bnQpO1xuICAgICAgfVxuICAgICAgLy8gaGFuZGxlIFwiXy5wbHVja1wiIHN0eWxlIGNhbGxiYWNrIHNob3J0aGFuZHNcbiAgICAgIGlmICh0eXBlICE9ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBwcm9wZXJ0eShmdW5jKTtcbiAgICAgIH1cbiAgICAgIHZhciBwcm9wcyA9IGtleXMoZnVuYyksXG4gICAgICAgICAga2V5ID0gcHJvcHNbMF0sXG4gICAgICAgICAgYSA9IGZ1bmNba2V5XTtcblxuICAgICAgLy8gaGFuZGxlIFwiXy53aGVyZVwiIHN0eWxlIGNhbGxiYWNrIHNob3J0aGFuZHNcbiAgICAgIGlmIChwcm9wcy5sZW5ndGggPT0gMSAmJiBhID09PSBhICYmICFpc09iamVjdChhKSkge1xuICAgICAgICAvLyBmYXN0IHBhdGggdGhlIGNvbW1vbiBjYXNlIG9mIHByb3ZpZGluZyBhbiBvYmplY3Qgd2l0aCBhIHNpbmdsZVxuICAgICAgICAvLyBwcm9wZXJ0eSBjb250YWluaW5nIGEgcHJpbWl0aXZlIHZhbHVlXG4gICAgICAgIHJldHVybiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgICAgICB2YXIgYiA9IG9iamVjdFtrZXldO1xuICAgICAgICAgIHJldHVybiBhID09PSBiICYmIChhICE9PSAwIHx8ICgxIC8gYSA9PSAxIC8gYikpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCkge1xuICAgICAgICB2YXIgbGVuZ3RoID0gcHJvcHMubGVuZ3RoLFxuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG5cbiAgICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gYmFzZUlzRXF1YWwob2JqZWN0W3Byb3BzW2xlbmd0aF1dLCBmdW5jW3Byb3BzW2xlbmd0aF1dLCBudWxsLCB0cnVlKSkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0aGUgY2hhcmFjdGVycyBgJmAsIGA8YCwgYD5gLCBgXCJgLCBhbmQgYCdgIGluIGBzdHJpbmdgIHRvIHRoZWlyXG4gICAgICogY29ycmVzcG9uZGluZyBIVE1MIGVudGl0aWVzLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byBlc2NhcGUuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgZXNjYXBlZCBzdHJpbmcuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8uZXNjYXBlKCdGcmVkLCBXaWxtYSwgJiBQZWJibGVzJyk7XG4gICAgICogLy8gPT4gJ0ZyZWQsIFdpbG1hLCAmYW1wOyBQZWJibGVzJ1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVzY2FwZShzdHJpbmcpIHtcbiAgICAgIHJldHVybiBzdHJpbmcgPT0gbnVsbCA/ICcnIDogU3RyaW5nKHN0cmluZykucmVwbGFjZShyZVVuZXNjYXBlZEh0bWwsIGVzY2FwZUh0bWxDaGFyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCByZXR1cm5zIHRoZSBmaXJzdCBhcmd1bWVudCBwcm92aWRlZCB0byBpdC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIEFueSB2YWx1ZS5cbiAgICAgKiBAcmV0dXJucyB7Kn0gUmV0dXJucyBgdmFsdWVgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgb2JqZWN0ID0geyAnbmFtZSc6ICdmcmVkJyB9O1xuICAgICAqIF8uaWRlbnRpdHkob2JqZWN0KSA9PT0gb2JqZWN0O1xuICAgICAqIC8vID0+IHRydWVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpZGVudGl0eSh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZHMgZnVuY3Rpb24gcHJvcGVydGllcyBvZiBhIHNvdXJjZSBvYmplY3QgdG8gdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBJZiBgb2JqZWN0YCBpcyBhIGZ1bmN0aW9uIG1ldGhvZHMgd2lsbCBiZSBhZGRlZCB0byBpdHMgcHJvdG90eXBlIGFzIHdlbGwuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R9IFtvYmplY3Q9bG9kYXNoXSBvYmplY3QgVGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc291cmNlIFRoZSBvYmplY3Qgb2YgZnVuY3Rpb25zIHRvIGFkZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFRoZSBvcHRpb25zIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmNoYWluPXRydWVdIFNwZWNpZnkgd2hldGhlciB0aGUgZnVuY3Rpb25zIGFkZGVkIGFyZSBjaGFpbmFibGUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIGZ1bmN0aW9uIGNhcGl0YWxpemUoc3RyaW5nKSB7XG4gICAgICogICByZXR1cm4gc3RyaW5nLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyaW5nLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgICogfVxuICAgICAqXG4gICAgICogXy5taXhpbih7ICdjYXBpdGFsaXplJzogY2FwaXRhbGl6ZSB9KTtcbiAgICAgKiBfLmNhcGl0YWxpemUoJ2ZyZWQnKTtcbiAgICAgKiAvLyA9PiAnRnJlZCdcbiAgICAgKlxuICAgICAqIF8oJ2ZyZWQnKS5jYXBpdGFsaXplKCkudmFsdWUoKTtcbiAgICAgKiAvLyA9PiAnRnJlZCdcbiAgICAgKlxuICAgICAqIF8ubWl4aW4oeyAnY2FwaXRhbGl6ZSc6IGNhcGl0YWxpemUgfSwgeyAnY2hhaW4nOiBmYWxzZSB9KTtcbiAgICAgKiBfKCdmcmVkJykuY2FwaXRhbGl6ZSgpO1xuICAgICAqIC8vID0+ICdGcmVkJ1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1peGluKG9iamVjdCwgc291cmNlLCBvcHRpb25zKSB7XG4gICAgICB2YXIgY2hhaW4gPSB0cnVlLFxuICAgICAgICAgIG1ldGhvZE5hbWVzID0gc291cmNlICYmIGZ1bmN0aW9ucyhzb3VyY2UpO1xuXG4gICAgICBpZiAoIXNvdXJjZSB8fCAoIW9wdGlvbnMgJiYgIW1ldGhvZE5hbWVzLmxlbmd0aCkpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT0gbnVsbCkge1xuICAgICAgICAgIG9wdGlvbnMgPSBzb3VyY2U7XG4gICAgICAgIH1cbiAgICAgICAgY3RvciA9IGxvZGFzaFdyYXBwZXI7XG4gICAgICAgIHNvdXJjZSA9IG9iamVjdDtcbiAgICAgICAgb2JqZWN0ID0gbG9kYXNoO1xuICAgICAgICBtZXRob2ROYW1lcyA9IGZ1bmN0aW9ucyhzb3VyY2UpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdGlvbnMgPT09IGZhbHNlKSB7XG4gICAgICAgIGNoYWluID0gZmFsc2U7XG4gICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpICYmICdjaGFpbicgaW4gb3B0aW9ucykge1xuICAgICAgICBjaGFpbiA9IG9wdGlvbnMuY2hhaW47XG4gICAgICB9XG4gICAgICB2YXIgY3RvciA9IG9iamVjdCxcbiAgICAgICAgICBpc0Z1bmMgPSBpc0Z1bmN0aW9uKGN0b3IpO1xuXG4gICAgICBmb3JFYWNoKG1ldGhvZE5hbWVzLCBmdW5jdGlvbihtZXRob2ROYW1lKSB7XG4gICAgICAgIHZhciBmdW5jID0gb2JqZWN0W21ldGhvZE5hbWVdID0gc291cmNlW21ldGhvZE5hbWVdO1xuICAgICAgICBpZiAoaXNGdW5jKSB7XG4gICAgICAgICAgY3Rvci5wcm90b3R5cGVbbWV0aG9kTmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBjaGFpbkFsbCA9IHRoaXMuX19jaGFpbl9fLFxuICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5fX3dyYXBwZWRfXyxcbiAgICAgICAgICAgICAgICBhcmdzID0gW3ZhbHVlXTtcblxuICAgICAgICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGZ1bmMuYXBwbHkob2JqZWN0LCBhcmdzKTtcbiAgICAgICAgICAgIGlmIChjaGFpbiB8fCBjaGFpbkFsbCkge1xuICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IHJlc3VsdCAmJiBpc09iamVjdChyZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0ID0gbmV3IGN0b3IocmVzdWx0KTtcbiAgICAgICAgICAgICAgcmVzdWx0Ll9fY2hhaW5fXyA9IGNoYWluQWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXZlcnRzIHRoZSAnXycgdmFyaWFibGUgdG8gaXRzIHByZXZpb3VzIHZhbHVlIGFuZCByZXR1cm5zIGEgcmVmZXJlbmNlIHRvXG4gICAgICogdGhlIGBsb2Rhc2hgIGZ1bmN0aW9uLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgYGxvZGFzaGAgZnVuY3Rpb24uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIHZhciBsb2Rhc2ggPSBfLm5vQ29uZmxpY3QoKTtcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBub0NvbmZsaWN0KCkge1xuICAgICAgY29udGV4dC5fID0gb2xkRGFzaDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEEgbm8tb3BlcmF0aW9uIGZ1bmN0aW9uLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgb2JqZWN0ID0geyAnbmFtZSc6ICdmcmVkJyB9O1xuICAgICAqIF8ubm9vcChvYmplY3QpID09PSB1bmRlZmluZWQ7XG4gICAgICogLy8gPT4gdHJ1ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG5vb3AoKSB7XG4gICAgICAvLyBubyBvcGVyYXRpb24gcGVyZm9ybWVkXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxuICAgICAqICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgc3RhbXAgPSBfLm5vdygpO1xuICAgICAqIF8uZGVmZXIoZnVuY3Rpb24oKSB7IGNvbnNvbGUubG9nKF8ubm93KCkgLSBzdGFtcCk7IH0pO1xuICAgICAqIC8vID0+IGxvZ3MgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgaXQgdG9vayBmb3IgdGhlIGRlZmVycmVkIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZFxuICAgICAqL1xuICAgIHZhciBub3cgPSBpc05hdGl2ZShub3cgPSBEYXRlLm5vdykgJiYgbm93IHx8IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0aGUgZ2l2ZW4gdmFsdWUgaW50byBhbiBpbnRlZ2VyIG9mIHRoZSBzcGVjaWZpZWQgcmFkaXguXG4gICAgICogSWYgYHJhZGl4YCBpcyBgdW5kZWZpbmVkYCBvciBgMGAgYSBgcmFkaXhgIG9mIGAxMGAgaXMgdXNlZCB1bmxlc3MgdGhlXG4gICAgICogYHZhbHVlYCBpcyBhIGhleGFkZWNpbWFsLCBpbiB3aGljaCBjYXNlIGEgYHJhZGl4YCBvZiBgMTZgIGlzIHVzZWQuXG4gICAgICpcbiAgICAgKiBOb3RlOiBUaGlzIG1ldGhvZCBhdm9pZHMgZGlmZmVyZW5jZXMgaW4gbmF0aXZlIEVTMyBhbmQgRVM1IGBwYXJzZUludGBcbiAgICAgKiBpbXBsZW1lbnRhdGlvbnMuIFNlZSBodHRwOi8vZXM1LmdpdGh1Yi5pby8jRS5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgVGhlIHZhbHVlIHRvIHBhcnNlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbcmFkaXhdIFRoZSByYWRpeCB1c2VkIHRvIGludGVycHJldCB0aGUgdmFsdWUgdG8gcGFyc2UuXG4gICAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgbmV3IGludGVnZXIgdmFsdWUuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8ucGFyc2VJbnQoJzA4Jyk7XG4gICAgICogLy8gPT4gOFxuICAgICAqL1xuICAgIHZhciBwYXJzZUludCA9IG5hdGl2ZVBhcnNlSW50KHdoaXRlc3BhY2UgKyAnMDgnKSA9PSA4ID8gbmF0aXZlUGFyc2VJbnQgOiBmdW5jdGlvbih2YWx1ZSwgcmFkaXgpIHtcbiAgICAgIC8vIEZpcmVmb3ggPCAyMSBhbmQgT3BlcmEgPCAxNSBmb2xsb3cgdGhlIEVTMyBzcGVjaWZpZWQgaW1wbGVtZW50YXRpb24gb2YgYHBhcnNlSW50YFxuICAgICAgcmV0dXJuIG5hdGl2ZVBhcnNlSW50KGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlLnJlcGxhY2UocmVMZWFkaW5nU3BhY2VzQW5kWmVyb3MsICcnKSA6IHZhbHVlLCByYWRpeCB8fCAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIFwiXy5wbHVja1wiIHN0eWxlIGZ1bmN0aW9uLCB3aGljaCByZXR1cm5zIHRoZSBga2V5YCB2YWx1ZSBvZiBhXG4gICAgICogZ2l2ZW4gb2JqZWN0LlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIG5hbWUgb2YgdGhlIHByb3BlcnR5IHRvIHJldHJpZXZlLlxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGZ1bmN0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgY2hhcmFjdGVycyA9IFtcbiAgICAgKiAgIHsgJ25hbWUnOiAnZnJlZCcsICAgJ2FnZSc6IDQwIH0sXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9XG4gICAgICogXTtcbiAgICAgKlxuICAgICAqIHZhciBnZXROYW1lID0gXy5wcm9wZXJ0eSgnbmFtZScpO1xuICAgICAqXG4gICAgICogXy5tYXAoY2hhcmFjdGVycywgZ2V0TmFtZSk7XG4gICAgICogLy8gPT4gWydiYXJuZXknLCAnZnJlZCddXG4gICAgICpcbiAgICAgKiBfLnNvcnRCeShjaGFyYWN0ZXJzLCBnZXROYW1lKTtcbiAgICAgKiAvLyA9PiBbeyAnbmFtZSc6ICdiYXJuZXknLCAnYWdlJzogMzYgfSwgeyAnbmFtZSc6ICdmcmVkJywgICAnYWdlJzogNDAgfV1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBwcm9wZXJ0eShrZXkpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQcm9kdWNlcyBhIHJhbmRvbSBudW1iZXIgYmV0d2VlbiBgbWluYCBhbmQgYG1heGAgKGluY2x1c2l2ZSkuIElmIG9ubHkgb25lXG4gICAgICogYXJndW1lbnQgaXMgcHJvdmlkZWQgYSBudW1iZXIgYmV0d2VlbiBgMGAgYW5kIHRoZSBnaXZlbiBudW1iZXIgd2lsbCBiZVxuICAgICAqIHJldHVybmVkLiBJZiBgZmxvYXRpbmdgIGlzIHRydWV5IG9yIGVpdGhlciBgbWluYCBvciBgbWF4YCBhcmUgZmxvYXRzIGFcbiAgICAgKiBmbG9hdGluZy1wb2ludCBudW1iZXIgd2lsbCBiZSByZXR1cm5lZCBpbnN0ZWFkIG9mIGFuIGludGVnZXIuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFttaW49MF0gVGhlIG1pbmltdW0gcG9zc2libGUgdmFsdWUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFttYXg9MV0gVGhlIG1heGltdW0gcG9zc2libGUgdmFsdWUuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbZmxvYXRpbmc9ZmFsc2VdIFNwZWNpZnkgcmV0dXJuaW5nIGEgZmxvYXRpbmctcG9pbnQgbnVtYmVyLlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgYSByYW5kb20gbnVtYmVyLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfLnJhbmRvbSgwLCA1KTtcbiAgICAgKiAvLyA9PiBhbiBpbnRlZ2VyIGJldHdlZW4gMCBhbmQgNVxuICAgICAqXG4gICAgICogXy5yYW5kb20oNSk7XG4gICAgICogLy8gPT4gYWxzbyBhbiBpbnRlZ2VyIGJldHdlZW4gMCBhbmQgNVxuICAgICAqXG4gICAgICogXy5yYW5kb20oNSwgdHJ1ZSk7XG4gICAgICogLy8gPT4gYSBmbG9hdGluZy1wb2ludCBudW1iZXIgYmV0d2VlbiAwIGFuZCA1XG4gICAgICpcbiAgICAgKiBfLnJhbmRvbSgxLjIsIDUuMik7XG4gICAgICogLy8gPT4gYSBmbG9hdGluZy1wb2ludCBudW1iZXIgYmV0d2VlbiAxLjIgYW5kIDUuMlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJhbmRvbShtaW4sIG1heCwgZmxvYXRpbmcpIHtcbiAgICAgIHZhciBub01pbiA9IG1pbiA9PSBudWxsLFxuICAgICAgICAgIG5vTWF4ID0gbWF4ID09IG51bGw7XG5cbiAgICAgIGlmIChmbG9hdGluZyA9PSBudWxsKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbWluID09ICdib29sZWFuJyAmJiBub01heCkge1xuICAgICAgICAgIGZsb2F0aW5nID0gbWluO1xuICAgICAgICAgIG1pbiA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIW5vTWF4ICYmIHR5cGVvZiBtYXggPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgZmxvYXRpbmcgPSBtYXg7XG4gICAgICAgICAgbm9NYXggPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobm9NaW4gJiYgbm9NYXgpIHtcbiAgICAgICAgbWF4ID0gMTtcbiAgICAgIH1cbiAgICAgIG1pbiA9ICttaW4gfHwgMDtcbiAgICAgIGlmIChub01heCkge1xuICAgICAgICBtYXggPSBtaW47XG4gICAgICAgIG1pbiA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYXggPSArbWF4IHx8IDA7XG4gICAgICB9XG4gICAgICBpZiAoZmxvYXRpbmcgfHwgbWluICUgMSB8fCBtYXggJSAxKSB7XG4gICAgICAgIHZhciByYW5kID0gbmF0aXZlUmFuZG9tKCk7XG4gICAgICAgIHJldHVybiBuYXRpdmVNaW4obWluICsgKHJhbmQgKiAobWF4IC0gbWluICsgcGFyc2VGbG9hdCgnMWUtJyArICgocmFuZCArJycpLmxlbmd0aCAtIDEpKSkpLCBtYXgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGJhc2VSYW5kb20obWluLCBtYXgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc29sdmVzIHRoZSB2YWx1ZSBvZiBwcm9wZXJ0eSBga2V5YCBvbiBgb2JqZWN0YC4gSWYgYGtleWAgaXMgYSBmdW5jdGlvblxuICAgICAqIGl0IHdpbGwgYmUgaW52b2tlZCB3aXRoIHRoZSBgdGhpc2AgYmluZGluZyBvZiBgb2JqZWN0YCBhbmQgaXRzIHJlc3VsdCByZXR1cm5lZCxcbiAgICAgKiBlbHNlIHRoZSBwcm9wZXJ0eSB2YWx1ZSBpcyByZXR1cm5lZC4gSWYgYG9iamVjdGAgaXMgZmFsc2V5IHRoZW4gYHVuZGVmaW5lZGBcbiAgICAgKiBpcyByZXR1cm5lZC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaW5zcGVjdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSB0byByZXNvbHZlLlxuICAgICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSByZXNvbHZlZCB2YWx1ZS5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIG9iamVjdCA9IHtcbiAgICAgKiAgICdjaGVlc2UnOiAnY3J1bXBldHMnLFxuICAgICAqICAgJ3N0dWZmJzogZnVuY3Rpb24oKSB7XG4gICAgICogICAgIHJldHVybiAnbm9uc2Vuc2UnO1xuICAgICAqICAgfVxuICAgICAqIH07XG4gICAgICpcbiAgICAgKiBfLnJlc3VsdChvYmplY3QsICdjaGVlc2UnKTtcbiAgICAgKiAvLyA9PiAnY3J1bXBldHMnXG4gICAgICpcbiAgICAgKiBfLnJlc3VsdChvYmplY3QsICdzdHVmZicpO1xuICAgICAqIC8vID0+ICdub25zZW5zZSdcbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZXN1bHQob2JqZWN0LCBrZXkpIHtcbiAgICAgIGlmIChvYmplY3QpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgICAgIHJldHVybiBpc0Z1bmN0aW9uKHZhbHVlKSA/IG9iamVjdFtrZXldKCkgOiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBIG1pY3JvLXRlbXBsYXRpbmcgbWV0aG9kIHRoYXQgaGFuZGxlcyBhcmJpdHJhcnkgZGVsaW1pdGVycywgcHJlc2VydmVzXG4gICAgICogd2hpdGVzcGFjZSwgYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gICAgICpcbiAgICAgKiBOb3RlOiBJbiB0aGUgZGV2ZWxvcG1lbnQgYnVpbGQsIGBfLnRlbXBsYXRlYCB1dGlsaXplcyBzb3VyY2VVUkxzIGZvciBlYXNpZXJcbiAgICAgKiBkZWJ1Z2dpbmcuIFNlZSBodHRwOi8vd3d3Lmh0bWw1cm9ja3MuY29tL2VuL3R1dG9yaWFscy9kZXZlbG9wZXJ0b29scy9zb3VyY2VtYXBzLyN0b2Mtc291cmNldXJsXG4gICAgICpcbiAgICAgKiBGb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBwcmVjb21waWxpbmcgdGVtcGxhdGVzIHNlZTpcbiAgICAgKiBodHRwOi8vbG9kYXNoLmNvbS9jdXN0b20tYnVpbGRzXG4gICAgICpcbiAgICAgKiBGb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBDaHJvbWUgZXh0ZW5zaW9uIHNhbmRib3hlcyBzZWU6XG4gICAgICogaHR0cDovL2RldmVsb3Blci5jaHJvbWUuY29tL3N0YWJsZS9leHRlbnNpb25zL3NhbmRib3hpbmdFdmFsLmh0bWxcbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBUaGUgdGVtcGxhdGUgdGV4dC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgZGF0YSBvYmplY3QgdXNlZCB0byBwb3B1bGF0ZSB0aGUgdGV4dC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFRoZSBvcHRpb25zIG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge1JlZ0V4cH0gW29wdGlvbnMuZXNjYXBlXSBUaGUgXCJlc2NhcGVcIiBkZWxpbWl0ZXIuXG4gICAgICogQHBhcmFtIHtSZWdFeHB9IFtvcHRpb25zLmV2YWx1YXRlXSBUaGUgXCJldmFsdWF0ZVwiIGRlbGltaXRlci5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMuaW1wb3J0c10gQW4gb2JqZWN0IHRvIGltcG9ydCBpbnRvIHRoZSB0ZW1wbGF0ZSBhcyBsb2NhbCB2YXJpYWJsZXMuXG4gICAgICogQHBhcmFtIHtSZWdFeHB9IFtvcHRpb25zLmludGVycG9sYXRlXSBUaGUgXCJpbnRlcnBvbGF0ZVwiIGRlbGltaXRlci5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NvdXJjZVVSTF0gVGhlIHNvdXJjZVVSTCBvZiB0aGUgdGVtcGxhdGUncyBjb21waWxlZCBzb3VyY2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFt2YXJpYWJsZV0gVGhlIGRhdGEgb2JqZWN0IHZhcmlhYmxlIG5hbWUuXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufHN0cmluZ30gUmV0dXJucyBhIGNvbXBpbGVkIGZ1bmN0aW9uIHdoZW4gbm8gYGRhdGFgIG9iamVjdFxuICAgICAqICBpcyBnaXZlbiwgZWxzZSBpdCByZXR1cm5zIHRoZSBpbnRlcnBvbGF0ZWQgdGV4dC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogLy8gdXNpbmcgdGhlIFwiaW50ZXJwb2xhdGVcIiBkZWxpbWl0ZXIgdG8gY3JlYXRlIGEgY29tcGlsZWQgdGVtcGxhdGVcbiAgICAgKiB2YXIgY29tcGlsZWQgPSBfLnRlbXBsYXRlKCdoZWxsbyA8JT0gbmFtZSAlPicpO1xuICAgICAqIGNvbXBpbGVkKHsgJ25hbWUnOiAnZnJlZCcgfSk7XG4gICAgICogLy8gPT4gJ2hlbGxvIGZyZWQnXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyB0aGUgXCJlc2NhcGVcIiBkZWxpbWl0ZXIgdG8gZXNjYXBlIEhUTUwgaW4gZGF0YSBwcm9wZXJ0eSB2YWx1ZXNcbiAgICAgKiBfLnRlbXBsYXRlKCc8Yj48JS0gdmFsdWUgJT48L2I+JywgeyAndmFsdWUnOiAnPHNjcmlwdD4nIH0pO1xuICAgICAqIC8vID0+ICc8Yj4mbHQ7c2NyaXB0Jmd0OzwvYj4nXG4gICAgICpcbiAgICAgKiAvLyB1c2luZyB0aGUgXCJldmFsdWF0ZVwiIGRlbGltaXRlciB0byBnZW5lcmF0ZSBIVE1MXG4gICAgICogdmFyIGxpc3QgPSAnPCUgXy5mb3JFYWNoKHBlb3BsZSwgZnVuY3Rpb24obmFtZSkgeyAlPjxsaT48JS0gbmFtZSAlPjwvbGk+PCUgfSk7ICU+JztcbiAgICAgKiBfLnRlbXBsYXRlKGxpc3QsIHsgJ3Blb3BsZSc6IFsnZnJlZCcsICdiYXJuZXknXSB9KTtcbiAgICAgKiAvLyA9PiAnPGxpPmZyZWQ8L2xpPjxsaT5iYXJuZXk8L2xpPidcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIHRoZSBFUzYgZGVsaW1pdGVyIGFzIGFuIGFsdGVybmF0aXZlIHRvIHRoZSBkZWZhdWx0IFwiaW50ZXJwb2xhdGVcIiBkZWxpbWl0ZXJcbiAgICAgKiBfLnRlbXBsYXRlKCdoZWxsbyAkeyBuYW1lIH0nLCB7ICduYW1lJzogJ3BlYmJsZXMnIH0pO1xuICAgICAqIC8vID0+ICdoZWxsbyBwZWJibGVzJ1xuICAgICAqXG4gICAgICogLy8gdXNpbmcgdGhlIGludGVybmFsIGBwcmludGAgZnVuY3Rpb24gaW4gXCJldmFsdWF0ZVwiIGRlbGltaXRlcnNcbiAgICAgKiBfLnRlbXBsYXRlKCc8JSBwcmludChcImhlbGxvIFwiICsgbmFtZSk7ICU+IScsIHsgJ25hbWUnOiAnYmFybmV5JyB9KTtcbiAgICAgKiAvLyA9PiAnaGVsbG8gYmFybmV5ISdcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIGEgY3VzdG9tIHRlbXBsYXRlIGRlbGltaXRlcnNcbiAgICAgKiBfLnRlbXBsYXRlU2V0dGluZ3MgPSB7XG4gICAgICogICAnaW50ZXJwb2xhdGUnOiAve3soW1xcc1xcU10rPyl9fS9nXG4gICAgICogfTtcbiAgICAgKlxuICAgICAqIF8udGVtcGxhdGUoJ2hlbGxvIHt7IG5hbWUgfX0hJywgeyAnbmFtZSc6ICdtdXN0YWNoZScgfSk7XG4gICAgICogLy8gPT4gJ2hlbGxvIG11c3RhY2hlISdcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIHRoZSBgaW1wb3J0c2Agb3B0aW9uIHRvIGltcG9ydCBqUXVlcnlcbiAgICAgKiB2YXIgbGlzdCA9ICc8JSBqcS5lYWNoKHBlb3BsZSwgZnVuY3Rpb24obmFtZSkgeyAlPjxsaT48JS0gbmFtZSAlPjwvbGk+PCUgfSk7ICU+JztcbiAgICAgKiBfLnRlbXBsYXRlKGxpc3QsIHsgJ3Blb3BsZSc6IFsnZnJlZCcsICdiYXJuZXknXSB9LCB7ICdpbXBvcnRzJzogeyAnanEnOiBqUXVlcnkgfSB9KTtcbiAgICAgKiAvLyA9PiAnPGxpPmZyZWQ8L2xpPjxsaT5iYXJuZXk8L2xpPidcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIHRoZSBgc291cmNlVVJMYCBvcHRpb24gdG8gc3BlY2lmeSBhIGN1c3RvbSBzb3VyY2VVUkwgZm9yIHRoZSB0ZW1wbGF0ZVxuICAgICAqIHZhciBjb21waWxlZCA9IF8udGVtcGxhdGUoJ2hlbGxvIDwlPSBuYW1lICU+JywgbnVsbCwgeyAnc291cmNlVVJMJzogJy9iYXNpYy9ncmVldGluZy5qc3QnIH0pO1xuICAgICAqIGNvbXBpbGVkKGRhdGEpO1xuICAgICAqIC8vID0+IGZpbmQgdGhlIHNvdXJjZSBvZiBcImdyZWV0aW5nLmpzdFwiIHVuZGVyIHRoZSBTb3VyY2VzIHRhYiBvciBSZXNvdXJjZXMgcGFuZWwgb2YgdGhlIHdlYiBpbnNwZWN0b3JcbiAgICAgKlxuICAgICAqIC8vIHVzaW5nIHRoZSBgdmFyaWFibGVgIG9wdGlvbiB0byBlbnN1cmUgYSB3aXRoLXN0YXRlbWVudCBpc24ndCB1c2VkIGluIHRoZSBjb21waWxlZCB0ZW1wbGF0ZVxuICAgICAqIHZhciBjb21waWxlZCA9IF8udGVtcGxhdGUoJ2hpIDwlPSBkYXRhLm5hbWUgJT4hJywgbnVsbCwgeyAndmFyaWFibGUnOiAnZGF0YScgfSk7XG4gICAgICogY29tcGlsZWQuc291cmNlO1xuICAgICAqIC8vID0+IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgKiAgIHZhciBfX3QsIF9fcCA9ICcnLCBfX2UgPSBfLmVzY2FwZTtcbiAgICAgKiAgIF9fcCArPSAnaGkgJyArICgoX190ID0gKCBkYXRhLm5hbWUgKSkgPT0gbnVsbCA/ICcnIDogX190KSArICchJztcbiAgICAgKiAgIHJldHVybiBfX3A7XG4gICAgICogfVxuICAgICAqXG4gICAgICogLy8gdXNpbmcgdGhlIGBzb3VyY2VgIHByb3BlcnR5IHRvIGlubGluZSBjb21waWxlZCB0ZW1wbGF0ZXMgZm9yIG1lYW5pbmdmdWxcbiAgICAgKiAvLyBsaW5lIG51bWJlcnMgaW4gZXJyb3IgbWVzc2FnZXMgYW5kIGEgc3RhY2sgdHJhY2VcbiAgICAgKiBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihjd2QsICdqc3QuanMnKSwgJ1xcXG4gICAgICogICB2YXIgSlNUID0ge1xcXG4gICAgICogICAgIFwibWFpblwiOiAnICsgXy50ZW1wbGF0ZShtYWluVGV4dCkuc291cmNlICsgJ1xcXG4gICAgICogICB9O1xcXG4gICAgICogJyk7XG4gICAgICovXG4gICAgZnVuY3Rpb24gdGVtcGxhdGUodGV4dCwgZGF0YSwgb3B0aW9ucykge1xuICAgICAgLy8gYmFzZWQgb24gSm9obiBSZXNpZydzIGB0bXBsYCBpbXBsZW1lbnRhdGlvblxuICAgICAgLy8gaHR0cDovL2Vqb2huLm9yZy9ibG9nL2phdmFzY3JpcHQtbWljcm8tdGVtcGxhdGluZy9cbiAgICAgIC8vIGFuZCBMYXVyYSBEb2t0b3JvdmEncyBkb1QuanNcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9vbGFkby9kb1RcbiAgICAgIHZhciBzZXR0aW5ncyA9IGxvZGFzaC50ZW1wbGF0ZVNldHRpbmdzO1xuICAgICAgdGV4dCA9IFN0cmluZyh0ZXh0IHx8ICcnKTtcblxuICAgICAgLy8gYXZvaWQgbWlzc2luZyBkZXBlbmRlbmNpZXMgd2hlbiBgaXRlcmF0b3JUZW1wbGF0ZWAgaXMgbm90IGRlZmluZWRcbiAgICAgIG9wdGlvbnMgPSBkZWZhdWx0cyh7fSwgb3B0aW9ucywgc2V0dGluZ3MpO1xuXG4gICAgICB2YXIgaW1wb3J0cyA9IGRlZmF1bHRzKHt9LCBvcHRpb25zLmltcG9ydHMsIHNldHRpbmdzLmltcG9ydHMpLFxuICAgICAgICAgIGltcG9ydHNLZXlzID0ga2V5cyhpbXBvcnRzKSxcbiAgICAgICAgICBpbXBvcnRzVmFsdWVzID0gdmFsdWVzKGltcG9ydHMpO1xuXG4gICAgICB2YXIgaXNFdmFsdWF0aW5nLFxuICAgICAgICAgIGluZGV4ID0gMCxcbiAgICAgICAgICBpbnRlcnBvbGF0ZSA9IG9wdGlvbnMuaW50ZXJwb2xhdGUgfHwgcmVOb01hdGNoLFxuICAgICAgICAgIHNvdXJjZSA9IFwiX19wICs9ICdcIjtcblxuICAgICAgLy8gY29tcGlsZSB0aGUgcmVnZXhwIHRvIG1hdGNoIGVhY2ggZGVsaW1pdGVyXG4gICAgICB2YXIgcmVEZWxpbWl0ZXJzID0gUmVnRXhwKFxuICAgICAgICAob3B0aW9ucy5lc2NhcGUgfHwgcmVOb01hdGNoKS5zb3VyY2UgKyAnfCcgK1xuICAgICAgICBpbnRlcnBvbGF0ZS5zb3VyY2UgKyAnfCcgK1xuICAgICAgICAoaW50ZXJwb2xhdGUgPT09IHJlSW50ZXJwb2xhdGUgPyByZUVzVGVtcGxhdGUgOiByZU5vTWF0Y2gpLnNvdXJjZSArICd8JyArXG4gICAgICAgIChvcHRpb25zLmV2YWx1YXRlIHx8IHJlTm9NYXRjaCkuc291cmNlICsgJ3wkJ1xuICAgICAgLCAnZycpO1xuXG4gICAgICB0ZXh0LnJlcGxhY2UocmVEZWxpbWl0ZXJzLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlVmFsdWUsIGludGVycG9sYXRlVmFsdWUsIGVzVGVtcGxhdGVWYWx1ZSwgZXZhbHVhdGVWYWx1ZSwgb2Zmc2V0KSB7XG4gICAgICAgIGludGVycG9sYXRlVmFsdWUgfHwgKGludGVycG9sYXRlVmFsdWUgPSBlc1RlbXBsYXRlVmFsdWUpO1xuXG4gICAgICAgIC8vIGVzY2FwZSBjaGFyYWN0ZXJzIHRoYXQgY2Fubm90IGJlIGluY2x1ZGVkIGluIHN0cmluZyBsaXRlcmFsc1xuICAgICAgICBzb3VyY2UgKz0gdGV4dC5zbGljZShpbmRleCwgb2Zmc2V0KS5yZXBsYWNlKHJlVW5lc2NhcGVkU3RyaW5nLCBlc2NhcGVTdHJpbmdDaGFyKTtcblxuICAgICAgICAvLyByZXBsYWNlIGRlbGltaXRlcnMgd2l0aCBzbmlwcGV0c1xuICAgICAgICBpZiAoZXNjYXBlVmFsdWUpIHtcbiAgICAgICAgICBzb3VyY2UgKz0gXCInICtcXG5fX2UoXCIgKyBlc2NhcGVWYWx1ZSArIFwiKSArXFxuJ1wiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChldmFsdWF0ZVZhbHVlKSB7XG4gICAgICAgICAgaXNFdmFsdWF0aW5nID0gdHJ1ZTtcbiAgICAgICAgICBzb3VyY2UgKz0gXCInO1xcblwiICsgZXZhbHVhdGVWYWx1ZSArIFwiO1xcbl9fcCArPSAnXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGludGVycG9sYXRlVmFsdWUpIHtcbiAgICAgICAgICBzb3VyY2UgKz0gXCInICtcXG4oKF9fdCA9IChcIiArIGludGVycG9sYXRlVmFsdWUgKyBcIikpID09IG51bGwgPyAnJyA6IF9fdCkgK1xcbidcIjtcbiAgICAgICAgfVxuICAgICAgICBpbmRleCA9IG9mZnNldCArIG1hdGNoLmxlbmd0aDtcblxuICAgICAgICAvLyB0aGUgSlMgZW5naW5lIGVtYmVkZGVkIGluIEFkb2JlIHByb2R1Y3RzIHJlcXVpcmVzIHJldHVybmluZyB0aGUgYG1hdGNoYFxuICAgICAgICAvLyBzdHJpbmcgaW4gb3JkZXIgdG8gcHJvZHVjZSB0aGUgY29ycmVjdCBgb2Zmc2V0YCB2YWx1ZVxuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9KTtcblxuICAgICAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICAgICAgLy8gaWYgYHZhcmlhYmxlYCBpcyBub3Qgc3BlY2lmaWVkLCB3cmFwIGEgd2l0aC1zdGF0ZW1lbnQgYXJvdW5kIHRoZSBnZW5lcmF0ZWRcbiAgICAgIC8vIGNvZGUgdG8gYWRkIHRoZSBkYXRhIG9iamVjdCB0byB0aGUgdG9wIG9mIHRoZSBzY29wZSBjaGFpblxuICAgICAgdmFyIHZhcmlhYmxlID0gb3B0aW9ucy52YXJpYWJsZSxcbiAgICAgICAgICBoYXNWYXJpYWJsZSA9IHZhcmlhYmxlO1xuXG4gICAgICBpZiAoIWhhc1ZhcmlhYmxlKSB7XG4gICAgICAgIHZhcmlhYmxlID0gJ29iaic7XG4gICAgICAgIHNvdXJjZSA9ICd3aXRoICgnICsgdmFyaWFibGUgKyAnKSB7XFxuJyArIHNvdXJjZSArICdcXG59XFxuJztcbiAgICAgIH1cbiAgICAgIC8vIGNsZWFudXAgY29kZSBieSBzdHJpcHBpbmcgZW1wdHkgc3RyaW5nc1xuICAgICAgc291cmNlID0gKGlzRXZhbHVhdGluZyA/IHNvdXJjZS5yZXBsYWNlKHJlRW1wdHlTdHJpbmdMZWFkaW5nLCAnJykgOiBzb3VyY2UpXG4gICAgICAgIC5yZXBsYWNlKHJlRW1wdHlTdHJpbmdNaWRkbGUsICckMScpXG4gICAgICAgIC5yZXBsYWNlKHJlRW1wdHlTdHJpbmdUcmFpbGluZywgJyQxOycpO1xuXG4gICAgICAvLyBmcmFtZSBjb2RlIGFzIHRoZSBmdW5jdGlvbiBib2R5XG4gICAgICBzb3VyY2UgPSAnZnVuY3Rpb24oJyArIHZhcmlhYmxlICsgJykge1xcbicgK1xuICAgICAgICAoaGFzVmFyaWFibGUgPyAnJyA6IHZhcmlhYmxlICsgJyB8fCAoJyArIHZhcmlhYmxlICsgJyA9IHt9KTtcXG4nKSArXG4gICAgICAgIFwidmFyIF9fdCwgX19wID0gJycsIF9fZSA9IF8uZXNjYXBlXCIgK1xuICAgICAgICAoaXNFdmFsdWF0aW5nXG4gICAgICAgICAgPyAnLCBfX2ogPSBBcnJheS5wcm90b3R5cGUuam9pbjtcXG4nICtcbiAgICAgICAgICAgIFwiZnVuY3Rpb24gcHJpbnQoKSB7IF9fcCArPSBfX2ouY2FsbChhcmd1bWVudHMsICcnKSB9XFxuXCJcbiAgICAgICAgICA6ICc7XFxuJ1xuICAgICAgICApICtcbiAgICAgICAgc291cmNlICtcbiAgICAgICAgJ3JldHVybiBfX3BcXG59JztcblxuICAgICAgLy8gVXNlIGEgc291cmNlVVJMIGZvciBlYXNpZXIgZGVidWdnaW5nLlxuICAgICAgLy8gaHR0cDovL3d3dy5odG1sNXJvY2tzLmNvbS9lbi90dXRvcmlhbHMvZGV2ZWxvcGVydG9vbHMvc291cmNlbWFwcy8jdG9jLXNvdXJjZXVybFxuICAgICAgdmFyIHNvdXJjZVVSTCA9ICdcXG4vKlxcbi8vIyBzb3VyY2VVUkw9JyArIChvcHRpb25zLnNvdXJjZVVSTCB8fCAnL2xvZGFzaC90ZW1wbGF0ZS9zb3VyY2VbJyArICh0ZW1wbGF0ZUNvdW50ZXIrKykgKyAnXScpICsgJ1xcbiovJztcblxuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IEZ1bmN0aW9uKGltcG9ydHNLZXlzLCAncmV0dXJuICcgKyBzb3VyY2UgKyBzb3VyY2VVUkwpLmFwcGx5KHVuZGVmaW5lZCwgaW1wb3J0c1ZhbHVlcyk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgZS5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICByZXR1cm4gcmVzdWx0KGRhdGEpO1xuICAgICAgfVxuICAgICAgLy8gcHJvdmlkZSB0aGUgY29tcGlsZWQgZnVuY3Rpb24ncyBzb3VyY2UgYnkgaXRzIGB0b1N0cmluZ2AgbWV0aG9kLCBpblxuICAgICAgLy8gc3VwcG9ydGVkIGVudmlyb25tZW50cywgb3IgdGhlIGBzb3VyY2VgIHByb3BlcnR5IGFzIGEgY29udmVuaWVuY2UgZm9yXG4gICAgICAvLyBpbmxpbmluZyBjb21waWxlZCB0ZW1wbGF0ZXMgZHVyaW5nIHRoZSBidWlsZCBwcm9jZXNzXG4gICAgICByZXN1bHQuc291cmNlID0gc291cmNlO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlcyB0aGUgY2FsbGJhY2sgYG5gIHRpbWVzLCByZXR1cm5pbmcgYW4gYXJyYXkgb2YgdGhlIHJlc3VsdHNcbiAgICAgKiBvZiBlYWNoIGNhbGxiYWNrIGV4ZWN1dGlvbi4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZFxuICAgICAqIHdpdGggb25lIGFyZ3VtZW50OyAoaW5kZXgpLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBuIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gZXhlY3V0ZSB0aGUgY2FsbGJhY2suXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIGNhbGxlZCBwZXIgaXRlcmF0aW9uLlxuICAgICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyBhbiBhcnJheSBvZiB0aGUgcmVzdWx0cyBvZiBlYWNoIGBjYWxsYmFja2AgZXhlY3V0aW9uLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiB2YXIgZGljZVJvbGxzID0gXy50aW1lcygzLCBfLnBhcnRpYWwoXy5yYW5kb20sIDEsIDYpKTtcbiAgICAgKiAvLyA9PiBbMywgNiwgNF1cbiAgICAgKlxuICAgICAqIF8udGltZXMoMywgZnVuY3Rpb24obikgeyBtYWdlLmNhc3RTcGVsbChuKTsgfSk7XG4gICAgICogLy8gPT4gY2FsbHMgYG1hZ2UuY2FzdFNwZWxsKG4pYCB0aHJlZSB0aW1lcywgcGFzc2luZyBgbmAgb2YgYDBgLCBgMWAsIGFuZCBgMmAgcmVzcGVjdGl2ZWx5XG4gICAgICpcbiAgICAgKiBfLnRpbWVzKDMsIGZ1bmN0aW9uKG4pIHsgdGhpcy5jYXN0KG4pOyB9LCBtYWdlKTtcbiAgICAgKiAvLyA9PiBhbHNvIGNhbGxzIGBtYWdlLmNhc3RTcGVsbChuKWAgdGhyZWUgdGltZXNcbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0aW1lcyhuLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgbiA9IChuID0gK24pID4gLTEgPyBuIDogMDtcbiAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgIHJlc3VsdCA9IEFycmF5KG4pO1xuXG4gICAgICBjYWxsYmFjayA9IGJhc2VDcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMSk7XG4gICAgICB3aGlsZSAoKytpbmRleCA8IG4pIHtcbiAgICAgICAgcmVzdWx0W2luZGV4XSA9IGNhbGxiYWNrKGluZGV4KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIGludmVyc2Ugb2YgYF8uZXNjYXBlYCB0aGlzIG1ldGhvZCBjb252ZXJ0cyB0aGUgSFRNTCBlbnRpdGllc1xuICAgICAqIGAmYW1wO2AsIGAmbHQ7YCwgYCZndDtgLCBgJnF1b3Q7YCwgYW5kIGAmIzM5O2AgaW4gYHN0cmluZ2AgdG8gdGhlaXJcbiAgICAgKiBjb3JyZXNwb25kaW5nIGNoYXJhY3RlcnMuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBUaGUgc3RyaW5nIHRvIHVuZXNjYXBlLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIHVuZXNjYXBlZCBzdHJpbmcuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8udW5lc2NhcGUoJ0ZyZWQsIEJhcm5leSAmYW1wOyBQZWJibGVzJyk7XG4gICAgICogLy8gPT4gJ0ZyZWQsIEJhcm5leSAmIFBlYmJsZXMnXG4gICAgICovXG4gICAgZnVuY3Rpb24gdW5lc2NhcGUoc3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nID09IG51bGwgPyAnJyA6IFN0cmluZyhzdHJpbmcpLnJlcGxhY2UocmVFc2NhcGVkSHRtbCwgdW5lc2NhcGVIdG1sQ2hhcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGEgdW5pcXVlIElELiBJZiBgcHJlZml4YCBpcyBwcm92aWRlZCB0aGUgSUQgd2lsbCBiZSBhcHBlbmRlZCB0byBpdC5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3ByZWZpeF0gVGhlIHZhbHVlIHRvIHByZWZpeCB0aGUgSUQgd2l0aC5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSB1bmlxdWUgSUQuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKlxuICAgICAqIF8udW5pcXVlSWQoJ2NvbnRhY3RfJyk7XG4gICAgICogLy8gPT4gJ2NvbnRhY3RfMTA0J1xuICAgICAqXG4gICAgICogXy51bmlxdWVJZCgpO1xuICAgICAqIC8vID0+ICcxMDUnXG4gICAgICovXG4gICAgZnVuY3Rpb24gdW5pcXVlSWQocHJlZml4KSB7XG4gICAgICB2YXIgaWQgPSArK2lkQ291bnRlcjtcbiAgICAgIHJldHVybiBTdHJpbmcocHJlZml4ID09IG51bGwgPyAnJyA6IHByZWZpeCkgKyBpZDtcbiAgICB9XG5cbiAgICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBgbG9kYXNoYCBvYmplY3QgdGhhdCB3cmFwcyB0aGUgZ2l2ZW4gdmFsdWUgd2l0aCBleHBsaWNpdFxuICAgICAqIG1ldGhvZCBjaGFpbmluZyBlbmFibGVkLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IENoYWluaW5nXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gd3JhcC5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICAnYWdlJzogMzYgfSxcbiAgICAgKiAgIHsgJ25hbWUnOiAnZnJlZCcsICAgICdhZ2UnOiA0MCB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdwZWJibGVzJywgJ2FnZSc6IDEgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiB2YXIgeW91bmdlc3QgPSBfLmNoYWluKGNoYXJhY3RlcnMpXG4gICAgICogICAgIC5zb3J0QnkoJ2FnZScpXG4gICAgICogICAgIC5tYXAoZnVuY3Rpb24oY2hyKSB7IHJldHVybiBjaHIubmFtZSArICcgaXMgJyArIGNoci5hZ2U7IH0pXG4gICAgICogICAgIC5maXJzdCgpXG4gICAgICogICAgIC52YWx1ZSgpO1xuICAgICAqIC8vID0+ICdwZWJibGVzIGlzIDEnXG4gICAgICovXG4gICAgZnVuY3Rpb24gY2hhaW4odmFsdWUpIHtcbiAgICAgIHZhbHVlID0gbmV3IGxvZGFzaFdyYXBwZXIodmFsdWUpO1xuICAgICAgdmFsdWUuX19jaGFpbl9fID0gdHJ1ZTtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbnZva2VzIGBpbnRlcmNlcHRvcmAgd2l0aCB0aGUgYHZhbHVlYCBhcyB0aGUgZmlyc3QgYXJndW1lbnQgYW5kIHRoZW5cbiAgICAgKiByZXR1cm5zIGB2YWx1ZWAuIFRoZSBwdXJwb3NlIG9mIHRoaXMgbWV0aG9kIGlzIHRvIFwidGFwIGludG9cIiBhIG1ldGhvZFxuICAgICAqIGNoYWluIGluIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW5cbiAgICAgKiB0aGUgY2hhaW4uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAY2F0ZWdvcnkgQ2hhaW5pbmdcbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBwcm92aWRlIHRvIGBpbnRlcmNlcHRvcmAuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gaW50ZXJjZXB0b3IgVGhlIGZ1bmN0aW9uIHRvIGludm9rZS5cbiAgICAgKiBAcmV0dXJucyB7Kn0gUmV0dXJucyBgdmFsdWVgLlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBfKFsxLCAyLCAzLCA0XSlcbiAgICAgKiAgLnRhcChmdW5jdGlvbihhcnJheSkgeyBhcnJheS5wb3AoKTsgfSlcbiAgICAgKiAgLnJldmVyc2UoKVxuICAgICAqICAudmFsdWUoKTtcbiAgICAgKiAvLyA9PiBbMywgMiwgMV1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0YXAodmFsdWUsIGludGVyY2VwdG9yKSB7XG4gICAgICBpbnRlcmNlcHRvcih2YWx1ZSk7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRW5hYmxlcyBleHBsaWNpdCBtZXRob2QgY2hhaW5pbmcgb24gdGhlIHdyYXBwZXIgb2JqZWN0LlxuICAgICAqXG4gICAgICogQG5hbWUgY2hhaW5cbiAgICAgKiBAbWVtYmVyT2YgX1xuICAgICAqIEBjYXRlZ29yeSBDaGFpbmluZ1xuICAgICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogdmFyIGNoYXJhY3RlcnMgPSBbXG4gICAgICogICB7ICduYW1lJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9LFxuICAgICAqICAgeyAnbmFtZSc6ICdmcmVkJywgICAnYWdlJzogNDAgfVxuICAgICAqIF07XG4gICAgICpcbiAgICAgKiAvLyB3aXRob3V0IGV4cGxpY2l0IGNoYWluaW5nXG4gICAgICogXyhjaGFyYWN0ZXJzKS5maXJzdCgpO1xuICAgICAqIC8vID0+IHsgJ25hbWUnOiAnYmFybmV5JywgJ2FnZSc6IDM2IH1cbiAgICAgKlxuICAgICAqIC8vIHdpdGggZXhwbGljaXQgY2hhaW5pbmdcbiAgICAgKiBfKGNoYXJhY3RlcnMpLmNoYWluKClcbiAgICAgKiAgIC5maXJzdCgpXG4gICAgICogICAucGljaygnYWdlJylcbiAgICAgKiAgIC52YWx1ZSgpO1xuICAgICAqIC8vID0+IHsgJ2FnZSc6IDM2IH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB3cmFwcGVyQ2hhaW4oKSB7XG4gICAgICB0aGlzLl9fY2hhaW5fXyA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQcm9kdWNlcyB0aGUgYHRvU3RyaW5nYCByZXN1bHQgb2YgdGhlIHdyYXBwZWQgdmFsdWUuXG4gICAgICpcbiAgICAgKiBAbmFtZSB0b1N0cmluZ1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQGNhdGVnb3J5IENoYWluaW5nXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgc3RyaW5nIHJlc3VsdC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXyhbMSwgMiwgM10pLnRvU3RyaW5nKCk7XG4gICAgICogLy8gPT4gJzEsMiwzJ1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIHdyYXBwZXJUb1N0cmluZygpIHtcbiAgICAgIHJldHVybiBTdHJpbmcodGhpcy5fX3dyYXBwZWRfXyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgdGhlIHdyYXBwZWQgdmFsdWUuXG4gICAgICpcbiAgICAgKiBAbmFtZSB2YWx1ZU9mXG4gICAgICogQG1lbWJlck9mIF9cbiAgICAgKiBAYWxpYXMgdmFsdWVcbiAgICAgKiBAY2F0ZWdvcnkgQ2hhaW5pbmdcbiAgICAgKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgd3JhcHBlZCB2YWx1ZS5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqXG4gICAgICogXyhbMSwgMiwgM10pLnZhbHVlT2YoKTtcbiAgICAgKiAvLyA9PiBbMSwgMiwgM11cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB3cmFwcGVyVmFsdWVPZigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9fd3JhcHBlZF9fO1xuICAgIH1cblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLy8gYWRkIGZ1bmN0aW9ucyB0aGF0IHJldHVybiB3cmFwcGVkIHZhbHVlcyB3aGVuIGNoYWluaW5nXG4gICAgbG9kYXNoLmFmdGVyID0gYWZ0ZXI7XG4gICAgbG9kYXNoLmFzc2lnbiA9IGFzc2lnbjtcbiAgICBsb2Rhc2guYXQgPSBhdDtcbiAgICBsb2Rhc2guYmluZCA9IGJpbmQ7XG4gICAgbG9kYXNoLmJpbmRBbGwgPSBiaW5kQWxsO1xuICAgIGxvZGFzaC5iaW5kS2V5ID0gYmluZEtleTtcbiAgICBsb2Rhc2guY2hhaW4gPSBjaGFpbjtcbiAgICBsb2Rhc2guY29tcGFjdCA9IGNvbXBhY3Q7XG4gICAgbG9kYXNoLmNvbXBvc2UgPSBjb21wb3NlO1xuICAgIGxvZGFzaC5jb25zdGFudCA9IGNvbnN0YW50O1xuICAgIGxvZGFzaC5jb3VudEJ5ID0gY291bnRCeTtcbiAgICBsb2Rhc2guY3JlYXRlID0gY3JlYXRlO1xuICAgIGxvZGFzaC5jcmVhdGVDYWxsYmFjayA9IGNyZWF0ZUNhbGxiYWNrO1xuICAgIGxvZGFzaC5jdXJyeSA9IGN1cnJ5O1xuICAgIGxvZGFzaC5kZWJvdW5jZSA9IGRlYm91bmNlO1xuICAgIGxvZGFzaC5kZWZhdWx0cyA9IGRlZmF1bHRzO1xuICAgIGxvZGFzaC5kZWZlciA9IGRlZmVyO1xuICAgIGxvZGFzaC5kZWxheSA9IGRlbGF5O1xuICAgIGxvZGFzaC5kaWZmZXJlbmNlID0gZGlmZmVyZW5jZTtcbiAgICBsb2Rhc2guZmlsdGVyID0gZmlsdGVyO1xuICAgIGxvZGFzaC5mbGF0dGVuID0gZmxhdHRlbjtcbiAgICBsb2Rhc2guZm9yRWFjaCA9IGZvckVhY2g7XG4gICAgbG9kYXNoLmZvckVhY2hSaWdodCA9IGZvckVhY2hSaWdodDtcbiAgICBsb2Rhc2guZm9ySW4gPSBmb3JJbjtcbiAgICBsb2Rhc2guZm9ySW5SaWdodCA9IGZvckluUmlnaHQ7XG4gICAgbG9kYXNoLmZvck93biA9IGZvck93bjtcbiAgICBsb2Rhc2guZm9yT3duUmlnaHQgPSBmb3JPd25SaWdodDtcbiAgICBsb2Rhc2guZnVuY3Rpb25zID0gZnVuY3Rpb25zO1xuICAgIGxvZGFzaC5ncm91cEJ5ID0gZ3JvdXBCeTtcbiAgICBsb2Rhc2guaW5kZXhCeSA9IGluZGV4Qnk7XG4gICAgbG9kYXNoLmluaXRpYWwgPSBpbml0aWFsO1xuICAgIGxvZGFzaC5pbnRlcnNlY3Rpb24gPSBpbnRlcnNlY3Rpb247XG4gICAgbG9kYXNoLmludmVydCA9IGludmVydDtcbiAgICBsb2Rhc2guaW52b2tlID0gaW52b2tlO1xuICAgIGxvZGFzaC5rZXlzID0ga2V5cztcbiAgICBsb2Rhc2gubWFwID0gbWFwO1xuICAgIGxvZGFzaC5tYXBWYWx1ZXMgPSBtYXBWYWx1ZXM7XG4gICAgbG9kYXNoLm1heCA9IG1heDtcbiAgICBsb2Rhc2gubWVtb2l6ZSA9IG1lbW9pemU7XG4gICAgbG9kYXNoLm1lcmdlID0gbWVyZ2U7XG4gICAgbG9kYXNoLm1pbiA9IG1pbjtcbiAgICBsb2Rhc2gub21pdCA9IG9taXQ7XG4gICAgbG9kYXNoLm9uY2UgPSBvbmNlO1xuICAgIGxvZGFzaC5wYWlycyA9IHBhaXJzO1xuICAgIGxvZGFzaC5wYXJ0aWFsID0gcGFydGlhbDtcbiAgICBsb2Rhc2gucGFydGlhbFJpZ2h0ID0gcGFydGlhbFJpZ2h0O1xuICAgIGxvZGFzaC5waWNrID0gcGljaztcbiAgICBsb2Rhc2gucGx1Y2sgPSBwbHVjaztcbiAgICBsb2Rhc2gucHJvcGVydHkgPSBwcm9wZXJ0eTtcbiAgICBsb2Rhc2gucHVsbCA9IHB1bGw7XG4gICAgbG9kYXNoLnJhbmdlID0gcmFuZ2U7XG4gICAgbG9kYXNoLnJlamVjdCA9IHJlamVjdDtcbiAgICBsb2Rhc2gucmVtb3ZlID0gcmVtb3ZlO1xuICAgIGxvZGFzaC5yZXN0ID0gcmVzdDtcbiAgICBsb2Rhc2guc2h1ZmZsZSA9IHNodWZmbGU7XG4gICAgbG9kYXNoLnNvcnRCeSA9IHNvcnRCeTtcbiAgICBsb2Rhc2gudGFwID0gdGFwO1xuICAgIGxvZGFzaC50aHJvdHRsZSA9IHRocm90dGxlO1xuICAgIGxvZGFzaC50aW1lcyA9IHRpbWVzO1xuICAgIGxvZGFzaC50b0FycmF5ID0gdG9BcnJheTtcbiAgICBsb2Rhc2gudHJhbnNmb3JtID0gdHJhbnNmb3JtO1xuICAgIGxvZGFzaC51bmlvbiA9IHVuaW9uO1xuICAgIGxvZGFzaC51bmlxID0gdW5pcTtcbiAgICBsb2Rhc2gudmFsdWVzID0gdmFsdWVzO1xuICAgIGxvZGFzaC53aGVyZSA9IHdoZXJlO1xuICAgIGxvZGFzaC53aXRob3V0ID0gd2l0aG91dDtcbiAgICBsb2Rhc2gud3JhcCA9IHdyYXA7XG4gICAgbG9kYXNoLnhvciA9IHhvcjtcbiAgICBsb2Rhc2guemlwID0gemlwO1xuICAgIGxvZGFzaC56aXBPYmplY3QgPSB6aXBPYmplY3Q7XG5cbiAgICAvLyBhZGQgYWxpYXNlc1xuICAgIGxvZGFzaC5jb2xsZWN0ID0gbWFwO1xuICAgIGxvZGFzaC5kcm9wID0gcmVzdDtcbiAgICBsb2Rhc2guZWFjaCA9IGZvckVhY2g7XG4gICAgbG9kYXNoLmVhY2hSaWdodCA9IGZvckVhY2hSaWdodDtcbiAgICBsb2Rhc2guZXh0ZW5kID0gYXNzaWduO1xuICAgIGxvZGFzaC5tZXRob2RzID0gZnVuY3Rpb25zO1xuICAgIGxvZGFzaC5vYmplY3QgPSB6aXBPYmplY3Q7XG4gICAgbG9kYXNoLnNlbGVjdCA9IGZpbHRlcjtcbiAgICBsb2Rhc2gudGFpbCA9IHJlc3Q7XG4gICAgbG9kYXNoLnVuaXF1ZSA9IHVuaXE7XG4gICAgbG9kYXNoLnVuemlwID0gemlwO1xuXG4gICAgLy8gYWRkIGZ1bmN0aW9ucyB0byBgbG9kYXNoLnByb3RvdHlwZWBcbiAgICBtaXhpbihsb2Rhc2gpO1xuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgICAvLyBhZGQgZnVuY3Rpb25zIHRoYXQgcmV0dXJuIHVud3JhcHBlZCB2YWx1ZXMgd2hlbiBjaGFpbmluZ1xuICAgIGxvZGFzaC5jbG9uZSA9IGNsb25lO1xuICAgIGxvZGFzaC5jbG9uZURlZXAgPSBjbG9uZURlZXA7XG4gICAgbG9kYXNoLmNvbnRhaW5zID0gY29udGFpbnM7XG4gICAgbG9kYXNoLmVzY2FwZSA9IGVzY2FwZTtcbiAgICBsb2Rhc2guZXZlcnkgPSBldmVyeTtcbiAgICBsb2Rhc2guZmluZCA9IGZpbmQ7XG4gICAgbG9kYXNoLmZpbmRJbmRleCA9IGZpbmRJbmRleDtcbiAgICBsb2Rhc2guZmluZEtleSA9IGZpbmRLZXk7XG4gICAgbG9kYXNoLmZpbmRMYXN0ID0gZmluZExhc3Q7XG4gICAgbG9kYXNoLmZpbmRMYXN0SW5kZXggPSBmaW5kTGFzdEluZGV4O1xuICAgIGxvZGFzaC5maW5kTGFzdEtleSA9IGZpbmRMYXN0S2V5O1xuICAgIGxvZGFzaC5oYXMgPSBoYXM7XG4gICAgbG9kYXNoLmlkZW50aXR5ID0gaWRlbnRpdHk7XG4gICAgbG9kYXNoLmluZGV4T2YgPSBpbmRleE9mO1xuICAgIGxvZGFzaC5pc0FyZ3VtZW50cyA9IGlzQXJndW1lbnRzO1xuICAgIGxvZGFzaC5pc0FycmF5ID0gaXNBcnJheTtcbiAgICBsb2Rhc2guaXNCb29sZWFuID0gaXNCb29sZWFuO1xuICAgIGxvZGFzaC5pc0RhdGUgPSBpc0RhdGU7XG4gICAgbG9kYXNoLmlzRWxlbWVudCA9IGlzRWxlbWVudDtcbiAgICBsb2Rhc2guaXNFbXB0eSA9IGlzRW1wdHk7XG4gICAgbG9kYXNoLmlzRXF1YWwgPSBpc0VxdWFsO1xuICAgIGxvZGFzaC5pc0Zpbml0ZSA9IGlzRmluaXRlO1xuICAgIGxvZGFzaC5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbiAgICBsb2Rhc2guaXNOYU4gPSBpc05hTjtcbiAgICBsb2Rhc2guaXNOdWxsID0gaXNOdWxsO1xuICAgIGxvZGFzaC5pc051bWJlciA9IGlzTnVtYmVyO1xuICAgIGxvZGFzaC5pc09iamVjdCA9IGlzT2JqZWN0O1xuICAgIGxvZGFzaC5pc1BsYWluT2JqZWN0ID0gaXNQbGFpbk9iamVjdDtcbiAgICBsb2Rhc2guaXNSZWdFeHAgPSBpc1JlZ0V4cDtcbiAgICBsb2Rhc2guaXNTdHJpbmcgPSBpc1N0cmluZztcbiAgICBsb2Rhc2guaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcbiAgICBsb2Rhc2gubGFzdEluZGV4T2YgPSBsYXN0SW5kZXhPZjtcbiAgICBsb2Rhc2gubWl4aW4gPSBtaXhpbjtcbiAgICBsb2Rhc2gubm9Db25mbGljdCA9IG5vQ29uZmxpY3Q7XG4gICAgbG9kYXNoLm5vb3AgPSBub29wO1xuICAgIGxvZGFzaC5ub3cgPSBub3c7XG4gICAgbG9kYXNoLnBhcnNlSW50ID0gcGFyc2VJbnQ7XG4gICAgbG9kYXNoLnJhbmRvbSA9IHJhbmRvbTtcbiAgICBsb2Rhc2gucmVkdWNlID0gcmVkdWNlO1xuICAgIGxvZGFzaC5yZWR1Y2VSaWdodCA9IHJlZHVjZVJpZ2h0O1xuICAgIGxvZGFzaC5yZXN1bHQgPSByZXN1bHQ7XG4gICAgbG9kYXNoLnJ1bkluQ29udGV4dCA9IHJ1bkluQ29udGV4dDtcbiAgICBsb2Rhc2guc2l6ZSA9IHNpemU7XG4gICAgbG9kYXNoLnNvbWUgPSBzb21lO1xuICAgIGxvZGFzaC5zb3J0ZWRJbmRleCA9IHNvcnRlZEluZGV4O1xuICAgIGxvZGFzaC50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIGxvZGFzaC51bmVzY2FwZSA9IHVuZXNjYXBlO1xuICAgIGxvZGFzaC51bmlxdWVJZCA9IHVuaXF1ZUlkO1xuXG4gICAgLy8gYWRkIGFsaWFzZXNcbiAgICBsb2Rhc2guYWxsID0gZXZlcnk7XG4gICAgbG9kYXNoLmFueSA9IHNvbWU7XG4gICAgbG9kYXNoLmRldGVjdCA9IGZpbmQ7XG4gICAgbG9kYXNoLmZpbmRXaGVyZSA9IGZpbmQ7XG4gICAgbG9kYXNoLmZvbGRsID0gcmVkdWNlO1xuICAgIGxvZGFzaC5mb2xkciA9IHJlZHVjZVJpZ2h0O1xuICAgIGxvZGFzaC5pbmNsdWRlID0gY29udGFpbnM7XG4gICAgbG9kYXNoLmluamVjdCA9IHJlZHVjZTtcblxuICAgIG1peGluKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNvdXJjZSA9IHt9XG4gICAgICBmb3JPd24obG9kYXNoLCBmdW5jdGlvbihmdW5jLCBtZXRob2ROYW1lKSB7XG4gICAgICAgIGlmICghbG9kYXNoLnByb3RvdHlwZVttZXRob2ROYW1lXSkge1xuICAgICAgICAgIHNvdXJjZVttZXRob2ROYW1lXSA9IGZ1bmM7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICB9KCksIGZhbHNlKTtcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLy8gYWRkIGZ1bmN0aW9ucyBjYXBhYmxlIG9mIHJldHVybmluZyB3cmFwcGVkIGFuZCB1bndyYXBwZWQgdmFsdWVzIHdoZW4gY2hhaW5pbmdcbiAgICBsb2Rhc2guZmlyc3QgPSBmaXJzdDtcbiAgICBsb2Rhc2gubGFzdCA9IGxhc3Q7XG4gICAgbG9kYXNoLnNhbXBsZSA9IHNhbXBsZTtcblxuICAgIC8vIGFkZCBhbGlhc2VzXG4gICAgbG9kYXNoLnRha2UgPSBmaXJzdDtcbiAgICBsb2Rhc2guaGVhZCA9IGZpcnN0O1xuXG4gICAgZm9yT3duKGxvZGFzaCwgZnVuY3Rpb24oZnVuYywgbWV0aG9kTmFtZSkge1xuICAgICAgdmFyIGNhbGxiYWNrYWJsZSA9IG1ldGhvZE5hbWUgIT09ICdzYW1wbGUnO1xuICAgICAgaWYgKCFsb2Rhc2gucHJvdG90eXBlW21ldGhvZE5hbWVdKSB7XG4gICAgICAgIGxvZGFzaC5wcm90b3R5cGVbbWV0aG9kTmFtZV09IGZ1bmN0aW9uKG4sIGd1YXJkKSB7XG4gICAgICAgICAgdmFyIGNoYWluQWxsID0gdGhpcy5fX2NoYWluX18sXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGZ1bmModGhpcy5fX3dyYXBwZWRfXywgbiwgZ3VhcmQpO1xuXG4gICAgICAgICAgcmV0dXJuICFjaGFpbkFsbCAmJiAobiA9PSBudWxsIHx8IChndWFyZCAmJiAhKGNhbGxiYWNrYWJsZSAmJiB0eXBlb2YgbiA9PSAnZnVuY3Rpb24nKSkpXG4gICAgICAgICAgICA/IHJlc3VsdFxuICAgICAgICAgICAgOiBuZXcgbG9kYXNoV3JhcHBlcihyZXN1bHQsIGNoYWluQWxsKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNlbWFudGljIHZlcnNpb24gbnVtYmVyLlxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBtZW1iZXJPZiBfXG4gICAgICogQHR5cGUgc3RyaW5nXG4gICAgICovXG4gICAgbG9kYXNoLlZFUlNJT04gPSAnMi40LjEnO1xuXG4gICAgLy8gYWRkIFwiQ2hhaW5pbmdcIiBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXJcbiAgICBsb2Rhc2gucHJvdG90eXBlLmNoYWluID0gd3JhcHBlckNoYWluO1xuICAgIGxvZGFzaC5wcm90b3R5cGUudG9TdHJpbmcgPSB3cmFwcGVyVG9TdHJpbmc7XG4gICAgbG9kYXNoLnByb3RvdHlwZS52YWx1ZSA9IHdyYXBwZXJWYWx1ZU9mO1xuICAgIGxvZGFzaC5wcm90b3R5cGUudmFsdWVPZiA9IHdyYXBwZXJWYWx1ZU9mO1xuXG4gICAgLy8gYWRkIGBBcnJheWAgZnVuY3Rpb25zIHRoYXQgcmV0dXJuIHVud3JhcHBlZCB2YWx1ZXNcbiAgICBmb3JFYWNoKFsnam9pbicsICdwb3AnLCAnc2hpZnQnXSwgZnVuY3Rpb24obWV0aG9kTmFtZSkge1xuICAgICAgdmFyIGZ1bmMgPSBhcnJheVJlZlttZXRob2ROYW1lXTtcbiAgICAgIGxvZGFzaC5wcm90b3R5cGVbbWV0aG9kTmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNoYWluQWxsID0gdGhpcy5fX2NoYWluX18sXG4gICAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXMuX193cmFwcGVkX18sIGFyZ3VtZW50cyk7XG5cbiAgICAgICAgcmV0dXJuIGNoYWluQWxsXG4gICAgICAgICAgPyBuZXcgbG9kYXNoV3JhcHBlcihyZXN1bHQsIGNoYWluQWxsKVxuICAgICAgICAgIDogcmVzdWx0O1xuICAgICAgfTtcbiAgICB9KTtcblxuICAgIC8vIGFkZCBgQXJyYXlgIGZ1bmN0aW9ucyB0aGF0IHJldHVybiB0aGUgZXhpc3Rpbmcgd3JhcHBlZCB2YWx1ZVxuICAgIGZvckVhY2goWydwdXNoJywgJ3JldmVyc2UnLCAnc29ydCcsICd1bnNoaWZ0J10sIGZ1bmN0aW9uKG1ldGhvZE5hbWUpIHtcbiAgICAgIHZhciBmdW5jID0gYXJyYXlSZWZbbWV0aG9kTmFtZV07XG4gICAgICBsb2Rhc2gucHJvdG90eXBlW21ldGhvZE5hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGZ1bmMuYXBwbHkodGhpcy5fX3dyYXBwZWRfXywgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgLy8gYWRkIGBBcnJheWAgZnVuY3Rpb25zIHRoYXQgcmV0dXJuIG5ldyB3cmFwcGVkIHZhbHVlc1xuICAgIGZvckVhY2goWydjb25jYXQnLCAnc2xpY2UnLCAnc3BsaWNlJ10sIGZ1bmN0aW9uKG1ldGhvZE5hbWUpIHtcbiAgICAgIHZhciBmdW5jID0gYXJyYXlSZWZbbWV0aG9kTmFtZV07XG4gICAgICBsb2Rhc2gucHJvdG90eXBlW21ldGhvZE5hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBuZXcgbG9kYXNoV3JhcHBlcihmdW5jLmFwcGx5KHRoaXMuX193cmFwcGVkX18sIGFyZ3VtZW50cyksIHRoaXMuX19jaGFpbl9fKTtcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbG9kYXNoO1xuICB9XG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgLy8gZXhwb3NlIExvLURhc2hcbiAgdmFyIF8gPSBydW5JbkNvbnRleHQoKTtcblxuICAvLyBzb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzIGxpa2Ugci5qcyBjaGVjayBmb3IgY29uZGl0aW9uIHBhdHRlcm5zIGxpa2UgdGhlIGZvbGxvd2luZzpcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZGVmaW5lLmFtZCA9PSAnb2JqZWN0JyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gRXhwb3NlIExvLURhc2ggdG8gdGhlIGdsb2JhbCBvYmplY3QgZXZlbiB3aGVuIGFuIEFNRCBsb2FkZXIgaXMgcHJlc2VudCBpblxuICAgIC8vIGNhc2UgTG8tRGFzaCBpcyBsb2FkZWQgd2l0aCBhIFJlcXVpcmVKUyBzaGltIGNvbmZpZy5cbiAgICAvLyBTZWUgaHR0cDovL3JlcXVpcmVqcy5vcmcvZG9jcy9hcGkuaHRtbCNjb25maWctc2hpbVxuICAgIHJvb3QuXyA9IF87XG5cbiAgICAvLyBkZWZpbmUgYXMgYW4gYW5vbnltb3VzIG1vZHVsZSBzbywgdGhyb3VnaCBwYXRoIG1hcHBpbmcsIGl0IGNhbiBiZVxuICAgIC8vIHJlZmVyZW5jZWQgYXMgdGhlIFwidW5kZXJzY29yZVwiIG1vZHVsZVxuICAgIGRlZmluZShmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfO1xuICAgIH0pO1xuICB9XG4gIC8vIGNoZWNrIGZvciBgZXhwb3J0c2AgYWZ0ZXIgYGRlZmluZWAgaW4gY2FzZSBhIGJ1aWxkIG9wdGltaXplciBhZGRzIGFuIGBleHBvcnRzYCBvYmplY3RcbiAgZWxzZSBpZiAoZnJlZUV4cG9ydHMgJiYgZnJlZU1vZHVsZSkge1xuICAgIC8vIGluIE5vZGUuanMgb3IgUmluZ29KU1xuICAgIGlmIChtb2R1bGVFeHBvcnRzKSB7XG4gICAgICAoZnJlZU1vZHVsZS5leHBvcnRzID0gXykuXyA9IF87XG4gICAgfVxuICAgIC8vIGluIE5hcndoYWwgb3IgUmhpbm8gLXJlcXVpcmVcbiAgICBlbHNlIHtcbiAgICAgIGZyZWVFeHBvcnRzLl8gPSBfO1xuICAgIH1cbiAgfVxuICBlbHNlIHtcbiAgICAvLyBpbiBhIGJyb3dzZXIgb3IgUmhpbm9cbiAgICByb290Ll8gPSBfO1xuICB9XG59LmNhbGwodGhpcykpO1xuIiwiLy8gIFVuZGVyc2NvcmUuc3RyaW5nXG4vLyAgKGMpIDIwMTAgRXNhLU1hdHRpIFN1dXJvbmVuIDxlc2EtbWF0dGkgYWV0IHN1dXJvbmVuIGRvdCBvcmc+XG4vLyAgVW5kZXJzY29yZS5zdHJpbmcgaXMgZnJlZWx5IGRpc3RyaWJ1dGFibGUgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBNSVQgbGljZW5zZS5cbi8vICBEb2N1bWVudGF0aW9uOiBodHRwczovL2dpdGh1Yi5jb20vZXBlbGkvdW5kZXJzY29yZS5zdHJpbmdcbi8vICBTb21lIGNvZGUgaXMgYm9ycm93ZWQgZnJvbSBNb29Ub29scyBhbmQgQWxleGFuZHJ1IE1hcmFzdGVhbnUuXG4vLyAgVmVyc2lvbiAnMi4zLjInXG5cbiFmdW5jdGlvbihyb290LCBTdHJpbmcpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gRGVmaW5pbmcgaGVscGVyIGZ1bmN0aW9ucy5cblxuICB2YXIgbmF0aXZlVHJpbSA9IFN0cmluZy5wcm90b3R5cGUudHJpbTtcbiAgdmFyIG5hdGl2ZVRyaW1SaWdodCA9IFN0cmluZy5wcm90b3R5cGUudHJpbVJpZ2h0O1xuICB2YXIgbmF0aXZlVHJpbUxlZnQgPSBTdHJpbmcucHJvdG90eXBlLnRyaW1MZWZ0O1xuXG4gIHZhciBwYXJzZU51bWJlciA9IGZ1bmN0aW9uKHNvdXJjZSkgeyByZXR1cm4gc291cmNlICogMSB8fCAwOyB9O1xuXG4gIHZhciBzdHJSZXBlYXQgPSBmdW5jdGlvbihzdHIsIHF0eSl7XG4gICAgaWYgKHF0eSA8IDEpIHJldHVybiAnJztcbiAgICB2YXIgcmVzdWx0ID0gJyc7XG4gICAgd2hpbGUgKHF0eSA+IDApIHtcbiAgICAgIGlmIChxdHkgJiAxKSByZXN1bHQgKz0gc3RyO1xuICAgICAgcXR5ID4+PSAxLCBzdHIgKz0gc3RyO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIHZhciBzbGljZSA9IFtdLnNsaWNlO1xuXG4gIHZhciBkZWZhdWx0VG9XaGl0ZVNwYWNlID0gZnVuY3Rpb24oY2hhcmFjdGVycykge1xuICAgIGlmIChjaGFyYWN0ZXJzID09IG51bGwpXG4gICAgICByZXR1cm4gJ1xcXFxzJztcbiAgICBlbHNlIGlmIChjaGFyYWN0ZXJzLnNvdXJjZSlcbiAgICAgIHJldHVybiBjaGFyYWN0ZXJzLnNvdXJjZTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gJ1snICsgX3MuZXNjYXBlUmVnRXhwKGNoYXJhY3RlcnMpICsgJ10nO1xuICB9O1xuXG4gIC8vIEhlbHBlciBmb3IgdG9Cb29sZWFuXG4gIGZ1bmN0aW9uIGJvb2xNYXRjaChzLCBtYXRjaGVycykge1xuICAgIHZhciBpLCBtYXRjaGVyLCBkb3duID0gcy50b0xvd2VyQ2FzZSgpO1xuICAgIG1hdGNoZXJzID0gW10uY29uY2F0KG1hdGNoZXJzKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbWF0Y2hlcnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIG1hdGNoZXIgPSBtYXRjaGVyc1tpXTtcbiAgICAgIGlmICghbWF0Y2hlcikgY29udGludWU7XG4gICAgICBpZiAobWF0Y2hlci50ZXN0ICYmIG1hdGNoZXIudGVzdChzKSkgcmV0dXJuIHRydWU7XG4gICAgICBpZiAobWF0Y2hlci50b0xvd2VyQ2FzZSgpID09PSBkb3duKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICB2YXIgZXNjYXBlQ2hhcnMgPSB7XG4gICAgbHQ6ICc8JyxcbiAgICBndDogJz4nLFxuICAgIHF1b3Q6ICdcIicsXG4gICAgYW1wOiAnJicsXG4gICAgYXBvczogXCInXCJcbiAgfTtcblxuICB2YXIgcmV2ZXJzZWRFc2NhcGVDaGFycyA9IHt9O1xuICBmb3IodmFyIGtleSBpbiBlc2NhcGVDaGFycykgcmV2ZXJzZWRFc2NhcGVDaGFyc1tlc2NhcGVDaGFyc1trZXldXSA9IGtleTtcbiAgcmV2ZXJzZWRFc2NhcGVDaGFyc1tcIidcIl0gPSAnIzM5JztcblxuICAvLyBzcHJpbnRmKCkgZm9yIEphdmFTY3JpcHQgMC43LWJldGExXG4gIC8vIGh0dHA6Ly93d3cuZGl2ZWludG9qYXZhc2NyaXB0LmNvbS9wcm9qZWN0cy9qYXZhc2NyaXB0LXNwcmludGZcbiAgLy9cbiAgLy8gQ29weXJpZ2h0IChjKSBBbGV4YW5kcnUgTWFyYXN0ZWFudSA8YWxleGFob2xpYyBbYXQpIGdtYWlsIChkb3RdIGNvbT5cbiAgLy8gQWxsIHJpZ2h0cyByZXNlcnZlZC5cblxuICB2YXIgc3ByaW50ZiA9IChmdW5jdGlvbigpIHtcbiAgICBmdW5jdGlvbiBnZXRfdHlwZSh2YXJpYWJsZSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YXJpYWJsZSkuc2xpY2UoOCwgLTEpLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuXG4gICAgdmFyIHN0cl9yZXBlYXQgPSBzdHJSZXBlYXQ7XG5cbiAgICB2YXIgc3RyX2Zvcm1hdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCFzdHJfZm9ybWF0LmNhY2hlLmhhc093blByb3BlcnR5KGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgc3RyX2Zvcm1hdC5jYWNoZVthcmd1bWVudHNbMF1dID0gc3RyX2Zvcm1hdC5wYXJzZShhcmd1bWVudHNbMF0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0cl9mb3JtYXQuZm9ybWF0LmNhbGwobnVsbCwgc3RyX2Zvcm1hdC5jYWNoZVthcmd1bWVudHNbMF1dLCBhcmd1bWVudHMpO1xuICAgIH07XG5cbiAgICBzdHJfZm9ybWF0LmZvcm1hdCA9IGZ1bmN0aW9uKHBhcnNlX3RyZWUsIGFyZ3YpIHtcbiAgICAgIHZhciBjdXJzb3IgPSAxLCB0cmVlX2xlbmd0aCA9IHBhcnNlX3RyZWUubGVuZ3RoLCBub2RlX3R5cGUgPSAnJywgYXJnLCBvdXRwdXQgPSBbXSwgaSwgaywgbWF0Y2gsIHBhZCwgcGFkX2NoYXJhY3RlciwgcGFkX2xlbmd0aDtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCB0cmVlX2xlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5vZGVfdHlwZSA9IGdldF90eXBlKHBhcnNlX3RyZWVbaV0pO1xuICAgICAgICBpZiAobm9kZV90eXBlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIG91dHB1dC5wdXNoKHBhcnNlX3RyZWVbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5vZGVfdHlwZSA9PT0gJ2FycmF5Jykge1xuICAgICAgICAgIG1hdGNoID0gcGFyc2VfdHJlZVtpXTsgLy8gY29udmVuaWVuY2UgcHVycG9zZXMgb25seVxuICAgICAgICAgIGlmIChtYXRjaFsyXSkgeyAvLyBrZXl3b3JkIGFyZ3VtZW50XG4gICAgICAgICAgICBhcmcgPSBhcmd2W2N1cnNvcl07XG4gICAgICAgICAgICBmb3IgKGsgPSAwOyBrIDwgbWF0Y2hbMl0ubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgaWYgKCFhcmcuaGFzT3duUHJvcGVydHkobWF0Y2hbMl1ba10pKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHNwcmludGYoJ1tfLnNwcmludGZdIHByb3BlcnR5IFwiJXNcIiBkb2VzIG5vdCBleGlzdCcsIG1hdGNoWzJdW2tdKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYXJnID0gYXJnW21hdGNoWzJdW2tdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoWzFdKSB7IC8vIHBvc2l0aW9uYWwgYXJndW1lbnQgKGV4cGxpY2l0KVxuICAgICAgICAgICAgYXJnID0gYXJndlttYXRjaFsxXV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgeyAvLyBwb3NpdGlvbmFsIGFyZ3VtZW50IChpbXBsaWNpdClcbiAgICAgICAgICAgIGFyZyA9IGFyZ3ZbY3Vyc29yKytdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICgvW15zXS8udGVzdChtYXRjaFs4XSkgJiYgKGdldF90eXBlKGFyZykgIT0gJ251bWJlcicpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3Ioc3ByaW50ZignW18uc3ByaW50Zl0gZXhwZWN0aW5nIG51bWJlciBidXQgZm91bmQgJXMnLCBnZXRfdHlwZShhcmcpKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN3aXRjaCAobWF0Y2hbOF0pIHtcbiAgICAgICAgICAgIGNhc2UgJ2InOiBhcmcgPSBhcmcudG9TdHJpbmcoMik7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYyc6IGFyZyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoYXJnKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdkJzogYXJnID0gcGFyc2VJbnQoYXJnLCAxMCk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZSc6IGFyZyA9IG1hdGNoWzddID8gYXJnLnRvRXhwb25lbnRpYWwobWF0Y2hbN10pIDogYXJnLnRvRXhwb25lbnRpYWwoKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdmJzogYXJnID0gbWF0Y2hbN10gPyBwYXJzZUZsb2F0KGFyZykudG9GaXhlZChtYXRjaFs3XSkgOiBwYXJzZUZsb2F0KGFyZyk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbyc6IGFyZyA9IGFyZy50b1N0cmluZyg4KTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzJzogYXJnID0gKChhcmcgPSBTdHJpbmcoYXJnKSkgJiYgbWF0Y2hbN10gPyBhcmcuc3Vic3RyaW5nKDAsIG1hdGNoWzddKSA6IGFyZyk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndSc6IGFyZyA9IE1hdGguYWJzKGFyZyk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAneCc6IGFyZyA9IGFyZy50b1N0cmluZygxNik7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnWCc6IGFyZyA9IGFyZy50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTsgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGFyZyA9ICgvW2RlZl0vLnRlc3QobWF0Y2hbOF0pICYmIG1hdGNoWzNdICYmIGFyZyA+PSAwID8gJysnKyBhcmcgOiBhcmcpO1xuICAgICAgICAgIHBhZF9jaGFyYWN0ZXIgPSBtYXRjaFs0XSA/IG1hdGNoWzRdID09ICcwJyA/ICcwJyA6IG1hdGNoWzRdLmNoYXJBdCgxKSA6ICcgJztcbiAgICAgICAgICBwYWRfbGVuZ3RoID0gbWF0Y2hbNl0gLSBTdHJpbmcoYXJnKS5sZW5ndGg7XG4gICAgICAgICAgcGFkID0gbWF0Y2hbNl0gPyBzdHJfcmVwZWF0KHBhZF9jaGFyYWN0ZXIsIHBhZF9sZW5ndGgpIDogJyc7XG4gICAgICAgICAgb3V0cHV0LnB1c2gobWF0Y2hbNV0gPyBhcmcgKyBwYWQgOiBwYWQgKyBhcmcpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gb3V0cHV0LmpvaW4oJycpO1xuICAgIH07XG5cbiAgICBzdHJfZm9ybWF0LmNhY2hlID0ge307XG5cbiAgICBzdHJfZm9ybWF0LnBhcnNlID0gZnVuY3Rpb24oZm10KSB7XG4gICAgICB2YXIgX2ZtdCA9IGZtdCwgbWF0Y2ggPSBbXSwgcGFyc2VfdHJlZSA9IFtdLCBhcmdfbmFtZXMgPSAwO1xuICAgICAgd2hpbGUgKF9mbXQpIHtcbiAgICAgICAgaWYgKChtYXRjaCA9IC9eW15cXHgyNV0rLy5leGVjKF9mbXQpKSAhPT0gbnVsbCkge1xuICAgICAgICAgIHBhcnNlX3RyZWUucHVzaChtYXRjaFswXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoKG1hdGNoID0gL15cXHgyNXsyfS8uZXhlYyhfZm10KSkgIT09IG51bGwpIHtcbiAgICAgICAgICBwYXJzZV90cmVlLnB1c2goJyUnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICgobWF0Y2ggPSAvXlxceDI1KD86KFsxLTldXFxkKilcXCR8XFwoKFteXFwpXSspXFwpKT8oXFwrKT8oMHwnW14kXSk/KC0pPyhcXGQrKT8oPzpcXC4oXFxkKykpPyhbYi1mb3N1eFhdKS8uZXhlYyhfZm10KSkgIT09IG51bGwpIHtcbiAgICAgICAgICBpZiAobWF0Y2hbMl0pIHtcbiAgICAgICAgICAgIGFyZ19uYW1lcyB8PSAxO1xuICAgICAgICAgICAgdmFyIGZpZWxkX2xpc3QgPSBbXSwgcmVwbGFjZW1lbnRfZmllbGQgPSBtYXRjaFsyXSwgZmllbGRfbWF0Y2ggPSBbXTtcbiAgICAgICAgICAgIGlmICgoZmllbGRfbWF0Y2ggPSAvXihbYS16X11bYS16X1xcZF0qKS9pLmV4ZWMocmVwbGFjZW1lbnRfZmllbGQpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICBmaWVsZF9saXN0LnB1c2goZmllbGRfbWF0Y2hbMV0pO1xuICAgICAgICAgICAgICB3aGlsZSAoKHJlcGxhY2VtZW50X2ZpZWxkID0gcmVwbGFjZW1lbnRfZmllbGQuc3Vic3RyaW5nKGZpZWxkX21hdGNoWzBdLmxlbmd0aCkpICE9PSAnJykge1xuICAgICAgICAgICAgICAgIGlmICgoZmllbGRfbWF0Y2ggPSAvXlxcLihbYS16X11bYS16X1xcZF0qKS9pLmV4ZWMocmVwbGFjZW1lbnRfZmllbGQpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgZmllbGRfbGlzdC5wdXNoKGZpZWxkX21hdGNoWzFdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoKGZpZWxkX21hdGNoID0gL15cXFsoXFxkKylcXF0vLmV4ZWMocmVwbGFjZW1lbnRfZmllbGQpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgZmllbGRfbGlzdC5wdXNoKGZpZWxkX21hdGNoWzFdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1tfLnNwcmludGZdIGh1aD8nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1tfLnNwcmludGZdIGh1aD8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1hdGNoWzJdID0gZmllbGRfbGlzdDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBhcmdfbmFtZXMgfD0gMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFyZ19uYW1lcyA9PT0gMykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdbXy5zcHJpbnRmXSBtaXhpbmcgcG9zaXRpb25hbCBhbmQgbmFtZWQgcGxhY2Vob2xkZXJzIGlzIG5vdCAoeWV0KSBzdXBwb3J0ZWQnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcGFyc2VfdHJlZS5wdXNoKG1hdGNoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1tfLnNwcmludGZdIGh1aD8nKTtcbiAgICAgICAgfVxuICAgICAgICBfZm10ID0gX2ZtdC5zdWJzdHJpbmcobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYXJzZV90cmVlO1xuICAgIH07XG5cbiAgICByZXR1cm4gc3RyX2Zvcm1hdDtcbiAgfSkoKTtcblxuXG5cbiAgLy8gRGVmaW5pbmcgdW5kZXJzY29yZS5zdHJpbmdcblxuICB2YXIgX3MgPSB7XG5cbiAgICBWRVJTSU9OOiAnMi4zLjAnLFxuXG4gICAgaXNCbGFuazogZnVuY3Rpb24oc3RyKXtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgc3RyID0gJyc7XG4gICAgICByZXR1cm4gKC9eXFxzKiQvKS50ZXN0KHN0cik7XG4gICAgfSxcblxuICAgIHN0cmlwVGFnczogZnVuY3Rpb24oc3RyKXtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuIFN0cmluZyhzdHIpLnJlcGxhY2UoLzxcXC8/W14+XSs+L2csICcnKTtcbiAgICB9LFxuXG4gICAgY2FwaXRhbGl6ZSA6IGZ1bmN0aW9uKHN0cil7XG4gICAgICBzdHIgPSBzdHIgPT0gbnVsbCA/ICcnIDogU3RyaW5nKHN0cik7XG4gICAgICByZXR1cm4gc3RyLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyLnNsaWNlKDEpO1xuICAgIH0sXG5cbiAgICBjaG9wOiBmdW5jdGlvbihzdHIsIHN0ZXApe1xuICAgICAgaWYgKHN0ciA9PSBudWxsKSByZXR1cm4gW107XG4gICAgICBzdHIgPSBTdHJpbmcoc3RyKTtcbiAgICAgIHN0ZXAgPSB+fnN0ZXA7XG4gICAgICByZXR1cm4gc3RlcCA+IDAgPyBzdHIubWF0Y2gobmV3IFJlZ0V4cCgnLnsxLCcgKyBzdGVwICsgJ30nLCAnZycpKSA6IFtzdHJdO1xuICAgIH0sXG5cbiAgICBjbGVhbjogZnVuY3Rpb24oc3RyKXtcbiAgICAgIHJldHVybiBfcy5zdHJpcChzdHIpLnJlcGxhY2UoL1xccysvZywgJyAnKTtcbiAgICB9LFxuXG4gICAgY291bnQ6IGZ1bmN0aW9uKHN0ciwgc3Vic3RyKXtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCB8fCBzdWJzdHIgPT0gbnVsbCkgcmV0dXJuIDA7XG5cbiAgICAgIHN0ciA9IFN0cmluZyhzdHIpO1xuICAgICAgc3Vic3RyID0gU3RyaW5nKHN1YnN0cik7XG5cbiAgICAgIHZhciBjb3VudCA9IDAsXG4gICAgICAgIHBvcyA9IDAsXG4gICAgICAgIGxlbmd0aCA9IHN1YnN0ci5sZW5ndGg7XG5cbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIHBvcyA9IHN0ci5pbmRleE9mKHN1YnN0ciwgcG9zKTtcbiAgICAgICAgaWYgKHBvcyA9PT0gLTEpIGJyZWFrO1xuICAgICAgICBjb3VudCsrO1xuICAgICAgICBwb3MgKz0gbGVuZ3RoO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gY291bnQ7XG4gICAgfSxcblxuICAgIGNoYXJzOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuIFtdO1xuICAgICAgcmV0dXJuIFN0cmluZyhzdHIpLnNwbGl0KCcnKTtcbiAgICB9LFxuXG4gICAgc3dhcENhc2U6IGZ1bmN0aW9uKHN0cikge1xuICAgICAgaWYgKHN0ciA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICByZXR1cm4gU3RyaW5nKHN0cikucmVwbGFjZSgvXFxTL2csIGZ1bmN0aW9uKGMpe1xuICAgICAgICByZXR1cm4gYyA9PT0gYy50b1VwcGVyQ2FzZSgpID8gYy50b0xvd2VyQ2FzZSgpIDogYy50b1VwcGVyQ2FzZSgpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIGVzY2FwZUhUTUw6IGZ1bmN0aW9uKHN0cikge1xuICAgICAgaWYgKHN0ciA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICByZXR1cm4gU3RyaW5nKHN0cikucmVwbGFjZSgvWyY8PlwiJ10vZywgZnVuY3Rpb24obSl7IHJldHVybiAnJicgKyByZXZlcnNlZEVzY2FwZUNoYXJzW21dICsgJzsnOyB9KTtcbiAgICB9LFxuXG4gICAgdW5lc2NhcGVIVE1MOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuIFN0cmluZyhzdHIpLnJlcGxhY2UoL1xcJihbXjtdKyk7L2csIGZ1bmN0aW9uKGVudGl0eSwgZW50aXR5Q29kZSl7XG4gICAgICAgIHZhciBtYXRjaDtcblxuICAgICAgICBpZiAoZW50aXR5Q29kZSBpbiBlc2NhcGVDaGFycykge1xuICAgICAgICAgIHJldHVybiBlc2NhcGVDaGFyc1tlbnRpdHlDb2RlXTtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaCA9IGVudGl0eUNvZGUubWF0Y2goL14jeChbXFxkYS1mQS1GXSspJC8pKSB7XG4gICAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUocGFyc2VJbnQobWF0Y2hbMV0sIDE2KSk7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2ggPSBlbnRpdHlDb2RlLm1hdGNoKC9eIyhcXGQrKSQvKSkge1xuICAgICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKH5+bWF0Y2hbMV0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBlbnRpdHk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBlc2NhcGVSZWdFeHA6IGZ1bmN0aW9uKHN0cil7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHJldHVybiBTdHJpbmcoc3RyKS5yZXBsYWNlKC8oWy4qKz9ePSE6JHt9KCl8W1xcXVxcL1xcXFxdKS9nLCAnXFxcXCQxJyk7XG4gICAgfSxcblxuICAgIHNwbGljZTogZnVuY3Rpb24oc3RyLCBpLCBob3dtYW55LCBzdWJzdHIpe1xuICAgICAgdmFyIGFyciA9IF9zLmNoYXJzKHN0cik7XG4gICAgICBhcnIuc3BsaWNlKH5+aSwgfn5ob3dtYW55LCBzdWJzdHIpO1xuICAgICAgcmV0dXJuIGFyci5qb2luKCcnKTtcbiAgICB9LFxuXG4gICAgaW5zZXJ0OiBmdW5jdGlvbihzdHIsIGksIHN1YnN0cil7XG4gICAgICByZXR1cm4gX3Muc3BsaWNlKHN0ciwgaSwgMCwgc3Vic3RyKTtcbiAgICB9LFxuXG4gICAgaW5jbHVkZTogZnVuY3Rpb24oc3RyLCBuZWVkbGUpe1xuICAgICAgaWYgKG5lZWRsZSA9PT0gJycpIHJldHVybiB0cnVlO1xuICAgICAgaWYgKHN0ciA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgICByZXR1cm4gU3RyaW5nKHN0cikuaW5kZXhPZihuZWVkbGUpICE9PSAtMTtcbiAgICB9LFxuXG4gICAgam9pbjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKSxcbiAgICAgICAgc2VwYXJhdG9yID0gYXJncy5zaGlmdCgpO1xuXG4gICAgICBpZiAoc2VwYXJhdG9yID09IG51bGwpIHNlcGFyYXRvciA9ICcnO1xuXG4gICAgICByZXR1cm4gYXJncy5qb2luKHNlcGFyYXRvcik7XG4gICAgfSxcblxuICAgIGxpbmVzOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuIFtdO1xuICAgICAgcmV0dXJuIFN0cmluZyhzdHIpLnNwbGl0KFwiXFxuXCIpO1xuICAgIH0sXG5cbiAgICByZXZlcnNlOiBmdW5jdGlvbihzdHIpe1xuICAgICAgcmV0dXJuIF9zLmNoYXJzKHN0cikucmV2ZXJzZSgpLmpvaW4oJycpO1xuICAgIH0sXG5cbiAgICBzdGFydHNXaXRoOiBmdW5jdGlvbihzdHIsIHN0YXJ0cyl7XG4gICAgICBpZiAoc3RhcnRzID09PSAnJykgcmV0dXJuIHRydWU7XG4gICAgICBpZiAoc3RyID09IG51bGwgfHwgc3RhcnRzID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICAgIHN0ciA9IFN0cmluZyhzdHIpOyBzdGFydHMgPSBTdHJpbmcoc3RhcnRzKTtcbiAgICAgIHJldHVybiBzdHIubGVuZ3RoID49IHN0YXJ0cy5sZW5ndGggJiYgc3RyLnNsaWNlKDAsIHN0YXJ0cy5sZW5ndGgpID09PSBzdGFydHM7XG4gICAgfSxcblxuICAgIGVuZHNXaXRoOiBmdW5jdGlvbihzdHIsIGVuZHMpe1xuICAgICAgaWYgKGVuZHMgPT09ICcnKSByZXR1cm4gdHJ1ZTtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCB8fCBlbmRzID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICAgIHN0ciA9IFN0cmluZyhzdHIpOyBlbmRzID0gU3RyaW5nKGVuZHMpO1xuICAgICAgcmV0dXJuIHN0ci5sZW5ndGggPj0gZW5kcy5sZW5ndGggJiYgc3RyLnNsaWNlKHN0ci5sZW5ndGggLSBlbmRzLmxlbmd0aCkgPT09IGVuZHM7XG4gICAgfSxcblxuICAgIHN1Y2M6IGZ1bmN0aW9uKHN0cil7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHN0ciA9IFN0cmluZyhzdHIpO1xuICAgICAgcmV0dXJuIHN0ci5zbGljZSgwLCAtMSkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKHN0ci5jaGFyQ29kZUF0KHN0ci5sZW5ndGgtMSkgKyAxKTtcbiAgICB9LFxuXG4gICAgdGl0bGVpemU6IGZ1bmN0aW9uKHN0cil7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHN0ciAgPSBTdHJpbmcoc3RyKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oPzpefFxcc3wtKVxcUy9nLCBmdW5jdGlvbihjKXsgcmV0dXJuIGMudG9VcHBlckNhc2UoKTsgfSk7XG4gICAgfSxcblxuICAgIGNhbWVsaXplOiBmdW5jdGlvbihzdHIpe1xuICAgICAgcmV0dXJuIF9zLnRyaW0oc3RyKS5yZXBsYWNlKC9bLV9cXHNdKyguKT8vZywgZnVuY3Rpb24obWF0Y2gsIGMpeyByZXR1cm4gYyA/IGMudG9VcHBlckNhc2UoKSA6IFwiXCI7IH0pO1xuICAgIH0sXG5cbiAgICB1bmRlcnNjb3JlZDogZnVuY3Rpb24oc3RyKXtcbiAgICAgIHJldHVybiBfcy50cmltKHN0cikucmVwbGFjZSgvKFthLXpcXGRdKShbQS1aXSspL2csICckMV8kMicpLnJlcGxhY2UoL1stXFxzXSsvZywgJ18nKS50b0xvd2VyQ2FzZSgpO1xuICAgIH0sXG5cbiAgICBkYXNoZXJpemU6IGZ1bmN0aW9uKHN0cil7XG4gICAgICByZXR1cm4gX3MudHJpbShzdHIpLnJlcGxhY2UoLyhbQS1aXSkvZywgJy0kMScpLnJlcGxhY2UoL1stX1xcc10rL2csICctJykudG9Mb3dlckNhc2UoKTtcbiAgICB9LFxuXG4gICAgY2xhc3NpZnk6IGZ1bmN0aW9uKHN0cil7XG4gICAgICByZXR1cm4gX3MudGl0bGVpemUoU3RyaW5nKHN0cikucmVwbGFjZSgvW1xcV19dL2csICcgJykpLnJlcGxhY2UoL1xccy9nLCAnJyk7XG4gICAgfSxcblxuICAgIGh1bWFuaXplOiBmdW5jdGlvbihzdHIpe1xuICAgICAgcmV0dXJuIF9zLmNhcGl0YWxpemUoX3MudW5kZXJzY29yZWQoc3RyKS5yZXBsYWNlKC9faWQkLywnJykucmVwbGFjZSgvXy9nLCAnICcpKTtcbiAgICB9LFxuXG4gICAgdHJpbTogZnVuY3Rpb24oc3RyLCBjaGFyYWN0ZXJzKXtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgaWYgKCFjaGFyYWN0ZXJzICYmIG5hdGl2ZVRyaW0pIHJldHVybiBuYXRpdmVUcmltLmNhbGwoc3RyKTtcbiAgICAgIGNoYXJhY3RlcnMgPSBkZWZhdWx0VG9XaGl0ZVNwYWNlKGNoYXJhY3RlcnMpO1xuICAgICAgcmV0dXJuIFN0cmluZyhzdHIpLnJlcGxhY2UobmV3IFJlZ0V4cCgnXFxeJyArIGNoYXJhY3RlcnMgKyAnK3wnICsgY2hhcmFjdGVycyArICcrJCcsICdnJyksICcnKTtcbiAgICB9LFxuXG4gICAgbHRyaW06IGZ1bmN0aW9uKHN0ciwgY2hhcmFjdGVycyl7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIGlmICghY2hhcmFjdGVycyAmJiBuYXRpdmVUcmltTGVmdCkgcmV0dXJuIG5hdGl2ZVRyaW1MZWZ0LmNhbGwoc3RyKTtcbiAgICAgIGNoYXJhY3RlcnMgPSBkZWZhdWx0VG9XaGl0ZVNwYWNlKGNoYXJhY3RlcnMpO1xuICAgICAgcmV0dXJuIFN0cmluZyhzdHIpLnJlcGxhY2UobmV3IFJlZ0V4cCgnXicgKyBjaGFyYWN0ZXJzICsgJysnKSwgJycpO1xuICAgIH0sXG5cbiAgICBydHJpbTogZnVuY3Rpb24oc3RyLCBjaGFyYWN0ZXJzKXtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgaWYgKCFjaGFyYWN0ZXJzICYmIG5hdGl2ZVRyaW1SaWdodCkgcmV0dXJuIG5hdGl2ZVRyaW1SaWdodC5jYWxsKHN0cik7XG4gICAgICBjaGFyYWN0ZXJzID0gZGVmYXVsdFRvV2hpdGVTcGFjZShjaGFyYWN0ZXJzKTtcbiAgICAgIHJldHVybiBTdHJpbmcoc3RyKS5yZXBsYWNlKG5ldyBSZWdFeHAoY2hhcmFjdGVycyArICcrJCcpLCAnJyk7XG4gICAgfSxcblxuICAgIHRydW5jYXRlOiBmdW5jdGlvbihzdHIsIGxlbmd0aCwgdHJ1bmNhdGVTdHIpe1xuICAgICAgaWYgKHN0ciA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICBzdHIgPSBTdHJpbmcoc3RyKTsgdHJ1bmNhdGVTdHIgPSB0cnVuY2F0ZVN0ciB8fCAnLi4uJztcbiAgICAgIGxlbmd0aCA9IH5+bGVuZ3RoO1xuICAgICAgcmV0dXJuIHN0ci5sZW5ndGggPiBsZW5ndGggPyBzdHIuc2xpY2UoMCwgbGVuZ3RoKSArIHRydW5jYXRlU3RyIDogc3RyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBfcy5wcnVuZTogYSBtb3JlIGVsZWdhbnQgdmVyc2lvbiBvZiB0cnVuY2F0ZVxuICAgICAqIHBydW5lIGV4dHJhIGNoYXJzLCBuZXZlciBsZWF2aW5nIGEgaGFsZi1jaG9wcGVkIHdvcmQuXG4gICAgICogQGF1dGhvciBnaXRodWIuY29tL3J3elxuICAgICAqL1xuICAgIHBydW5lOiBmdW5jdGlvbihzdHIsIGxlbmd0aCwgcHJ1bmVTdHIpe1xuICAgICAgaWYgKHN0ciA9PSBudWxsKSByZXR1cm4gJyc7XG5cbiAgICAgIHN0ciA9IFN0cmluZyhzdHIpOyBsZW5ndGggPSB+fmxlbmd0aDtcbiAgICAgIHBydW5lU3RyID0gcHJ1bmVTdHIgIT0gbnVsbCA/IFN0cmluZyhwcnVuZVN0cikgOiAnLi4uJztcblxuICAgICAgaWYgKHN0ci5sZW5ndGggPD0gbGVuZ3RoKSByZXR1cm4gc3RyO1xuXG4gICAgICB2YXIgdG1wbCA9IGZ1bmN0aW9uKGMpeyByZXR1cm4gYy50b1VwcGVyQ2FzZSgpICE9PSBjLnRvTG93ZXJDYXNlKCkgPyAnQScgOiAnICc7IH0sXG4gICAgICAgIHRlbXBsYXRlID0gc3RyLnNsaWNlKDAsIGxlbmd0aCsxKS5yZXBsYWNlKC8uKD89XFxXKlxcdyokKS9nLCB0bXBsKTsgLy8gJ0hlbGxvLCB3b3JsZCcgLT4gJ0hlbGxBQSBBQUFBQSdcblxuICAgICAgaWYgKHRlbXBsYXRlLnNsaWNlKHRlbXBsYXRlLmxlbmd0aC0yKS5tYXRjaCgvXFx3XFx3LykpXG4gICAgICAgIHRlbXBsYXRlID0gdGVtcGxhdGUucmVwbGFjZSgvXFxzKlxcUyskLywgJycpO1xuICAgICAgZWxzZVxuICAgICAgICB0ZW1wbGF0ZSA9IF9zLnJ0cmltKHRlbXBsYXRlLnNsaWNlKDAsIHRlbXBsYXRlLmxlbmd0aC0xKSk7XG5cbiAgICAgIHJldHVybiAodGVtcGxhdGUrcHJ1bmVTdHIpLmxlbmd0aCA+IHN0ci5sZW5ndGggPyBzdHIgOiBzdHIuc2xpY2UoMCwgdGVtcGxhdGUubGVuZ3RoKStwcnVuZVN0cjtcbiAgICB9LFxuXG4gICAgd29yZHM6IGZ1bmN0aW9uKHN0ciwgZGVsaW1pdGVyKSB7XG4gICAgICBpZiAoX3MuaXNCbGFuayhzdHIpKSByZXR1cm4gW107XG4gICAgICByZXR1cm4gX3MudHJpbShzdHIsIGRlbGltaXRlcikuc3BsaXQoZGVsaW1pdGVyIHx8IC9cXHMrLyk7XG4gICAgfSxcblxuICAgIHBhZDogZnVuY3Rpb24oc3RyLCBsZW5ndGgsIHBhZFN0ciwgdHlwZSkge1xuICAgICAgc3RyID0gc3RyID09IG51bGwgPyAnJyA6IFN0cmluZyhzdHIpO1xuICAgICAgbGVuZ3RoID0gfn5sZW5ndGg7XG5cbiAgICAgIHZhciBwYWRsZW4gID0gMDtcblxuICAgICAgaWYgKCFwYWRTdHIpXG4gICAgICAgIHBhZFN0ciA9ICcgJztcbiAgICAgIGVsc2UgaWYgKHBhZFN0ci5sZW5ndGggPiAxKVxuICAgICAgICBwYWRTdHIgPSBwYWRTdHIuY2hhckF0KDApO1xuXG4gICAgICBzd2l0Y2godHlwZSkge1xuICAgICAgICBjYXNlICdyaWdodCc6XG4gICAgICAgICAgcGFkbGVuID0gbGVuZ3RoIC0gc3RyLmxlbmd0aDtcbiAgICAgICAgICByZXR1cm4gc3RyICsgc3RyUmVwZWF0KHBhZFN0ciwgcGFkbGVuKTtcbiAgICAgICAgY2FzZSAnYm90aCc6XG4gICAgICAgICAgcGFkbGVuID0gbGVuZ3RoIC0gc3RyLmxlbmd0aDtcbiAgICAgICAgICByZXR1cm4gc3RyUmVwZWF0KHBhZFN0ciwgTWF0aC5jZWlsKHBhZGxlbi8yKSkgKyBzdHJcbiAgICAgICAgICAgICAgICAgICsgc3RyUmVwZWF0KHBhZFN0ciwgTWF0aC5mbG9vcihwYWRsZW4vMikpO1xuICAgICAgICBkZWZhdWx0OiAvLyAnbGVmdCdcbiAgICAgICAgICBwYWRsZW4gPSBsZW5ndGggLSBzdHIubGVuZ3RoO1xuICAgICAgICAgIHJldHVybiBzdHJSZXBlYXQocGFkU3RyLCBwYWRsZW4pICsgc3RyO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGxwYWQ6IGZ1bmN0aW9uKHN0ciwgbGVuZ3RoLCBwYWRTdHIpIHtcbiAgICAgIHJldHVybiBfcy5wYWQoc3RyLCBsZW5ndGgsIHBhZFN0cik7XG4gICAgfSxcblxuICAgIHJwYWQ6IGZ1bmN0aW9uKHN0ciwgbGVuZ3RoLCBwYWRTdHIpIHtcbiAgICAgIHJldHVybiBfcy5wYWQoc3RyLCBsZW5ndGgsIHBhZFN0ciwgJ3JpZ2h0Jyk7XG4gICAgfSxcblxuICAgIGxycGFkOiBmdW5jdGlvbihzdHIsIGxlbmd0aCwgcGFkU3RyKSB7XG4gICAgICByZXR1cm4gX3MucGFkKHN0ciwgbGVuZ3RoLCBwYWRTdHIsICdib3RoJyk7XG4gICAgfSxcblxuICAgIHNwcmludGY6IHNwcmludGYsXG5cbiAgICB2c3ByaW50ZjogZnVuY3Rpb24oZm10LCBhcmd2KXtcbiAgICAgIGFyZ3YudW5zaGlmdChmbXQpO1xuICAgICAgcmV0dXJuIHNwcmludGYuYXBwbHkobnVsbCwgYXJndik7XG4gICAgfSxcblxuICAgIHRvTnVtYmVyOiBmdW5jdGlvbihzdHIsIGRlY2ltYWxzKSB7XG4gICAgICBpZiAoIXN0cikgcmV0dXJuIDA7XG4gICAgICBzdHIgPSBfcy50cmltKHN0cik7XG4gICAgICBpZiAoIXN0ci5tYXRjaCgvXi0/XFxkKyg/OlxcLlxcZCspPyQvKSkgcmV0dXJuIE5hTjtcbiAgICAgIHJldHVybiBwYXJzZU51bWJlcihwYXJzZU51bWJlcihzdHIpLnRvRml4ZWQofn5kZWNpbWFscykpO1xuICAgIH0sXG5cbiAgICBudW1iZXJGb3JtYXQgOiBmdW5jdGlvbihudW1iZXIsIGRlYywgZHNlcCwgdHNlcCkge1xuICAgICAgaWYgKGlzTmFOKG51bWJlcikgfHwgbnVtYmVyID09IG51bGwpIHJldHVybiAnJztcblxuICAgICAgbnVtYmVyID0gbnVtYmVyLnRvRml4ZWQofn5kZWMpO1xuICAgICAgdHNlcCA9IHR5cGVvZiB0c2VwID09ICdzdHJpbmcnID8gdHNlcCA6ICcsJztcblxuICAgICAgdmFyIHBhcnRzID0gbnVtYmVyLnNwbGl0KCcuJyksIGZudW1zID0gcGFydHNbMF0sXG4gICAgICAgIGRlY2ltYWxzID0gcGFydHNbMV0gPyAoZHNlcCB8fCAnLicpICsgcGFydHNbMV0gOiAnJztcblxuICAgICAgcmV0dXJuIGZudW1zLnJlcGxhY2UoLyhcXGQpKD89KD86XFxkezN9KSskKS9nLCAnJDEnICsgdHNlcCkgKyBkZWNpbWFscztcbiAgICB9LFxuXG4gICAgc3RyUmlnaHQ6IGZ1bmN0aW9uKHN0ciwgc2VwKXtcbiAgICAgIGlmIChzdHIgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgc3RyID0gU3RyaW5nKHN0cik7IHNlcCA9IHNlcCAhPSBudWxsID8gU3RyaW5nKHNlcCkgOiBzZXA7XG4gICAgICB2YXIgcG9zID0gIXNlcCA/IC0xIDogc3RyLmluZGV4T2Yoc2VwKTtcbiAgICAgIHJldHVybiB+cG9zID8gc3RyLnNsaWNlKHBvcytzZXAubGVuZ3RoLCBzdHIubGVuZ3RoKSA6IHN0cjtcbiAgICB9LFxuXG4gICAgc3RyUmlnaHRCYWNrOiBmdW5jdGlvbihzdHIsIHNlcCl7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHN0ciA9IFN0cmluZyhzdHIpOyBzZXAgPSBzZXAgIT0gbnVsbCA/IFN0cmluZyhzZXApIDogc2VwO1xuICAgICAgdmFyIHBvcyA9ICFzZXAgPyAtMSA6IHN0ci5sYXN0SW5kZXhPZihzZXApO1xuICAgICAgcmV0dXJuIH5wb3MgPyBzdHIuc2xpY2UocG9zK3NlcC5sZW5ndGgsIHN0ci5sZW5ndGgpIDogc3RyO1xuICAgIH0sXG5cbiAgICBzdHJMZWZ0OiBmdW5jdGlvbihzdHIsIHNlcCl7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHN0ciA9IFN0cmluZyhzdHIpOyBzZXAgPSBzZXAgIT0gbnVsbCA/IFN0cmluZyhzZXApIDogc2VwO1xuICAgICAgdmFyIHBvcyA9ICFzZXAgPyAtMSA6IHN0ci5pbmRleE9mKHNlcCk7XG4gICAgICByZXR1cm4gfnBvcyA/IHN0ci5zbGljZSgwLCBwb3MpIDogc3RyO1xuICAgIH0sXG5cbiAgICBzdHJMZWZ0QmFjazogZnVuY3Rpb24oc3RyLCBzZXApe1xuICAgICAgaWYgKHN0ciA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICBzdHIgKz0gJyc7IHNlcCA9IHNlcCAhPSBudWxsID8gJycrc2VwIDogc2VwO1xuICAgICAgdmFyIHBvcyA9IHN0ci5sYXN0SW5kZXhPZihzZXApO1xuICAgICAgcmV0dXJuIH5wb3MgPyBzdHIuc2xpY2UoMCwgcG9zKSA6IHN0cjtcbiAgICB9LFxuXG4gICAgdG9TZW50ZW5jZTogZnVuY3Rpb24oYXJyYXksIHNlcGFyYXRvciwgbGFzdFNlcGFyYXRvciwgc2VyaWFsKSB7XG4gICAgICBzZXBhcmF0b3IgPSBzZXBhcmF0b3IgfHwgJywgJztcbiAgICAgIGxhc3RTZXBhcmF0b3IgPSBsYXN0U2VwYXJhdG9yIHx8ICcgYW5kICc7XG4gICAgICB2YXIgYSA9IGFycmF5LnNsaWNlKCksIGxhc3RNZW1iZXIgPSBhLnBvcCgpO1xuXG4gICAgICBpZiAoYXJyYXkubGVuZ3RoID4gMiAmJiBzZXJpYWwpIGxhc3RTZXBhcmF0b3IgPSBfcy5ydHJpbShzZXBhcmF0b3IpICsgbGFzdFNlcGFyYXRvcjtcblxuICAgICAgcmV0dXJuIGEubGVuZ3RoID8gYS5qb2luKHNlcGFyYXRvcikgKyBsYXN0U2VwYXJhdG9yICsgbGFzdE1lbWJlciA6IGxhc3RNZW1iZXI7XG4gICAgfSxcblxuICAgIHRvU2VudGVuY2VTZXJpYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICBhcmdzWzNdID0gdHJ1ZTtcbiAgICAgIHJldHVybiBfcy50b1NlbnRlbmNlLmFwcGx5KF9zLCBhcmdzKTtcbiAgICB9LFxuXG4gICAgc2x1Z2lmeTogZnVuY3Rpb24oc3RyKSB7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcblxuICAgICAgdmFyIGZyb20gID0gXCLEhcOgw6HDpMOiw6PDpcOmxIPEh8SZw6jDqcOrw6rDrMOtw6/DrsWCxYTDssOzw7bDtMO1w7jFm8iZyJvDucO6w7zDu8Oxw6fFvMW6XCIsXG4gICAgICAgICAgdG8gICAgPSBcImFhYWFhYWFhYWNlZWVlZWlpaWlsbm9vb29vb3NzdHV1dXVuY3p6XCIsXG4gICAgICAgICAgcmVnZXggPSBuZXcgUmVnRXhwKGRlZmF1bHRUb1doaXRlU3BhY2UoZnJvbSksICdnJyk7XG5cbiAgICAgIHN0ciA9IFN0cmluZyhzdHIpLnRvTG93ZXJDYXNlKCkucmVwbGFjZShyZWdleCwgZnVuY3Rpb24oYyl7XG4gICAgICAgIHZhciBpbmRleCA9IGZyb20uaW5kZXhPZihjKTtcbiAgICAgICAgcmV0dXJuIHRvLmNoYXJBdChpbmRleCkgfHwgJy0nO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBfcy5kYXNoZXJpemUoc3RyLnJlcGxhY2UoL1teXFx3XFxzLV0vZywgJycpKTtcbiAgICB9LFxuXG4gICAgc3Vycm91bmQ6IGZ1bmN0aW9uKHN0ciwgd3JhcHBlcikge1xuICAgICAgcmV0dXJuIFt3cmFwcGVyLCBzdHIsIHdyYXBwZXJdLmpvaW4oJycpO1xuICAgIH0sXG5cbiAgICBxdW90ZTogZnVuY3Rpb24oc3RyLCBxdW90ZUNoYXIpIHtcbiAgICAgIHJldHVybiBfcy5zdXJyb3VuZChzdHIsIHF1b3RlQ2hhciB8fCAnXCInKTtcbiAgICB9LFxuXG4gICAgdW5xdW90ZTogZnVuY3Rpb24oc3RyLCBxdW90ZUNoYXIpIHtcbiAgICAgIHF1b3RlQ2hhciA9IHF1b3RlQ2hhciB8fCAnXCInO1xuICAgICAgaWYgKHN0clswXSA9PT0gcXVvdGVDaGFyICYmIHN0cltzdHIubGVuZ3RoLTFdID09PSBxdW90ZUNoYXIpXG4gICAgICAgIHJldHVybiBzdHIuc2xpY2UoMSxzdHIubGVuZ3RoLTEpO1xuICAgICAgZWxzZSByZXR1cm4gc3RyO1xuICAgIH0sXG5cbiAgICBleHBvcnRzOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgZm9yICh2YXIgcHJvcCBpbiB0aGlzKSB7XG4gICAgICAgIGlmICghdGhpcy5oYXNPd25Qcm9wZXJ0eShwcm9wKSB8fCBwcm9wLm1hdGNoKC9eKD86aW5jbHVkZXxjb250YWluc3xyZXZlcnNlKSQvKSkgY29udGludWU7XG4gICAgICAgIHJlc3VsdFtwcm9wXSA9IHRoaXNbcHJvcF07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIHJlcGVhdDogZnVuY3Rpb24oc3RyLCBxdHksIHNlcGFyYXRvcil7XG4gICAgICBpZiAoc3RyID09IG51bGwpIHJldHVybiAnJztcblxuICAgICAgcXR5ID0gfn5xdHk7XG5cbiAgICAgIC8vIHVzaW5nIGZhc3RlciBpbXBsZW1lbnRhdGlvbiBpZiBzZXBhcmF0b3IgaXMgbm90IG5lZWRlZDtcbiAgICAgIGlmIChzZXBhcmF0b3IgPT0gbnVsbCkgcmV0dXJuIHN0clJlcGVhdChTdHJpbmcoc3RyKSwgcXR5KTtcblxuICAgICAgLy8gdGhpcyBvbmUgaXMgYWJvdXQgMzAweCBzbG93ZXIgaW4gR29vZ2xlIENocm9tZVxuICAgICAgZm9yICh2YXIgcmVwZWF0ID0gW107IHF0eSA+IDA7IHJlcGVhdFstLXF0eV0gPSBzdHIpIHt9XG4gICAgICByZXR1cm4gcmVwZWF0LmpvaW4oc2VwYXJhdG9yKTtcbiAgICB9LFxuXG4gICAgbmF0dXJhbENtcDogZnVuY3Rpb24oc3RyMSwgc3RyMil7XG4gICAgICBpZiAoc3RyMSA9PSBzdHIyKSByZXR1cm4gMDtcbiAgICAgIGlmICghc3RyMSkgcmV0dXJuIC0xO1xuICAgICAgaWYgKCFzdHIyKSByZXR1cm4gMTtcblxuICAgICAgdmFyIGNtcFJlZ2V4ID0gLyhcXC5cXGQrKXwoXFxkKyl8KFxcRCspL2csXG4gICAgICAgIHRva2VuczEgPSBTdHJpbmcoc3RyMSkudG9Mb3dlckNhc2UoKS5tYXRjaChjbXBSZWdleCksXG4gICAgICAgIHRva2VuczIgPSBTdHJpbmcoc3RyMikudG9Mb3dlckNhc2UoKS5tYXRjaChjbXBSZWdleCksXG4gICAgICAgIGNvdW50ID0gTWF0aC5taW4odG9rZW5zMS5sZW5ndGgsIHRva2VuczIubGVuZ3RoKTtcblxuICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgdmFyIGEgPSB0b2tlbnMxW2ldLCBiID0gdG9rZW5zMltpXTtcblxuICAgICAgICBpZiAoYSAhPT0gYil7XG4gICAgICAgICAgdmFyIG51bTEgPSBwYXJzZUludChhLCAxMCk7XG4gICAgICAgICAgaWYgKCFpc05hTihudW0xKSl7XG4gICAgICAgICAgICB2YXIgbnVtMiA9IHBhcnNlSW50KGIsIDEwKTtcbiAgICAgICAgICAgIGlmICghaXNOYU4obnVtMikgJiYgbnVtMSAtIG51bTIpXG4gICAgICAgICAgICAgIHJldHVybiBudW0xIC0gbnVtMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0b2tlbnMxLmxlbmd0aCA9PT0gdG9rZW5zMi5sZW5ndGgpXG4gICAgICAgIHJldHVybiB0b2tlbnMxLmxlbmd0aCAtIHRva2VuczIubGVuZ3RoO1xuXG4gICAgICByZXR1cm4gc3RyMSA8IHN0cjIgPyAtMSA6IDE7XG4gICAgfSxcblxuICAgIGxldmVuc2h0ZWluOiBmdW5jdGlvbihzdHIxLCBzdHIyKSB7XG4gICAgICBpZiAoc3RyMSA9PSBudWxsICYmIHN0cjIgPT0gbnVsbCkgcmV0dXJuIDA7XG4gICAgICBpZiAoc3RyMSA9PSBudWxsKSByZXR1cm4gU3RyaW5nKHN0cjIpLmxlbmd0aDtcbiAgICAgIGlmIChzdHIyID09IG51bGwpIHJldHVybiBTdHJpbmcoc3RyMSkubGVuZ3RoO1xuXG4gICAgICBzdHIxID0gU3RyaW5nKHN0cjEpOyBzdHIyID0gU3RyaW5nKHN0cjIpO1xuXG4gICAgICB2YXIgY3VycmVudCA9IFtdLCBwcmV2LCB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPD0gc3RyMi5sZW5ndGg7IGkrKylcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPD0gc3RyMS5sZW5ndGg7IGorKykge1xuICAgICAgICAgIGlmIChpICYmIGopXG4gICAgICAgICAgICBpZiAoc3RyMS5jaGFyQXQoaiAtIDEpID09PSBzdHIyLmNoYXJBdChpIC0gMSkpXG4gICAgICAgICAgICAgIHZhbHVlID0gcHJldjtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgdmFsdWUgPSBNYXRoLm1pbihjdXJyZW50W2pdLCBjdXJyZW50W2ogLSAxXSwgcHJldikgKyAxO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHZhbHVlID0gaSArIGo7XG5cbiAgICAgICAgICBwcmV2ID0gY3VycmVudFtqXTtcbiAgICAgICAgICBjdXJyZW50W2pdID0gdmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgcmV0dXJuIGN1cnJlbnQucG9wKCk7XG4gICAgfSxcblxuICAgIHRvQm9vbGVhbjogZnVuY3Rpb24oc3RyLCB0cnVlVmFsdWVzLCBmYWxzZVZhbHVlcykge1xuICAgICAgaWYgKHR5cGVvZiBzdHIgPT09IFwibnVtYmVyXCIpIHN0ciA9IFwiXCIgKyBzdHI7XG4gICAgICBpZiAodHlwZW9mIHN0ciAhPT0gXCJzdHJpbmdcIikgcmV0dXJuICEhc3RyO1xuICAgICAgc3RyID0gX3MudHJpbShzdHIpO1xuICAgICAgaWYgKGJvb2xNYXRjaChzdHIsIHRydWVWYWx1ZXMgfHwgW1widHJ1ZVwiLCBcIjFcIl0pKSByZXR1cm4gdHJ1ZTtcbiAgICAgIGlmIChib29sTWF0Y2goc3RyLCBmYWxzZVZhbHVlcyB8fCBbXCJmYWxzZVwiLCBcIjBcIl0pKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIC8vIEFsaWFzZXNcblxuICBfcy5zdHJpcCAgICA9IF9zLnRyaW07XG4gIF9zLmxzdHJpcCAgID0gX3MubHRyaW07XG4gIF9zLnJzdHJpcCAgID0gX3MucnRyaW07XG4gIF9zLmNlbnRlciAgID0gX3MubHJwYWQ7XG4gIF9zLnJqdXN0ICAgID0gX3MubHBhZDtcbiAgX3MubGp1c3QgICAgPSBfcy5ycGFkO1xuICBfcy5jb250YWlucyA9IF9zLmluY2x1ZGU7XG4gIF9zLnEgICAgICAgID0gX3MucXVvdGU7XG4gIF9zLnRvQm9vbCAgID0gX3MudG9Cb29sZWFuO1xuXG4gIC8vIEV4cG9ydGluZ1xuXG4gIC8vIENvbW1vbkpTIG1vZHVsZSBpcyBkZWZpbmVkXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpXG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IF9zO1xuXG4gICAgZXhwb3J0cy5fcyA9IF9zO1xuICB9XG5cbiAgLy8gUmVnaXN0ZXIgYXMgYSBuYW1lZCBtb2R1bGUgd2l0aCBBTUQuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpXG4gICAgZGVmaW5lKCd1bmRlcnNjb3JlLnN0cmluZycsIFtdLCBmdW5jdGlvbigpeyByZXR1cm4gX3M7IH0pO1xuXG5cbiAgLy8gSW50ZWdyYXRlIHdpdGggVW5kZXJzY29yZS5qcyBpZiBkZWZpbmVkXG4gIC8vIG9yIGNyZWF0ZSBvdXIgb3duIHVuZGVyc2NvcmUgb2JqZWN0LlxuICByb290Ll8gPSByb290Ll8gfHwge307XG4gIHJvb3QuXy5zdHJpbmcgPSByb290Ll8uc3RyID0gX3M7XG59KHRoaXMsIFN0cmluZyk7XG4iXX0=
