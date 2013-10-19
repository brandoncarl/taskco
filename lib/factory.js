"use strict";

/*

  ### Introduction
  The Factory module adds procedures, houses teams and appoints dispatchers.

*/



// ### Dependencies
var when         = require('when'),
    EventEmitter = require('events').EventEmitter,
    Broker       = require('./broker'),
    Dispatcher   = require('./dispatcher'),
    Monitor      = require('./monitor'),
    Procedure    = require('./procedure'),
    Tasks        = require('./tasks'),
    Team         = require('./team'),
    Worker       = require('./worker');




function release(client) {
  try {
    this.broker.release(client);
  } catch (err) {
    return when.reject(err);
  }

  return when.resolve();
}



function Factory(name, cxnSetting, poolSettings) {

  this.name = name;
  this.prefix = "tc:" + name + ":";
  this.broker = new Broker(cxnSetting, poolSettings);
  this.teams = {};
  this.procedures = {};
  this.dispatcher = new Dispatcher(this);

  // Bound functions
  this.release = release.bind(this);

}


Factory.prototype.__proto__ = EventEmitter.prototype;


// #### function getClient
// Convenience function to access the client.
Factory.prototype.getClient = function() {
  return this.broker.acquire();
}




// #### function execute
// Many functions need to either use a client given to them, or
// acquire one from the factory. The execute function handles these use-cases,
// and cleans up the connection if necessary.
Factory.prototype.execute = function(client, fn) {

  var self = this;

  if ("undefined" == typeof client)
    return self.getClient().then(function(c) {
      return fn(c).ensure(function() { self.release(c); self = null; });
    });
  else
    return fn(client);

}



// ### HELPER FUNCTIONS

// #### function getNextId
// Provides the next available id for a particular category
// Sample categories might include team numbers or job numbers.
Factory.prototype.getNextId = function(name) {

  var self = this,
      key = self.prefix + 'counters';

  return this.getClient().then(function(c) {
    return c.hashIncrement(key, name, 1).ensure(function() { self.release(c); self = null; });
  });

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

  this.procedures[name] = new Procedure(this, name, template, settings);
  return this.procedures[name];

}



// ### TASK FUNCTIONS

// #### function createTask
// Assigns a task an id and returns a promise with said task. Predecessory to saveTask.
Factory.prototype.createTask = function(type, data, options) {
  return Tasks.create(this, type, data, options || {});
}


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
Factory.prototype.reserveTaskId = function(type) {
  return this.getNextId(type);
}


// #### function saveTask
// Saves the task to the store.
Factory.prototype.saveTask = function(task) {
  return task.save();
}


// #### function quickEntry
// Creates and saves a task. Does not return the task object.
// Accordingly, it does not notify the creator of creation errors.
Factory.prototype.quickEntry = function(type, data, options) {

  var task,
      deferred = when.defer();

  this.createTask(type, data, options)
      .then(function(t) {
        task = t;
        return task.save();
      })
      .then(function() {
        deferred.resolve(task);
      })
      .otherwise(function(err) {
        deferred.reject(err);
      })
      .ensure(function() {
        task = null;
      });

  return deferred.promise;
}


// #### function lacksTask
// Ensures task does not exist based on type and uid. If task exists,
// rejection includes taskId. If error, rejection include error.
Factory.prototype.lacksTask = function(type, uid, client) {

  var deferred = when.defer();

  Monitor.findExists(this, type, uid, client).then(function(id) {
    deferred.reject(id);
  }, function(err) {
    err ? deferred.reject(err) : deferred.resolve();
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

  var prefix = this.prefix + 'teams:' + name;

  // Create team object
  this.teams[name] = new Team(this, name, this.procedures[name], options);
  this.teams[name].on('available', this.dispatcher.delegate);

  return this.teams[name];

}



// Expose the factory
exports = module.exports = Factory;
