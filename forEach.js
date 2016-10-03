'use strict';

let parallel = require('./parallel');

function forEach(arr, fn, callback) {
	// TODO: validation, blah, blah, blah

	let funcs = arr.map(args => {
		return function(next) {
			args.push(next);
			fn.apply(null, args);
		};
	});

	return parallel(funcs, callback);
}

module.exports = forEach;