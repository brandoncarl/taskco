"use strict";

/*

  ### Introduction
  The Utils module provides convenience functions for use across the module.

*/


var utils = module.exports = {};


// #### function serialize
// Ensures that object values are not objects.
utils.serialize = function(input) {
  if ("object" != typeof input) return input;

  var output;

  if (Array.isArray(input)) {
    output = [];
    for (var i = 0; i < input.length; ++i) {
      if ("object" == typeof input[i])
        output[i] = JSON.stringify(input[i])
      else
        output[i] = input[i];
    }
  } else {
    output = {};
    for (var key in input) {
      if ("object" == typeof input[key])
        output[key] = JSON.stringify(input[key])
      else
        output[key] = input[key];
    }
  }

  return output;
}

