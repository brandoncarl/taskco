"use strict";

/*

  ### Introduction
  The Procedure module is used to set up template for a task.

*/


var _  = require('lodash-node');


// ### Dependencies

function Procedure(prefix, name, template, settings) {

  // Ensure that work exists.
  if ("undefined" == typeof template.work)
    return new Error("Work function must be provided.");
  else
    this.work = template.work;

  // Copy template objects/functions to procedure. Exclude reserved keywords.
  var reserved = ['prefix', 'name', 'defaults', 'on'];

  this.handlers = {};
  for (var key in template) {
    if (template.hasOwnProperty(key)) {
      if (reserved.indexOf(key) > -1)
        return new Error("Reserved key " + key, + " cannot be used in template.");
      if (key != 'work') this.handlers[key] = template[key];
    }
  }

  this.prefix = prefix;
  this.name = name;
  this.defaults = settings || {};

}



exports = module.exports = Procedure;
