'use strict';

const EventEmitter = require('events'),
  utils = require('./utils');

function seq(funcs, callback) {
  const name = 'Sequence';

  utils.validateFuncs(funcs, 1, name);

  let i = 0,
    n = funcs.length,
    ee = new EventEmitter(),
    useCallback = {
      error: false,
      done: false
    };

  ee.name = name;
  utils.attachHandlers(ee, useCallback, callback);

  let prevArgs = [];

  function next(err) {
    let args = Array.prototype.slice.call(arguments, 1);
    if (err) {
      // if useCallback[err] add extra `resume` param

      if (i >= n) {
        return ee.emit('error', err);
      }
      let sargs = args.length ? args : prevArgs;
      return ee.emit('error', err, function() {
        sargs.unshift(null);
        next.apply(null, sargs);
      });
    }

    prevArgs = Array.from(args);

    if (++i < n) {
      args.push(next);
      return funcs[i].apply(null, args);
    }
    if (useCallback['done']) {
      // add extra `resume` param (null)
      args.unshift(null);
    }
    args.unshift('done');
    ee.emit.apply(ee, args);
  }

  process.nextTick(() => {
    let e = utils.ensureListeners(ee, useCallback);
    if (e) {
      // If no 'error' event is registered, this will
      // throw a TypeError that can only be handled using
      // domains or `process.on('uncaughtException')`.
      // See `test/sequence.test.js` and
      // https://nodejs.org/api/events.html#events_error_events
      return ee.emit('error', e);
    }
    if (n === 0) {
      return ee.emit('done');
    }
    funcs[i](next);
  });
  return ee;
}

seq.sequence = seq;
seq.parallel = require('./parallel');

module.exports = seq;
