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

  var task,
      procedure = this.procedure;

  var promise = Tasks.get(this.factory, this.id)

  .then(function(task) {
    var deferred = when.defer();

    // Worker is responsible for updating task progress, completion, etc.
    procedure.work(task, function(err) {
      if (err) return deferred.reject(err);
      return deferred.resolve();
    });

    return deferred.promise;
  })

  promise.otherwise(function(e) { console.log(e) });
  promise.ensure(function() { task = null; });
  return promise;

}


exports = module.exports = Worker;
