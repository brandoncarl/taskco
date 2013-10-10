"use strict";

/*

  ### Introduction
  The Procedure module is used to set up template for a task.

*/


var _  = require('lodash-node');


// ### Dependencies

function Procedure(prefix, name, template, settings) {


  // Copy template objects/functions to procedure. Exclude reserved keywords.
  var reserved = ['prefix', 'name', 'defaults', 'on'];

  for (var key in template) {
    if (template.hasOwnProperty(key)) {
      if (reserved.indexOf(key) > -1)
        return new Error("Reserved key " + key, + " cannot be used in template.");
      this[key] = template[key];
    }
  }

  // Ensure that work exists.
  if ("undefined" == typeof this.work)
    return new Error("Work function must be provided.");

  this.prefix = prefix;
  this.name = name;
  this.defaults = settings || {};

}



exports = module.exports = Procedure;
