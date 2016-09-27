'use strict';

function empty(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    arr.splice(i, 1);
  }
}

module.exports = {
  empty: empty
};
