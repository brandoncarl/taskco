"use strict";

/*

  ### Introduction
  The Tasks module is used to set up traditional task templating.

*/



// ### Dependencies

var when = require('when'),
    Task = require('./task'),
    proxy = require('./proxy');


var Tasks = {};
function noop() {}


// #### function create
// Returns a promise with newly created task.
Tasks.create = function(factory, type, data, options, done) {
  var deferred = when.defer();
  factory.getNextId('task', function(err, id) {
    if (err) return deferred.reject(err);
    return deferred.resolve(new Task(factory, id, type, data, options));
  });

  return deferred.promise;
}


// #### function get
// Accepts a factory and taskId and returns a promise with said task.
Tasks.get = function(factory, id) {
  var key = factory.prefix + 'tasks:' + id;

  return proxy.run(factory.client, 'hgetall', key)
              .then(function(json) {
                 if (!json) return when.reject(new Error("Task not found"))
                 return when.resolve(new Task(factory, json))
               });
}


// #### function getStatus
// Gets a task's status information.
Tasks.getStatus = function(factory, id) {
  return Tasks.get(factory, id)
              .then(function(task) {
                return when.resolve(task.metadata);
              });
}


module.exports = Tasks;
