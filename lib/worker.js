"use strict";

/*

  ### Introduction
  The Worker module is responsible for executing tasks, handling failures,
  distributing task events, and cleaning up afterwards.

*/



// ### Dependencies

var when = require('when'),
    EventEmitter = require('events').EventEmitter,
    Tasks = require('./tasks');


function Worker(factory, id, procedure) {
  this.factory = factory;
  this.id = id;
  this.procedure = procedure;
}

Worker.prototype.__proto__ = EventEmitter.prototype;


// #### function work
// Executes the procedure code for a task.
Worker.prototype.work = function() {

  var task = null,
      procedure = this.procedure,
      promise;

  promise = Tasks.get(this.factory, this.id)
                 .then(function(t) {
                    var deferred = when.defer(),
                        handlers = Object.keys(procedure.handlers);

                    task = t;
                    task.activate();

                    // Set up listeners
                    for (var i in handlers)
                      task.on(handlers[i], procedure.handlers[handlers[i]].bind(task));

                    // Set up progress handler
                    task.on('progress', task.progress);

                    // Worker is responsible for updating task progress, completion, etc.
                    procedure.work(task, function(err) {
                      if (err) return deferred.reject(err);
                      return deferred.resolve();
                    });

                    return deferred.promise;
                 })
                 .then(function() {
                    // Handle successful completion state.
                    return task.complete();
                 });


  // Handle failure state.
  promise.otherwise(function(err) {
    // Log failure, etc. here
    // If attempts remain, put back into type and waiting

    // Otherwise, register as failure
    task.fail();
    return when.reject(err);
  });

  // Clean up afterwards.
  promise.ensure(function() {
    if (task) {
      task.removeAllListeners();
      task = null;
    }

    procedure = null;
  });

  return promise;

}


exports = module.exports = Worker;
