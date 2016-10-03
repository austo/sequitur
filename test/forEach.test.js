/* global suite:true */
/* global test:true */
/* global beforeEach:true */

'use strict';

const forEach = require('../forEach'),
  assert = require('assert');

suite('forEach', function() {

  test('should basically do the right thing', done => {
    let args = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9]
    ];
    let i = 0;
    forEach(args, function(v0, v1, v2, next) {
      assert.strictEqual(4, arguments.length);
      let desiredArgs = args[i];
      assert.strictEqual(desiredArgs[0], v0);
      assert.strictEqual(desiredArgs[1], v1);
      assert.strictEqual(desiredArgs[2], v2);
      next();
    }, function(err, stop) {
      if (++i === args.length) {
        assert.ifError(stop);
        return done();
      }
      assert.ok(stop);
    });
  });
  
});
