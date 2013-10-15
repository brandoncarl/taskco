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


function noop() {}



function release(client) {
  try {
    this.broker.release(client);
  } catch (err) {
    return when.reject(err);
  }

  return when.resolve();
}



function Factory(name, settings, auth) {

  this.name = name;
  this.prefix = "tc:" + name + ":";
  this.broker = new Broker(settings, auth);
  this.teams = {};
  this.procedures = {};

  this.dispatcher = new Dispatcher(this);
  // this.broker.connect();
  // function(client) {
  //   self.manager = new Manager(self);
  //   self.client = client;
  // });

  this.release = release.bind(this);

}


Factory.prototype.__proto__ = EventEmitter.prototype;


// #### function client
// Convenience function to access the client.
Factory.prototype.client = function() {
  return this.broker.acquire();
}

// #### function run
// Convenience function to run a single command. Should not be used
// when there are multiple commands to run.
Factory.prototype.run = function() {

  var p,
      client,
      args = Array.prototype.slice.call(arguments),
      fxn = args.shift(),
      broker = this.broker;

  p = broker.acquire().then(function(c) {
    client = c;
    return client[fxn].apply(client, args)
  })

  p.ensure(function() {
    broker.release(client);
    args = null;
    broker = null;
    client = null;
  });

  return p;
}


// ### HELPER FUNCTIONS

// #### function getNextId
// Provides the next available id for a particular category
// Sample categories might include team numbers or job numbers.
Factory.prototype.getNextId = function(name) {
  return this.run('hashIncrement', this.prefix + 'counters', name, 1);
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
Factory.prototype.lacksTask = function(type, uid) {
  var deferred = when.defer();

  Monitor.findExists(this, type, uid).then(function(id) {
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
  this.teams[name].on('available', this.dispatcher.delegate.bind(this.dispatcher));

  return this.teams[name];

}



// Expose the factory
exports = module.exports = Factory;
