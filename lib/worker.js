"use strict";

/*

  ### Introduction
  The Worker module is used to set up traditional task templating.

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


Worker.prototype.work = function(done) {

  var task = null,
      procedure = this.procedure;

  var promise = Tasks.get(this.factory, this.id)

  .then(function(t) {

    var deferred = when.defer(),
        handlers = Object.keys(procedure.handlers);

    task = t;

    // Set up listeners
    for (var i in handlers)
      task.on(handlers[i], procedure.handlers[handlers[i]].bind(task));

    // Worker is responsible for updating task progress, completion, etc.
    procedure.work(task, function(err) {
      if (err) return deferred.reject(err);
      return deferred.resolve();
    });

    return deferred.promise;
  })

  promise.otherwise(function(err) {
    // Log failure, etc. here
    console.log(e);
    return when.reject(err);
  });

  promise.ensure(function() {
    if (task) {
      task.removeAllListeners();
      task = null;
    }
  });

  return promise;

}


exports = module.exports = Worker;
