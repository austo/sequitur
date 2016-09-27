'use strict';

function validateArgs(name, funcs, _args, _callback) {
  if (!Array.isArray(funcs)) {
    throw new TypeError(`${name}: first argument must be an array`);
  }

  let ctx = {
    args: []
  };

  if (Array.isArray(_args)) {
    ctx.args = _args;
  }
  if (typeof _args === 'function') {
    ctx.callback = _args;
  }
  if (typeof _callback === 'function') {
    ctx.callback = _callback;
  }
  // TODO: something smarter when we implement forEach
  validateFuncs(funcs, ctx.args.length + 1, name);
  return ctx;
}

function validateFuncs(funcs, arglen, name) {
  if (!Array.isArray(funcs)) {
    throw new TypeError(`${name}: first argument must be an array`);
  }

  const articleNoun = arglen === 1 ? '1 argument' : `${arglen} arguments`;

  funcs.forEach((f, i) => {
    if (typeof f !== 'function') {
      throw new TypeError(`${name}: non-function at index ${i}`);
    }
    if (f.length < arglen) {
      throw new TypeError(`${name}: function at index ${i} must take at least ${articleNoun}`);
    }
  });
}

function Context(name, ee, arglen, useCallback, callback) {
  if (!(this instanceof Context)) {
    return new Context(name, ee, arglen, useCallback, callback);
  }
  this.name = name;
  this.ee = ee;
  this.useCallback = useCallback;
  this.callback = callback;
}

Context.prototype.validateFuncs = function(funcs) {
  validateFuncs(funcs, this.arglen, this.name);
};

function attachHandlers(ee, useCallback, callback) {
  if (typeof callback === 'function') {
    Object.keys(useCallback).forEach(evt => {
      ee.on(evt, callback);
      useCallback[evt] = true;
    });
  }
  ee.on('newListener', (evt, fn) => {
    if (!useCallback[evt]) {
      return;
    }
    if (fn === callback) {
      return;
    }
    if (useCallback.hasOwnProperty(evt)) {
      ee.removeListener(evt, callback);
      useCallback[evt] = false;
    }
  });
}

function ensureListeners(ee, useCallback) {
  let errs = [];

  Object.keys(useCallback).forEach(evt => {
    if (ee.listenerCount(evt) === 0) {
      errs.push(`no "${evt}" listener`);
    }
  });
  if (errs.length) {
    let e = new TypeError(`${ee.name}: required listeners not found`);
    e.details = errs;
    return e;
  }
  return null;
}

function removeAllListeners(ee, events) {
  events.forEach(evt => ee.removeAllListeners(evt));
}

module.exports = {
  Context: Context,
  attachHandlers: attachHandlers,
  ensureListeners: ensureListeners,
  validateArgs: validateArgs,
  validateFuncs: validateFuncs,
  removeAllListeners: removeAllListeners
};
