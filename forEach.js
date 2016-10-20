'use strict';

let parallel = require('./parallel');

function forEach(arr, fn, callback) {
  // TODO: validation story...

  let funcs = arr.map(a => {
    let args = Array.isArray(a) ? a : [a];
    return function(next) {
      args.push(next);
      fn.apply(null, args);
    };
  });

  return parallel(funcs, callback);
}

module.exports = forEach;
