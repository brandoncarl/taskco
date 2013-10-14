"use strict";

/*

  ### Introduction
  The Tasks module is used to set up traditional task templating.

*/



// ### Dependencies

var when = require('when'),
    Task = require('./task');


var Tasks = {};
function noop() {}


// #### function create
// Returns a promise with newly created task.
Tasks.create = function(factory, type, data, options, done) {

  return factory.getNextId('task')
                .then(function(id) {
                  var task = new Task(factory, id, type, data, options);
                  return when.resolve(task);
                });
}


// #### function get
// Accepts a factory and taskId and returns a promise with said task.
Tasks.get = function(factory, id) {

  var p, q,
      key      = factory.prefix + 'tasks:' + id,

      release  = factory.release.bind(factory),
      hashGet  = function(c) { return c.hashGetAll(key); },
      makeTask = function(json) {
        if (!json) return when.reject(new Error("Task not found"))
        return when.resolve(new Task(factory, json))
      };

  conosle.log("WAITING ON CLIENT");
  p = factory.client().then(function(c) {
        console.log("CLIENT RECEIVED");
        q = hashGet(c).then(makeTask);
        q.ensure(function() { release(c); });
        return q;
      });

  return p;

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
