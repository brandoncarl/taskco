"use strict";

/*

  ### Introduction
  The Team module reports availability to its manager and receives tasks. A team has
  a single procedure that it knows how to follow. Teams can exist across processes.

  Emits:
    'available'

  Responds to:
    'process'
    'status' (eventually)

  ### Status
  [√] Incorporates Promises
  [ ] Has logging
  [ ] Has documentation
  [√] Reports exceptions
  [√] Has unit tests

*/



// ### Dependencies

var _            = require('lodash-node'),
    when         = require('when'),
    EventEmitter = require('events').EventEmitter,
    sequence     = require('when/sequence'),
    parallel     = require('when/parallel'),
    Task         = require('./task'),
    Worker       = require('./worker');


// Autostart triggers for addTeam
function Team(factory, name, procedure, options) {

  // Set up object variables
  this.factory = factory;
  this.prefix = factory.prefix + 'teams:' + name;
  this.name = name;
  this.procedure = procedure;
  this.availability = options.maxWorkers || 1;
  this.workers = {};

  // Set up local variables
  var team      = this,
      prefix    = this.prefix;

  factory.execute(function(c) {

    return c.hashIncrement(factory.prefix + 'counters', 'team', 1).then(function(id) {

      team.id = id;
      team.key = prefix + ":" + id;

      return when.resolve();

      // !!! Eventually this code should store teams so that tasks can be routed appropriately.

      // return parallel([
      //   function() { return c.setAdd(prefix, [team.id]); },
      //   function() { return c.hashMultiSet(prefix + ':' + team.id, team.serialize()); }
      // ]);

    });

  })

  // Teams starts "checking in" (so as not to expire)
  .then(function() {
    team.heartbeat();
  })

  // Error logging must occur here given that we prematurely return the team object
  .otherwise(function(err) {
    console.log(err);
  });

  // Bind functions
  this.shutdown = shutdown.bind(this);

  return team;

}


Team.prototype.__proto__ = EventEmitter.prototype;


// #### function shutdown - asynchronous
// Gracefully shuts down a team - stores worker tasks to purgatory in case of
// failure and then politely waits for each worker to finish. Tasks are added via a sorted set,
// where the score is set to a timestamp based off the time to die (in seconds).
function shutdown(timeToLive) {

  var deferred  = when.defer(),
      size      = _.size(this.workers),
      done      = _.after(size, function() { deferred.resolve() });

  // If there are workers active, prepare them for shutting down
  if (size) {

    if ("undefined" == typeof timeToLive) timeToLive = 10;

    var key       = this.factory.prefix + "purgatory",
        tasks     = [],
        type      = this.name,
        startTime = Date.now() + 1000 * timeToLive;

    // Prepares sorted set array [member, score...] and listens for task completion
    _.each(this.workers, function(worker) {
      tasks.push(startTime);
      tasks.push({ id : worker.id, type : type, priority : 30 });
      worker.once('end', done);
    });

    this.factory.execute(function(c) {
      return c.sortedAdd(key, tasks);
    });

  } else done();

  // Stop the heartbeat
  clearInterval(this.pulse);
  return deferred.promise;

}


// #### function serialize - synchronous
// Converts a Team object to vital information for storage. Returned serialized object.
Team.prototype.serialize = function() {
  var serialized = {
    name         : this.name,
    availability : this.availability
  };

  return serialized;
}


// #### function reportAvailable - synchronous
// Makes a team announce that it is available for work.
Team.prototype.start = Team.prototype.reportAvailable = function() {
  while (this.availability > 0) {
    this.emit('available', this);
    this.availability--;
  }
}


// #### function delegate - synchronous
// Creates a worker to execute a task. Returns nothing.
Team.prototype.delegate = function(id) {

  var worker = new Worker(this.factory, id, this.procedure),
      terminate = this.terminate.bind(this);

  this.workers[id] = worker;

  worker.on('end', terminate);
  worker.work();

}


// #### function terminate
// Releases a worker from the team's jurisdiction
Team.prototype.terminate = function(id) {

  if (!!this.workers[id]) {
    this.workers[id].removeAllListeners();
    delete this.workers[id];
  }

  // Increase availability
  this.availability++;
  this.reportAvailable();

}


// #### function heartbeat - recurring
// Team "checks in" in order to prevent its own cleanup. Stores "pulse" variable
// for possible shutdown. Roadmap: Should periodically check on its tasks and "reset"
// availability.
Team.prototype.heartbeat = function() {

  var key = this.key,
      secs = 15 * 60,
      ms = 5 * 60 * 1000,
      factory = this.factory;

  this.pulse = setInterval(function() {
    factory.execute(function(c) { return c.expire(key, secs); });
  }, ms);

}



exports = module.exports = Team;
