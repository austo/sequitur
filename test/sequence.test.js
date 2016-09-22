/* global suite:true */
/* global test:true */
/* global beforeEach:true */

'use strict';

const seq = require('../'),
  assert = require('assert'),
  domain = require('domain');

const output = [];
const expectedOutput = [
  'step 0, value = 0',
  'BOOM!',
  'calling resume...',
  'step 1, value = 1',
  'step 2, value = 2',
  'step 3, value = 3',
  'BOOM!',
  'calling resume...',
  'step 4, value = 4',
  'step 5, value = 5',
  'step 6, value = 6',
  'BOOM!',
  'calling resume...',
  'step 7, value = 7',
  'final value = 7',
  'done'
];

suite('sequence', function() {

  beforeEach(() => {
    empty(output);
  });

  test('should behave correctly with callback', done => {
    seq(getFuncs(8),
      (err, resume) => {
        if (err) {
          output.push(err);
          if (resume) {
            output.push('calling resume...');
            return resume();
          }
          else {
            assert(false);
          }
        }
        output.push(`final value = ${resume}`);
        output.push('done');
        assert.deepEqual(expectedOutput, output);
        done();
      });
  });

  test('should behave correctly with events', done => {
    seq(getFuncs(8))
      .on('error', (err, resume) => {
        output.push(err);
        if (resume) {
          output.push('calling resume...');
          return resume();
        }
        assert(false);
      })
      .on('done', v => {
        output.push(`final value = ${v}`);
        output.push('done');
        assert.deepEqual(expectedOutput, output);
        done();
      });
  });

  test('should behave correctly with callback and "done" event', done => {
    seq(getFuncs(8), (err, resume) => {
        if (err) {
          output.push(err);
          if (resume) {
            output.push('calling resume...');
            return resume();
          }
          assert(false);
        }
        assert(false);
      })
      .on('done', v => {
        output.push(`final value = ${v}`);
        output.push('done');
        assert.deepEqual(expectedOutput, output);
        done();
      });
  });

  test('should behave correctly with callback and "error" event', done => {
    seq(getFuncs(8), (err, resume) => {
        assert(err === null);
        output.push(`final value = ${resume}`);
        output.push('done');
        assert.deepEqual(expectedOutput, output);
        done();
      })
      .on('error', (err, resume) => {
        output.push(err);
        if (resume) {
          output.push('calling resume...');
          return resume();
        }
        assert(false);
      });
  });

  test('progress should stop if resume is not called', done => {
    seq(getFuncs(8))
      .on('error', (err) => {
        output.push(err);
        process.nextTick(() => {
          assert.deepEqual(['step 0, value = 0', 'BOOM!'], output);
          done();
        });
      })
      .on('done', () => {
        assert(false);
      });
  });

  test('if only error is provided, previous args should be used when calling resume', done => {
    seq([
        step(0),
        step(1),
        function(v, next) {
          return next('WHAAHAAHAA!');
        },
        step(3)
      ])
      .on('error', (err, resume) => {
        output.push(err);
        if (resume) {
          output.push('calling resume...');
          return resume();
        }
        assert(false);
      })
      .on('done', v => {
        output.push(`final value = ${v}`);
        output.push('done');
        assert.deepEqual([
          'step 0, value = 0',
          'BOOM!',
          'calling resume...',
          'step 1, value = 1',
          'WHAAHAAHAA!',
          'calling resume...',
          'step 3, value = 2', // prev arg was 2
          'final value = 2',
          'done'
        ], output);
        done();
      });
  });

  test('should call done immediately when function array is empty', done => {
    seq([], err => {
      assert(err === null);
      done();
    });
  });

  test('invalid function array arguments should throw TypeError', done => {
    const arrayMsg = 'sequence: first argument must be an array';
    [{
      val: undefined,
      msg: arrayMsg
    }, {
      val: null,
      msg: arrayMsg
    }, {
      val: 1,
      msg: arrayMsg
    }, {
      val: true,
      msg: arrayMsg
    }, {
      val: false,
      msg: arrayMsg
    }, {
      val: 'dog',
      msg: arrayMsg
    }, {
      val: /^cat$/,
      msg: arrayMsg
    }, {
      val: {},
      msg: arrayMsg
    }, {
      val: [function(next) {
        next();
      }, function() {}],
      msg: 'sequence: function at index 1 must take at least 1 argument'
    }, {
      val: [function(next) {
        next();
      }, 'foo'],
      msg: 'sequence: non-function at index 1'
    }].forEach(arg => {
      assert.throws(() => seq(arg.val), err => {
        return (err instanceof TypeError) && err.message === arg.msg;
      });
    });
    done();
  });

  test('no "done" event should emit error', done => {
    seq([function(next) {
      process.nextTick(() => {
        console.log('calling next...');
        next();
      });
    }]).on('error', err => {
      assert.strictEqual(TypeError, err.constructor);
      assert.deepEqual(['no "done" listener'], err.details);
      done();
    });
  });

  suite('no error listener should throw error', function() {
    [{
      name: 'with "done" function',
      done: () => assert(false, 'should never be called'),
      details: ['no "error" listener']
    }, {
      name: 'without "done" function',
      details: [
        'no "error" listener',
        'no "done" listener'
      ]
    }].forEach(args => {
      test(args.name, done => {
        // NOTE: the `domain` module is deprecated, but it is impossible
        // to enforce the order of exceptions using `process.on('uncaughtException')`
        let d = domain.create();
        d.on('error', err => {
          let ee = err.domainEmitter;
          assert.equal('Sequence', ee.name);
          assert.strictEqual(TypeError, err.constructor);
          assert.deepEqual(args.details, err.details);
          assert.deepEqual(args.done, ee._events.done);
          done();
        });
        d.run(() => {
          let s = seq([function(next) {
            process.nextTick(() => {
              console.log('calling next...');
              next();
            });
          }]);
          if (args.done) {
            s.on('done', args.done);
          }
        });
      });
    });
  });

});

suite('empty', function() {

  test('should empty array and retain original reference', () => {
    let arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    empty(arr);
    assert.equal(0, arr.length);
    assert.strictEqual(arr, arr);
  });

});


function step(ordinal) {
  return function(_i, _next) {
    let i = -1,
      next;
    if (typeof _i === 'function') {
      next = _i;
    }
    else {
      next = _next;
      i = _i;
    }
    output.push(`step ${ordinal}, value = ${++i}`);
    let err = (i % 3 === 0) ? 'BOOM!' : null;
    next(err, i);
  };
}

function getFuncs(n) {
  let funcs = [];
  for (let i = 0; i < n; i++) {
    funcs.push(step(i));
  }
  return funcs;
}

function empty(arr) {
  for (let i = 0, n = arr.length; i < n; i++) {
    arr.pop();
  }
}
