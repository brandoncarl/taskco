"use strict";

/*

  ### Introduction
  The Company module sets up the default factory, creates additional factories, and
  provides convenience accessors to the factories. The instance is shared across all
  modules in a single process.

*/

(function() {

  // ### Dependencies
  var when    = require('when'),
      _       = require('lodash-node'),
      Factory = require('./factory.js');


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
    'getTaskStatus',
    'reserveTaskId',
    'createTask',
    'lacksTask',
    'saveTask',
    'quickEntry',
    'addTeam',
  ];


  // #### function setup
  // Adds the default factory to the factories hash.
  Company.setup = function(cxnSettings, poolSettings) {
    var def = this.addFactory("def", cxnSettings, poolSettings);

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
  Company.addFactory = function(name, cxnSettings, poolSettings) {

    if ("object" == typeof name) {
      poolSettings = cxnSettings;
      cxnSettings = name;
      name = "def";
    }

    if ("undefined" == typeof this.factories[name]) {
      this.factories[name] = new Factory(name, cxnSettings, poolSettings);
      return this.factories[name]
    } else
      return new Error("Factory " + name + " already exists.");
  }


  // #### function shutdown
  // Gracefully shuts down all of a company's factories
  Company.shutdown = function(timeToLive) {
    return when.map(_.values(Company.factories), function(factory) {
      return factory.shutdown(timeToLive);
    });
  }


  module.exports = Company;

})();
