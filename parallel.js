'use strict';

const EventEmitter = require('events'),
  utils = require('./utils');

function parallel(funcs, _args, _callback) {
  const name = 'Parallel',
    allowedEvents = ['done', 'each', 'error'];
  if (!Array.isArray(funcs)) {
    throw new TypeError(`${name}: first argument must be an array`);
  }

  let args = [],
    arglen = 0,
    callback;

  if (Array.isArray(_args)) {
    args = _args;
    arglen = args.length;
  }
  if (typeof _args === 'function') {
    callback = _args;
  }
  if (typeof _callback === 'function') {
    callback = _callback;
  }
  utils.validateFuncs(funcs, arglen + 1, name);

  let i = 0,
    n = funcs.length,
    ee = new EventEmitter(),
    useCallback = {
      each: false,
      error: false
    },
    stopped = false;

  ee.name = name;
  utils.attachHandlers(ee, useCallback, callback);

  // TODO: generated callback should provide a `stop` function on error,
  // which unbinds all pending event handlers to replicate "parallel-first"
  // functionality. Package user-defined callback as fn(err, stop, args...).

  function stop() {
    utils.removeAllListeners(ee, allowedEvents);
    stopped = true;
  }

  function handle(err) {
    let eachArgs = Array.prototype.slice.call(arguments, 1);
    i++;
    if (err) {
      if (stopped) {
        return;
      }
      if (i < n) {
        return ee.emit('error', err, stop);
      }
      return ee.emit('error', err);
    }
    eachArgs.unshift((i < n) ? stop : null);
    if (useCallback['each']) {
      eachArgs.unshift(null);
    }
    eachArgs.unshift('each');
    ee.emit.apply(ee, eachArgs);
    if (i === n) {
      return ee.emit('done');
    }
  }

  args.push(handle);

  process.nextTick(() => {
    let e = utils.ensureListeners(ee, useCallback);
    if (e) {
      return ee.emit('error', e);
    }
    if (n === 0) {
      ee.emit('each');
      return ee.emit('done');
    }
    funcs.forEach(fn => {
      fn.apply(null, args);
    });
  });
  return ee;
}

module.exports = parallel;
