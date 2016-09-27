/* global suite:true */
/* global test:true */

'use strict';

const assert = require('assert'),
  testUtils = require('./testUtils');

suite('testUtils', function() {

  test('empty should delete all elements from array and retain original reference', () => {
    let arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    testUtils.empty(arr);
    assert.equal(0, arr.length);
    assert.strictEqual(arr, arr);
  });

});
