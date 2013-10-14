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

*/



// ### Dependencies
var EventEmitter = require('events').EventEmitter,
    sequence     = require('when/sequence'),
    parallel     = require('when/parallel'),
    Task         = require('./task'),
    Worker       = require('./worker');


function Team(factory, name, procedure, options, autostart) {

  // Set up object variables
  this.factory = factory;
  this.prefix = factory.prefix + 'teams:' + name;
  this.name = name;
  this.procedure = procedure;
  this.availability = options.maxWorkers || 1;
  this.workers = {};

  // Set up local variables
  var team      = this,
      prefix    = this.prefix
      autostart = autostart || true;

   factory.client()
   .then(function(c) {
     return c.hashIncrement(prefix + 'counters', 'team', 1)
             .then(function(id) {
               team.id = id;
               team.key = prefix + ":" + id;
               return parallel([
                 function() { return c.setAdd(prefix, [team.id]); },
                 function() { return c.hashMultiSet(prefix + ':' + team.id, team.serialize()); }
               ]);
             });
   })
   .then(function() {
     team.heartbeat();
     if (autostart) team.start();
   });

   return team;

}


Team.prototype.__proto__ = EventEmitter.prototype;


// #### function serialize
// Converts a Team object to vital information for storage
Team.prototype.serialize = function() {
  var serialized = {
    name         : this.name,
    availability : this.availability
  };

  return serialized;
}


// #### function reportAvailable
// Makes a team announce that it is available for work.
Team.prototype.start = Team.prototype.reportAvailable = function() {
  while (this.availability > 0) {
    this.emit('available', this);
    this.availability--;
  }
}


// #### function delegate
// Creates a worker to execute a job.
Team.prototype.delegate = function(id) {

  var self = this,
      worker = new Worker(this.factory, id, this.procedure);

  function cleanup() {
    delete self.workers[id];
    self.availability++;
    self.reportAvailable();
    worker = null;
    self = null;
  }

  worker.on('complete', function() {
    cleanup();
  });

  worker.work().ensure(cleanup);
}


// #### function heartbeat
// Team "checks in" in order to prevent its own cleanup.
// Roadmap: Should periodically check on its tasks and "reset" availability.
Team.prototype.heartbeat = function() {
  var secs = 15 * 60,
      ms = 5 * 60 * 1000,
      factory = this.factory;

  setInterval(function() {
    factory.acquire().then(function(client) {
      client.expire(self.key, secs);
    });
  }, ms);
}



exports = module.exports = Team;
