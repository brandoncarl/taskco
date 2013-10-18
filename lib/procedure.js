"use strict";

/*

  ### Introduction
  The Procedure module is used to set up template for a task.

*/


// ### Dependencies


// Options can include priority, delay, maxAttempts, removeAfter.
function Procedure(factory, name, template, options) {

  this.factory = factory;

  // Ensure that work exists.
  if ("undefined" == typeof template.work)
    throw new Error("Work function must be provided.");
  else
    this.work = template.work;

  // Copy template objects/functions to procedure. Exclude reserved keywords.
  var reserved = ['prefix', 'name', 'defaults', 'on'];

  this.handlers = {};
  for (var key in template) {
    if (template.hasOwnProperty(key)) {
      if (reserved.indexOf(key) > -1)
        throw new Error("Reserved key " + key + " cannot be used in template.");
      if (key != 'work') this.handlers[key] = template[key];
    }
  }

  this.prefix = factory.prefix;
  this.name = name;
  this.defaults = options || {};

}


// #### function andTeam
// Helper function to create a team based off of current procedure.
// Used while chaining: e.g. factory.addProcedure().andTeam()
Procedure.prototype.andTeam = function(options) {
  return this.factory.addTeam(this.name, options);
};



exports = module.exports = Procedure;
