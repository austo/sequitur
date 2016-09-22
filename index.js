'use strict';

const EventEmitter = require('events');

function seq(funcs, callback) {
  validateFuncs(funcs);

  let i = 0,
    n = funcs.length,
    ee = new EventEmitter(),
    useCallback = {
      error: false,
      done: false
    };

  if (typeof callback === 'function') {
    ee.on('error', callback);
    useCallback['error'] = true;
    ee.on('done', callback);
    useCallback['done'] = true;
  }

  ee.on('newListener', (evt, fn) => {
    if (!useCallback[evt]) {
      return;
    }
    if (fn === callback) {
      return;
    }
    if (evt === 'error' || evt === 'done') {
      ee.removeListener(evt, callback);
      useCallback[evt] = false;
    }
  });

  let prevArgs = [];

  function next(err) {
    let args = Array.prototype.slice.call(arguments, 1);
    if (err) {
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
      args.unshift(null);
    }
    args.unshift('done');
    ee.emit.apply(ee, args);
  }

  process.nextTick(() => {
    let e = ensureListeners(ee, Object.keys(useCallback));
    if (e) {
      // If no 'error' event is registered, this will
      // throw a TypeError that can only be handled using
      // domains or `process.on('uncaughtException')`.
      // See `test/sequence.test.js` and
      // https://nodejs.org/api/events.html#events_error_events
      return ee.emit('error', e);
    }
    if (n === 0) {
      return ee.emit('done', null);
    }
    funcs[i](next);
  });
  ee.name = 'Sequence';
  return ee;
}

function validateFuncs(funcs) {
  if (!Array.isArray(funcs)) {
    throw new TypeError('sequence: first argument must be an array');
  }

  funcs.forEach((f, i) => {
    if (typeof f !== 'function') {
      throw new TypeError(`sequence: non-function at index ${i}`);
    }
    if (!f.length) {
      throw new TypeError(`sequence: function at index ${i} must take at least 1 argument`);
    }
  });
}

function ensureListeners(ee, events) {
  let errs = [];

  events.forEach(evt => {
    if (ee.listenerCount(evt) === 0) {
      errs.push(`no "${evt}" listener`);
    }
  });
  if (errs.length) {
    let e = new TypeError('sequence: required listeners not found');
    e.details = errs;
    return e;
  }
  return null;
}

module.exports = seq;
