"use strict";

/*

  ### Introduction
  The Factory module adds procedures, houses teams and appoints dispatchers.

*/



// ### Dependencies
var _            = require('lodash-node'),
    when         = require('when'),
    sequence     = require('when/sequence'),
    EventEmitter = require('events').EventEmitter,
    Broker       = require('./broker'),
    Dispatcher   = require('./dispatcher'),
    Monitor      = require('./monitor'),
    Procedure    = require('./procedure'),
    Tasks        = require('./tasks'),
    Team         = require('./team'),
    Worker       = require('./worker');



function Factory(name, cxnSetting, poolSettings) {

  this.name = name;
  this.prefix = "tc:" + name + ":";
  this.broker = new Broker(cxnSetting, poolSettings);
  this.teams = {};
  this.procedures = {};
  this.dispatcher = new Dispatcher(this);

  // Bound functions
  this.release = release.bind(this);
  this.shutdown = shutdown.bind(this);

}


Factory.prototype.__proto__ = EventEmitter.prototype;



// #### function execute
// Many functions need to either use a client given to them, or
// acquire one from the factory. The execute function handles these use-cases,
// and cleans up the connection if necessary.
Factory.prototype.execute = function(client, fn) {

  if ("function" == typeof client) fn = client, client = null;

  if (!client) {

    var self = this,
        deferred = when.defer();

    this.broker.acquire(function(err, c) {
      if (err) return deferred.reject(err);
      deferred.resolve(fn(c).ensure(function() { self.release(c); self = null; }));
    });

    return deferred.promise;

  } else
    return fn(client);

}


// #### function getClient
// Convenience function to access the client. Note that this may delay processing
// due to processNextTick calls within the promises. It is advised to use `execute`
// under most circumstances.
Factory.prototype.getClient = function() {
  var deferred = when.defer();

  this.broker.acquire(function(err, client) {
    if (err) return deferred.reject(err);
    return deferred.resolve(client);
  });

  return deferred.promise;
}


// #### function reservedConnectionCount
// Calculates the number of "reserved" connections for a factory. We require one
// PubSub connection for our dispatcher, a connection for each team, and at least
// one connection for tasks (arguably many more).
Factory.prototype.reservedConnectionCount = function() {
  return 2 + Object.keys(this.teams).length;
}


// ### HELPER FUNCTIONS

// #### function release
// Wraps the broker release function using promise-notation.
function release(client) {
  try {
    this.broker.release(client);
  } catch (err) {
    return when.reject(err);
  }

  return when.resolve();
}


// #### function shutdown
// Gracefully handles shutting down the factory. We begin by shutting down
// teams. The teams may quickly pass information to the dispatcher, which is
// subsequently shutdown. Each of these rely on the broker, which is shutdown last.
function shutdown(timeToDie) {

  var self = this, shutdownTeams, cleanup;

  shutdownTeams = function() {
    var teamShutdowns = _.map(self.teams, function(team) {
      return team.shutdown(timeToDie);
    });

    return when.all(teamShutdowns);
  }


  cleanup = function() {
    _.each(self.teams, function(team) { team.off(); });

    // Clean up memory
    self.teams = null;
    self.dispatcher = null;
    self.broker = null;
    self = null;
  }

  return sequence([
    this.dispatcher.halt,
    shutdownTeams,
    this.dispatcher.shutdown,
    this.broker.shutdown,
    cleanup
  ]);

}


// #### function getNextId
// Provides the next available id for a particular category
// Sample categories might include team numbers or task numbers.
Factory.prototype.getNextId = function(name) {

  var key = this.prefix + 'counters';

  return this.execute(function(c) {
    return c.hashIncrement(key, name, 1);
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
// Retrieves status information about a task: progress, completion, etc.
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
Factory.prototype.addTeam = function(name, options, autostart) {

  // Ensure that all connections are not blocked.
  if (this.reservedConnectionCount() >= (this.broker.poolSettings.max || Infinity))
    throw new Error("No connections remain. Increase max connections to add team.");

  autostart = autostart || true;

  if ('number' == typeof options) {
    options = { maxWorkers : options };
  }

  options = options || {};

  var prefix = this.prefix + 'teams:' + name;

  // Create team object
  this.teams[name] = new Team(this, name, this.procedures[name], options);
  this.teams[name].on('available', this.dispatcher.delegate);

  // Auto-start is added here in order to prevent race conditions
  if (autostart) this.teams[name].start();

  return this.teams[name];

}



// Expose the factory
exports = module.exports = Factory;
