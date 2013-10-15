"use strict";

/*

  ### Introduction
  The Tasks module is used to set up traditional task templating.

  ### Status
  [√] Incorporates Promises
  [ ] Has logging
  [ ] Has documentation
  [√] Reports exceptions
  [ ] Has unit tests

*/



// ### Dependencies

var when = require('when'),
    Task = require('./task');


var Tasks = {};
function noop() {}


// #### function create - asynchronous
// Returns a promise with newly created task.
Tasks.create = function(factory, type, data, options) {

  return factory.getNextId('task')
                .then(function(id) {
                  var task = new Task(factory, id, type, data, options);
                  return when.resolve(task);
                });
}


// #### function get - asynchronous
// Accepts a factory and taskId and returns a promise with said task.
Tasks.get = function(factory, id) {

  var key      = factory.prefix + 'tasks:' + id,
      release  = factory.release,

      hashGet  = function(c) { return c.hashGetAll(key); },
      makeTask = function(json) {
        if (!json) return when.reject(new Error("Task not found"))
        return when.resolve(new Task(factory, json))
      };

  return factory.client().then(function(c) {
    return hashGet(c).then(makeTask)
                     .ensure(function() { release(c); release = null; });
  });

}


// #### function getStatus - asynchronous
// Gets a task's status information. Returns a promise with the metadata.
Tasks.getStatus = function(factory, id) {
  return Tasks.get(factory, id).then(function(task) {
    return when.resolve(task.metadata);
  });
}


module.exports = Tasks;
