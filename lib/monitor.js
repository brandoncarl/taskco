"use strict";

/*

  ### Introduction
  The Monitor module provides statistics, executes queries, and handles logging.
  There should be a single monitor per factory.

*/


// ### Dependencies

var when  = require('when'),
    proxy = require('./proxy'),
    Tasks = require('./tasks');


var Monitor = {};
function noop() {}



// ### Queries

// #### function find
// Finds a task based on type and uid. Returns a promise with a task.
Monitor.find = function(factory, type, uid) {
  return Monitor.findId(factory, type, uid)
  .then(function(id) {
    return Tasks.get(factory, id);
  });
}


// #### function findId
// Gets a task's id based on type and uid.
Monitor.findId = function(factory, type, uid) {
  var key = factory.prefix + type + ':uids';
  return proxy.run(factory.client, 'hget', key, uid)
              .then(function(val) {
                if (!!val) return when.resolve(val);
                return when.reject(new Error("Task not found."));
              });
}


// #### function findExists
// Promise that resolves if task exists in active/waiting state.
Monitor.findExists = function(factory, type, uid) {
  return Monitor.find(factory, type, uid)
                .then(function(task) {
                  if (['active', 'waiting'].indexOf(task.info().state) > -1)
                    return when.resolve();
                  else
                    return when.reject();
                });
}


// ### Statistics - NEEDS VOLUNTEERS


// ### Logging - NEEDS VOLUNTEERS



module.exports = Monitor;
