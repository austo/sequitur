/* global suite:true */
/* global test:true */
/* global beforeEach:true */

'use strict';

const parallel = require('../parallel'),
  assert = require('assert'),
  util = require('util'),
  domain = require('domain');

const testUtils = require('./testUtils'),
  empty = testUtils.empty;

const expected = {
  error: {
    output: [
      'inside step 1, called with []',
      'inside step 2, called with []',
      'step 2 throwing error "BOOM!"',
      'inside step 3, called with []',
      'inside step 4, called with []',
      'step 4 throwing error "BOOM!"',
      'inside step 5, called with []',
      'inside step 6, called with []',
      'step 6 throwing error "BOOM!"',
      'inside step 7, called with []',
      'inside step 8, called with []'
    ],
    eachVals: [
      'step 1, called with []',
      'step 3, called with []',
      'step 5, called with []',
      'step 7, called with []',
      'step 8, called with []',
      'stop is null'
    ],
    errs: ['BOOM!', 'BOOM!', 'BOOM!']
  },
  nominal: {
    output: [
      'inside step 1, called with []',
      'inside step 2, called with []',
      'inside step 3, called with []',
      'inside step 4, called with []',
      'inside step 5, called with []',
      'inside step 6, called with []',
      'inside step 7, called with []',
      'inside step 8, called with []',
    ],
    eachVals: [
      'step 1, called with []',
      'step 2, called with []',
      'step 3, called with []',
      'step 4, called with []',
      'step 5, called with []',
      'step 6, called with []',
      'step 7, called with []',
      'step 8, called with []',
      'stop is null'
    ]
  }
};

const output = [];

suite('parallel', function() {

  beforeEach(() => {
    empty(output);
  });

  test('should behave correctly with callback', done => {
    let eachVals = [];
    parallel(getFuncs(8), (err, stop, val) => {
      assert.ifError(err);
      eachVals.push(val);
      if (!stop) {
        eachVals.push('stop is null');
        assert.deepEqual(expected.nominal.output, output);
        assert.deepEqual(expected.nominal.eachVals, eachVals);
        done();
      }
    });
  });

  test('should behave correctly with events', done => {
    let eachVals = [],
      errs = [],
      n = 8,
      recv = 0;

    parallel(getFuncs(n, ord => ord !== n && ord % 2 === 0))
      .on('error', (err, stop) => {
        recv++;
        assert.ok(err);
        assert.equal('function', typeof stop);
        errs.push(err);
      })
      .on('each', (stop, val) => {
        recv++;
        eachVals.push(val);
        if (recv < n) {
          assert.equal('function', typeof stop);
        }
        else {
          assert.equal(null, stop);
          eachVals.push('stop is null');
        }
      })
      .on('done', function() {
        assert.equal(0, arguments.length);
        assert.equal(n, recv);
        assert.deepEqual(expected.error.eachVals, eachVals);
        assert.deepEqual(expected.error.errs, errs);
        assert.deepEqual(expected.error.output, output);
        done();
      });
  });

  test('should behave correctly with callback and "done" event', done => {
    let eachVals = [];
    parallel(getFuncs(8), (err, stop, val) => {
      assert.ifError(err);
      eachVals.push(val);
      if (!stop) {
        eachVals.push('stop is null');
      }
    }).on('done', () => {
      assert.deepEqual(expected.nominal.output, output);
      assert.deepEqual(expected.nominal.eachVals, eachVals);
      done();
    });
  });

  test('should behave correctly with callback and "error" event', done => {
    let n = 8,
      recv = 0,
      eachVals = [],
      errs = [];
    parallel(getFuncs(n, ord => ord !== n && ord % 2 === 0), (err, stop, val) => {
      assert.ifError(err);
      eachVals.push(val);
      if (!stop) {
        eachVals.push('stop is null');
        assert.deepEqual(expected.error.output, output);
        assert.deepEqual(expected.error.eachVals, eachVals);
        assert.deepEqual(expected.error.errs, errs);
        done();
      }
    }).on('error', (err, stop) => {
      recv++;
      assert.ok(err);
      assert.equal('function', typeof stop);
      errs.push(err);
    });
  });

  test('stop should detatch callbacks', done => {
    let eachVals = [],
      recv = 0;
    parallel(getFuncs(8, v => v > 2), (err, stop, val) => {
        ++recv;
        eachVals.push(val);
        if (recv > 1) {
          stop();
          process.nextTick(() => {
            assert.deepEqual([
              'step 1, called with []',
              'step 2, called with []'
            ], eachVals);
            done();
          });
        }
      })
      .on('done', () => assert(false))
      .on('error', err => assert.ifError(err));
  });

  test('should call done immediately when function array is empty', done => {
    parallel([], err => {
      assert.ifError(err);
      done();
    });
  });

  test('invalid function array arguments should throw TypeError', done => {
    const arrayMsg = 'Parallel: first argument must be an array';
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
      msg: 'Parallel: function at index 1 must take at least 1 argument'
    }, {
      val: [function(next) {
        next();
      }, 'foo'],
      msg: 'Parallel: non-function at index 1'
    }].forEach(arg => {
      assert.throws(() => parallel(arg.val), err => {
        return (err instanceof TypeError) && err.message === arg.msg;
      });
    });
    done();
  });

  test('no "each" event should emit error', done => {
    parallel([function(next) {
      process.nextTick(() => {
        console.log('calling next...');
        next();
      });
    }]).on('error', err => {
      assert.strictEqual(TypeError, err.constructor);
      assert.deepEqual(['no "each" listener'], err.details);
      done();
    });
  });

  suite('no error listener should throw error', function() {
    [{
      name: 'with "each" function',
      each: () => assert(false, 'should never be called'),
      details: ['no "error" listener']
    }, {
      name: 'without "each" function',
      details: [
        'no "each" listener',
        'no "error" listener'
      ]
    }].forEach(args => {
      test(args.name, done => {
        // NOTE: the `domain` module is deprecated, but it is impossible
        // to enforce the order of exceptions using `process.on('uncaughtException')`
        let d = domain.create();
        d.on('error', err => {
          let ee = err.domainEmitter;
          assert.equal('Parallel', ee.name);
          assert.strictEqual(TypeError, err.constructor);
          assert.deepEqual(args.details, err.details);
          assert.deepEqual(args.each, ee._events.each);
          done();
        });
        d.run(() => {
          let s = parallel([function(next) {
            process.nextTick(() => {
              console.log('calling next...');
              next();
            });
          }]);
          if (args.each) {
            s.on('each', args.each);
          }
        });
      });
    });
  });
});


function step(ordinal, arglen, errorPredicate) {
  let args = [];
  for (let i = 0; i < arglen + 1; i++) {
    args.push(`arg${i}`);
  }

  // NOTE: This ugliness is necessary to circumvent Sequitur's
  // function validation procecure, which requires all managed
  // functions to have at least as many arguments as the original
  // arguments array, plus an additional `next` param
  /* jshint ignore:start */
  const fnstr = `(function (${args.join()}) {
    let args = Array.prototype.slice.call(arguments);
    let next = args.pop();
    assert.equal('function', typeof next);
    let result = util.format('step %d, called with %j', ordinal, args);
    output.push('inside ' + result);
    if (errorPredicate && errorPredicate(ordinal)) {
      let err = 'BOOM!';
      output.push(util.format('step %d throwing error "%s"', ordinal, err));
      return next(err);
    }
    return next(null, result);
  })`;

  let fn = eval(fnstr);
  return fn;
  /* jshint ignore:end */
}

function getFuncs(n, _arglen, _errorPredicate) {
  let arglen = 0,
    errorPredicate = () => false;
  if (!isNaN(_arglen)) {
    arglen = +_arglen;
  }
  if (typeof _arglen === 'function') {
    errorPredicate = _arglen;
  }
  if (typeof _errorPredicate === 'function') {
    errorPredicate = _errorPredicate;
  }
  let funcs = [];
  for (let i = 0; i < n; i++) {
    funcs.push(step(i + 1, arglen, errorPredicate));
  }
  return funcs;
}
