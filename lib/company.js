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
  Company.setup = function(settings, auth, done) {

    var def = this.addFactory("def", settings, auth, done);

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
  Company.addFactory = function(name, settings, auth, done) {

    if ("undefined" == typeof this.factories[name])
      this.factories[name] = new Factory(name, settings, auth, done);

    return this.factories[name]

  }


  module.exports = Company;

})();
