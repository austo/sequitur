'use strict';

const EventEmitter = require('events'),
  utils = require('./utils');

function parallel(funcs, _args, _callback) {
  const name = 'Parallel',
    allowedEvents = ['done', 'each', 'error'];

  const ctx = utils.validateArgs(name, funcs, _args, _callback);

  var i = 0,
    stopped = false;
  const n = funcs.length,
    ee = new EventEmitter(),
    useCallback = {
      each: false,
      error: false
    };

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
    const eachArgs = utils.slice.apply(null, arguments).slice(1);
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
    if (useCallback['each']) {
      eachArgs.unshift((i < n) ? stop : null);
      eachArgs.unshift(null);
    } else {
      eachArgs.push((i < n) ? stop : null);
    }
    eachArgs.unshift('each');
    ee.emit.apply(ee, eachArgs);
    if (i === n) {
      return ee.emit('done');
    }
  }

  ctx.args.push(handle);

  process.nextTick(() => {
    const e = utils.ensureListeners(ee, useCallback);
    if (e) {
      return ee.emit('error', e);
    }
    if (n === 0) {
      if (ee.listenerCount('done')) {
        return ee.emit('done');
      }
      return ee.emit('each');
    }
    funcs.forEach(fn => {
      fn.apply(null, ctx.args);
    });
  });
  return ee;
}

module.exports = parallel;
