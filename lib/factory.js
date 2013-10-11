"use strict";

/*

  ### Introduction
  The Factory module adds procedures, houses teams and appoints managers.

*/



// ### Dependencies
var when         = require('when'),
    EventEmitter = require('events').EventEmitter,
    Broker       = require('./broker'),
    Manager      = require('./manager'),
    Monitor      = require('./monitor'),
    Procedure    = require('./procedure'),
    proxy        = require('./proxy'),
    Tasks        = require('./tasks'),
    Team         = require('./team'),
    Worker       = require('./worker');


function noop() {}


function Factory(name, settings, auth) {

  var self = this;

  this.name = name;
  this.prefix = "tc:" + name + ":";
  this.broker = new Broker(settings, auth);
  this.teams = {};
  this.procedures = {};

  this.broker.connect(function(client) {
    self.manager = new Manager(self);
    self.client = client;
  });

}


Factory.prototype.__proto__ = EventEmitter.prototype;


// ### HELPER FUNCTIONS

// #### function getNextId
// Provides the next available id for a particular category
// Sample categories might include team numbers or job numbers.
Factory.prototype.getNextId = function(name) {
  return proxy.run(this.client, 'hincrby', this.prefix + 'counters', name, 1);
}



// ### PROCEDURE FUNCTIONS

// #### function addProcedure
// Accepts name (string), template, and optional settings. A template should be
// an object with a "work" function. It cannot used reserved keywords listed in Procedure
// module.
Factory.prototype.addProcedure = function(name, template, settings) {

  // If a function is provided as a template, convert it to a proper object.
  if ("function" == typeof template && 0 == Object.keys(template).length)
    template = { work : template };

  this.procedures[name] = new Procedure(this.prefix, name, template, settings);
  return this;
}



// ### TASK FUNCTIONS

// #### function getTask
// Gets a task based on its id.
Factory.prototype.getTask = function(id) {
  return Tasks.get(this, id);
}


// #### function getTaskId
// Finds a task's id based on its type/uid.
Factory.prototype.getTaskId = function(type, uid) {
  return Monitor.findId(this, type, uid);
}


// #### function getTaskStatus
// Retrieves status information about a job: progress, completion, etc.
Factory.prototype.getTaskStatus = function(id) {
  return Tasks.getStatus(this, id)
}


// #### function reserveTaskId
// Finds a task's id based on its type/uid.
Factory.prototype.reserveTaskId = function(type, done) {
  return this.getNextId(type);
}


// #### function lacksTask
// Ensures task does not exist based on type and uid
Factory.prototype.lacksTask = function(type, uid) {
  return Monitor.findTask(factory, type, uid);
}


// #### function createTask
// Assigns a task an id and returns a promise with said task. Predecessory to saveTask.
Factory.prototype.createTask = function(type, data, options) {
  return Tasks.create(this, type, data, options || {});
}


// #### function saveTask
// Saves the task to the store.
Factory.prototype.saveTask = function(task) {
  return task.save();
}


// #### function quickEntry
// Creates and saves a task. Does not return the task object.
Factory.prototype.quickEntry = function(type, data, options) {
  var self = this,
      deferred = when.defer();

  this.createTask(type, data, options)
      .then(function(task) {
        deferred.resolve(task.id);
        task.save();
      });

  return deferred.promise;
}



// ### TEAM FUNCTIONS

// #### function addTeam
// Accepts a name (string) and array of procedure names [string]
// Perhaps start should take a number eventually (seconds until start)
Factory.prototype.addTeam = function(name, options, delay) {

  if ('number' == typeof options) {
    options = { maxWorkers : options };
  }

  options = options || {};

  var done = done || noop,
      prefix = this.prefix + 'teams:' + name,
      client = this.client;

  // Create team object
  this.teams[name] = new Team(this, name, this.procedures[name], options);
  this.teams[name].on('available', this.manager.delegate.bind(this.manager));

  return this.teams[name];

}



// Expose the factory
exports = module.exports = Factory;
