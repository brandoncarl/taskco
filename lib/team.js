
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
    Worker = require('./worker');


function Team(factory, name, procedure, maxWorkers) {

  var self = this;

  this.prefix = factory.prefix;
  this.name = name;
  this.procedure = procedure;
  this.availability = maxWorkers || 1;

  factory.onboard({ name : name }, function(err, id) {
    // !!! ERROR HANDLING HERE
    self.id = id;
    self = null;
  });

}

Team.prototype.__proto__ = EventEmitter.prototype;


// #### function process
// Processes a job.
Team.prototype.process = function(err, name, id) {

  var worker = new Task(this.procedures[name], id)
  // worker.on()

  Task.start();

}


// #### function announce
// Makes a team announce that it is available for work.
Team.prototype.announce = function() {

  while (this.availability > 0) {
    this.emit('available', this, type);
    this.availability[type]--;
  }

}


exports = module.exports = Team;
