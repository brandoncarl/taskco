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
      self = this,
      procedure = this.procedure,
      promise;

  promise = Tasks.get(this.factory, this.id)
                 .then(function(t) {
                    var deferred = when.defer(),
                        handlers = Object.keys(procedure.handlers);

                    task = t;
                    task.activate();

                    // Set up listeners (on binds globally/publishes, bindLocal does not)
                    for (var i in handlers) {
                      var fxn = task.broadcasts(handlers[i]) ? 'on' : 'bindLocal';
                      task[fxn](handlers[i], procedure.handlers[handlers[i]].bind(task));
                    }

                    // Worker is responsible for updating task progress, completion, etc.
                    procedure.work(task, function(err) {
                      if (err) return deferred.reject(err);
                      return deferred.resolve();
                    });

                    return deferred.promise;
                 })
                 .then(function() {
                    // Handle successful completion state.
                    return task.success();
                 });


  // Handle failure state.
  promise.otherwise(function(err) {
    task.failure();
    return when.reject(err);
  });

  // Clean up afterwards.
  promise.ensure(function() {
    self.emit('end', self.id);

    if (task) {
      task.removeAllListeners();
      task = null;
    }

    self = null;
    procedure = null;
  });

  return promise;

}


exports = module.exports = Worker;
