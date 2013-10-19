"use strict";

/*

  ### Introduction
  The Monitor module provides statistics, executes queries, and handles logging.
  There should be a single monitor per factory.

*/


// ### Dependencies

var when  = require('when'),
    Tasks = require('./tasks');


var Monitor = {};


// ### Queries

// #### function find
// Finds a task based on type and uid. Returns a promise with a task.
Monitor.find = function(factory, type, uid, client) {

  return factory.execute(client, function(c) {
    return Monitor.findId(factory, type, uid, client)
          .then(function(id) {
            return Tasks.get(factory, id, client);
          });
  });

}


// #### function findId
// Gets a task's id based on type and uid. If task does not exist,
// rejects without an error (so as to differentiate with "real" errors).
// Takes optional client to prevent race conditions.
Monitor.findId = function(factory, type, uid, client) {

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
Monitor.findExists = function(factory, type, uid, client) {

  return factory.execute(client, function(c) {
    return Monitor.find(factory, type, uid, client)
                  .then(function(task) {
                    if ("undefined" != typeof task && ['active', 'waiting'].indexOf(task.info().state) > -1)
                      return when.resolve(task.id);
                    else
                      return when.reject(task ? task.id : undefined);
                  });

  });

}


// ### Statistics - NEEDS VOLUNTEERS


// ### Logging - NEEDS VOLUNTEERS



module.exports = Monitor;
