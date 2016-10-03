'use strict';

const EventEmitter = require('events'),
  utils = require('./utils');

function parallel(funcs, _args, _callback) {
  const name = 'Parallel',
    allowedEvents = ['done', 'each', 'error'];

  let ctx = utils.validateArgs(name, funcs, _args, _callback);

  let i = 0,
    n = funcs.length,
    ee = new EventEmitter(),
    useCallback = {
      each: false,
      error: false
    },
    stopped = false;

  ee.name = name;
  utils.attachHandlers(ee, useCallback, ctx.callback);

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
      ee.emit('error', err);
      return ee.emit('done');
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

  ctx.args.push(handle);

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
      fn.apply(null, ctx.args);
    });
  });
  return ee;
}

module.exports = parallel;
