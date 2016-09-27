'use strict';

const EventEmitter = require('events'),
  utils = require('./utils');

function seq(funcs, _args, _callback) {
  const name = 'Sequence';

  let ctx = utils.validateArgs(name, funcs, _args, _callback);

  let i = 0,
    n = funcs.length,
    ee = new EventEmitter(),
    useCallback = {
      error: false,
      done: false
    },
    hasArgs = ctx.args.length > 0;

  ee.name = name;
  utils.attachHandlers(ee, useCallback, ctx.callback);

  let prevArgs = [];

  function next(err) {
    let eachArgs = hasArgs ? Array.from(ctx.args) :
      Array.prototype.slice.call(arguments, 1);
    i++;
    if (err) {
      // if useCallback[err] add extra `resume` param
      if (i < n) {
        let sargs = eachArgs.length ? eachArgs : prevArgs;
        sargs.push(next);
        return ee.emit('error', err, function() {
          funcs[i].apply(null, sargs);
        });
      }
      return ee.emit('error', err);
    }

    prevArgs = Array.from(eachArgs);

    if (i < n) {
      eachArgs.push(next);
      return funcs[i].apply(null, eachArgs);
    }
    if (useCallback['done']) {
      // add extra `resume` param (null)
      eachArgs.unshift(null, null);
    }
    eachArgs.unshift('done');
    ee.emit.apply(ee, eachArgs);
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
    let args = hasArgs ? Array.from(ctx.args) : [];
    args.push(next);
    funcs[i].apply(null, args);
  });
  return ee;
}

seq.sequence = seq;
seq.parallel = require('./parallel');

module.exports = seq;
