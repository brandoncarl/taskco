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


// #### function getId
// Gets a task's id based on type and uid.
Tasks.getId = function(factory, type, uid, done) {
  var key = factory.prefix + type + ':uids';

  return proxy.run(factory.client, 'hget', key, type)
        .then(function(val) {
           if (!!val) return when.resolve(val);
           return when.reject(new Error("Task not found."));
         });
}


// #### function getStatus
// Gets a task's status information.
Tasks.getStatus = function(factory, id) {
  Tasks.get(factory, id)
 .then(function(task) { return owe.resolve(this.metadata); });
}


// #### function doesNotExist
// Promise that resolves if task does not exist, and reject if exists.
Tasks.doesNotExist = function(factory, type, uid) {
  var deferred = when.defer();

  Tasks.getId(factory, type, uid)
  .then(function() { deferred.reject() }, function(err) { deferred.resolve() });

  return deferred.promise;
}


module.exports = Tasks;
