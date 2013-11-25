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

var when  = require('when'),
    Task  = require('./task');


var Tasks = {};


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
Tasks.get = function(factory, id, client) {

  var key      = factory.prefix + 'tasks:' + id,

      hashGet  = function(c) { return c.hashGetAll(key); },
      makeTask = function(json) {
        if (!json) return when.reject(new Error("Task not found"))
        return when.resolve(new Task(factory, json));
      };

  return factory.execute(client, function(c) {
    return hashGet(c).then(makeTask);
  });

}


// #### function getStatus - asynchronous
// Gets a task's status information. Returns a promise with the metadata.
Tasks.getStatus = function(factory, id, client) {
  var key = factory.prefix + 'tasks:' + id;

  return factory.execute(client, function(c) {
    return c.hashGet(key, 'metadata')
            .then(function(metadata) {
              if (!metadata) return when.reject(new Error("Task not found"))
              return when.resolve(JSON.parse(metadata));
            });
  });
}


// ### Queries

// #### function find
// Finds a task based on type and uid. Returns a promise with a task.
Tasks.find = function(factory, type, uid, client) {
  return factory.execute(client, function(c) {
    return Tasks.findId(factory, type, uid, c)
          .then(function(id) {
            return Tasks.get(factory, id, c);
          });
  });

}


// #### function findId
// Gets a task's id based on type and uid. If task does not exist,
// rejects without an error (so as to differentiate with "real" errors).
// Takes optional client to prevent race conditions.
Tasks.findId = function(factory, type, uid, client) {

  var key = factory.prefix + type + ':uids';

  return factory.execute(client, function(c) {
    return c.hashGet(key, uid).then(function(val) {
      if (!!val) return when.resolve(val);
      return when.reject();
    });
  });

}


// #### function findExists
// Promise that resolves if task exists in active/waiting state.
Tasks.findExists = function(factory, type, uid, client) {

  return factory.execute(client, function(c) {
    return Tasks.find(factory, type, uid, c)
                  .then(function(task) {
                    if ("undefined" != typeof task && ['active', 'waiting'].indexOf(task.info().state) > -1)
                      return when.resolve(task.id);
                    else
                      return when.reject(task ? task.id : undefined);
                  });

  });

}


module.exports = Tasks;
