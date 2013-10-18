"use strict";

/*

  ### Introduction
  The Dispatcher module to monitor tasks and respond to worker requests for
  more work. The events-handling portion of this module makes heavy use of code provided
  in LearnBoost/kue (that work is Copyright(c) 2011 LearnBoost, MIT Licensed)

*/



// ### Dependencies
var _ = require('lodash-node'),
    when = require('when'),
    sequence = require('when/sequence');



// #### function delegate
// Waits for work and assigns it when available.
function delegate(team) {

  var type = team.name;
  this.waitlist[type] = this.waitlist[type] || [];

  if (this.waitlist[type].length)
    return this.waitlist[type].push(team);

  this.waitlist[type].push(team);
  this.getNextJob(type);

}



function Dispatcher(factory) {

  var self = this;

  this.factory = factory;
  this.prefix = factory.prefix;
  this.eventsKey =  factory.prefix + "events";
  this.waitlist = {};

  // Bound functions
  this.delegate = delegate.bind(this);
  this.digest = digest.bind(this);

  // List of tasks the dispatcher is watching
  this.tasks = {};
  this.subscribed = false;
  factory.broker.getSub().then(function(c) { self.sub = c; self = null; });

}


// #### function getNextJob
// Checks for the next job of a particular type.
Dispatcher.prototype.getNextJob = function(type) {

  var cleanUp = function() {
    if (!!self) self = null;
  }

  try {

    var self       = this,
        masterKey  = this.prefix + 'tasks:' + type,
        waitKey    = this.prefix + 'tasks:' + type + ':waiting',

        blockPop   = function(c) { return c.blockPop(masterKey, 0); },
        sortedPop  = function(c) { return c.sortedPop(waitKey); },
        getTask    = function(c) { return sequence([blockPop, sortedPop], c); },

        runTask    = function(res) {
          var id   = res[1];

          if (self.waitlist[type].length) {
            var team = self.waitlist[type].shift();
            team.delegate(id);

            if (self.waitlist[type].length) {
              var getNextJob = self.getNextJob.bind(self);
              process.nextTick(function(){ getNextJob(type); getNextJob = null; });
            }
          }

          return when.resolve();
        };

  } catch (err) { cleanUp(); return when.reject(err); }

  return this.factory.client().then(function(c) {
    return getTask(c).then(runTask).ensure(function() { self.factory.release(c); });
  }).ensure(cleanUp);

}


// #### function subscribe
// Subscribes to the events message queue
Dispatcher.prototype.subscribe = function() {
  if (this.subscribed) return;
  this.sub.subscribe(this.eventsKey);
  this.sub.on('message', this.digest);
  this.subscribed = true;
}


// #### function watchTask
// Adds a task to our watch list.
Dispatcher.prototype.watchTask = function(task) {
  if (task.id) this.tasks[task.id] = task;
  if (!this.subscribed) this.subscribe();
}


// #### function ignoreTask
// Removes a task from our watch list.
Dispatcher.prototype.ignoreTask = function(id) {
  delete this.tasks[id];
}


// #### function digest
// Processes an incoming message. Error handling must occur here
// so as not to crash the server.
var digest = function(channel, message) {

  try {

    var message = JSON.parse(message),
        task    = this.tasks[message.id];

    if (task) {

      task.emit.apply(task, _.values(message.args));

      // Remove task on "remove" event, or with removeAfter if event
      // is failure or success.
      if ('remove' == message.event) this.ignoreTask(message.id);

      else {
        var removeAfter = task.metadata.removeAfter;

        if ("undefined" != typeof removeAfter && !!~['success', 'failure'].indexOf(message.event)) {
          var self = this;

          // Auto-remove tasks that include removeAfter
          setTimeout(function() {
            self.ignore(message.id);
            self = null;
          }, parseInt(removeAfter) * 1000);
        }
      }
    }
  } catch (err) {
    console.log("Error", err);
  }

}


// #### function broadcast
// Broadcasts a message to other dispatchers.
Dispatcher.prototype.broadcast = function(id, event, args) {

  if (!event) return;

  var factory = this.factory,
      eventsKey = this.eventsKey,
      message = JSON.stringify({ id : id, event : event, args : args });

  return factory.client().then(function(c) {
    return c.publish(eventsKey, message).ensure(function() { factory.release(c); });
  })

  .otherwise(function(err) { console.log("ERROR", err); })

  .ensure(function() { factory = null; });

}



exports = module.exports = Dispatcher;
