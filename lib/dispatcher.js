"use strict";

/*

  ### Introduction
  The Dispatcher module to monitor tasks and respond to worker requests for
  more work. The events-handling portion of this module makes heavy use of code provided
  in LearnBoost/kue (that work is Copyright(c) 2011 LearnBoost, MIT Licensed)

*/



// ### Dependencies
var when = require('when'),
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

  var self = null;

  this.factory = factory;
  this.prefix = factory.prefix;
  this.eventsKey =  factory.prefix + "events";
  this.waitlist = {};
  this.delegate = delegate.bind(this);

  // List of tasks the dispatcher is watching
  this.tasks = {};
  this.subscribed = false;
  factory.broker.pubSub().then(function(c) { self.pubSub = c; self = null; });

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

  this.pubSub.subscribe(this.eventsKey);
  this.pubSub.on('message', digest);
  this.subscribed = true;
}


// #### function watch
// Adds a task to our watch list.
Dispatcher.prototype.watch = function(task) {
  if (task.id) this.tasks[task.id] = task;
  if (!this.subscribed) this.subscribe();
}


// #### function ignore
// Removes a task from our watch list.
Dispatcher.prototype.ignore = function(id) {
  delete this.tasks[id];
}


// #### function digest
// Processes an incoming message. Error handling must occur here
// so as not to crash the server.
Dispatcher.prototype.digest = function(channel, message) {

  try {

    var message = JSON.parse(message),
        task    = this.tasks[message.id];

    if (task) {

      task.emit.apply(task, message.args);

      // Remove task on "remove" event, or with removeAfter if event
      // is failure or complete.
      if ('remove' == message.event) this.remove(message.id);

      else {
        var removeAfter = this.metadata.removeAfter;

        if ("undefined" == typeof removeAfter || !~['complete', 'failure'].indexOf(message.event)) {
          var self = this;

          setTimeout(function() {
            self.remove(message.id);
            self = null;
          }, parseInt(removeAfter) * 1000);
        }
      }
    }
  } catch (err) {
    console.log("Error", err);
  }

}


// #### function dispatch
// Emits a message to other dispatchers.
Dispatcher.prototype.dispatch = function(id, event) {
  var message = JSON.stringify({ id : id, event : event, args : [].slice.call(arguments, 1) });
  this.pubSub.publish(this.eventsKey, message)
}


exports = module.exports = Dispatcher;
