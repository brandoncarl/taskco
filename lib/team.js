"use strict";

/*

  ### Introduction
  The Team module reports availability to its manager and receives tasks. A team has
  a single procedure that it knows how to follow. Teams can exist across processes.

  Emits:
    'available'

  Responds to:
    'process'
    'status'

*/



// ### Dependencies
var EventEmitter = require('events').EventEmitter,
    Task = require('./task'),
    Worker = require('./worker');


function Team(factory, name, procedure, options) {

  var self = this;

  this.factory = factory;
  this.prefix = factory.prefix;
  this.name = name;
  this.procedure = procedure;
  this.availability = options.maxWorkers || 1;
  this.workers = {};

}

Team.prototype.__proto__ = EventEmitter.prototype;


Team.prototype.serialize = function() {

  // THIS SHOULD EVENTUALLY HAVE FACTORY ID, FULL OPTIONS
  var serialized = {
    name         : this.name,
    availability : this.availability
  };

  return serialized;
}


// #### function process
// Processes a job.
Team.prototype.process = function(id) {

  var self = this,
      worker = new Worker(this.factory, id, this.procedure);

  function cleanup() {
    worker = null;
    delete self.workers[id];
    self.availability++;
    self.checkIn();
  }

  worker.on('complete', function() {
    cleanup();
  });

  worker.work().ensure(cleanup);
}


// #### function checkIn
// Makes a team announce that it is available for work.
Team.prototype.start = Team.prototype.checkIn = function() {

  while (this.availability > 0) {
    this.emit('available', this);
    this.availability--;
  }

}


exports = module.exports = Team;
