"use strict";

/*

  ### Introduction
  The Company module sets up the default factory, creates additional factories, and
  provides convenience accessors to the factories. The instance is shared across all
  modules in a single process.

*/

(function() {

  // ### Dependencies
  var Factory = require('./factory.js');


  var Company = {
    // Set up default queue
    factories : {}
  }


  // ### Functions to attach for default factory
  var fxns = [
    'getNextId',
    'addProcedure',
    'getTask',
    'getTaskId',
    'reserveTaskId',
    'createTask',
    'lacksTask',
    'saveTask',
    'quickEntry',
    'addTeam',
  ];


  // #### function setup
  // Adds the default factory to the factories hash.
  Company.setup = function(cxnSettings, poolSettings, done) {
    var def = this.addFactory("def", cxnSettings, poolSettings, done);

    for (var i = 0; i < fxns.length; ++i)
      this[fxns[i]] = def[fxns[i]].bind(def);

    return this;
  }


  // #### function getFactory
  // Retrieves a named factory, or the default when not provided.
  Company.getFactory = function(name) {
    name = name || "def";
    return this.factories[name];
  }


  // #### function addFactory
  // Adds a factory to the factories hash.
  Company.addFactory = function(name, cxnSettings, poolSettings, done) {
    if ("object" == typeof name) {
      done = poolSettings;
      poolSettings = cxnSettings;
      cxnSettings = name;
      name = "def";
    }

    if ("undefined" == typeof this.factories[name]) {
      this.factories[name] = new Factory(name, cxnSettings, poolSettings, done);
      return this.factories[name]
    } else
      return new Error("Factory " + name + " already exists.");
  }


  module.exports = Company;

})();
