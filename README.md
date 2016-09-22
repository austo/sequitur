[![Build Status](https://api.travis-ci.org/austo/sequitur.svg?branch=master)](https://travis-ci.org/austo/sequitur)

  Sequitur is a simple flow control library for modern Node.js (^4.0.0) which offers sequential and parallel execution and resume-on-error functionality.

```
npm install sequitur
```

Example (see [tests](https://github.com/austo/sequitur/blob/master/test/sequence.test.js) for more):

```javascript
use 'strict';

const seq = require('sequitur');

seq([
    step,
    step,
    step,
    step
  ])
  .on('error', (err, resume) => {
    if (err === 'recoverable' && resume) {
      console.log('caught recoverable error, resuming execution');
      return resume();
    }
    console.error('finished with error', err);
  })
  .on('done', v => {
    console.log(`final value = ${v}`);
    console.log('done');
  });

function step(_i, _next) {
  let i = -1,
    next;
  if (typeof _i === 'function') {
    next = _i;
  }
  else {
    next = _next;
    i = _i;
  }
  console.log(`value = ${++i}`);
  if (i > 0) {
    if (i % 2 === 0) {
      // If additional arguments are passed after the error value,
      // they will provided to the next function in the chain if `resume` is called.
      // Passing only the error causes `resume` to use the previous arguments.
      return next('recoverable');
    }
    if (i % 3 === 0) {
      return next(new RangeError('Important!!'));
    }
  }
  next(null, i);
}
```