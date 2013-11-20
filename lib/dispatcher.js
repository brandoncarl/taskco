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


// Store private methods (can be exposed for testing using rewire)
var privates = {};


function Dispatcher(factory, options) {

  var self = this;

  // Ensure options are in place, with block duration
  this.options = options || {};
  this.options.blockDuration = this.options.blockDuration || 2;

  this.factory = factory;
  this.prefix = factory.prefix;
  this.eventsKey =  factory.prefix + "events";
  this.waitlist = {};
  this.halted = false;

  // Bound functions
  this.delegate = privates.delegate.bind(this);
  this.routeMessage = privates.routeMessage.bind(this);
  this.ignoreTask = privates.ignoreTask.bind(this);
  this.tidy = privates.tidy.bind(this);
  this.halt = privates.halt.bind(this);
  this.shutdown = privates.shutdown.bind(this);

  // List of tasks the dispatcher is watching
  this.tasks = {};
  this.subscribed = false;
  factory.broker.getSubscriber().then(function(c) {
    self.subscriber = c;
    self.subscribe();
    self = null;
  });

  this.tidy();
}



// #### function delegate
// Waits for work and assigns it when available.
privates.delegate = function(team) {

  var type = team.name;
  this.waitlist[type] = this.waitlist[type] || [];

  if (this.waitlist[type].length)
    return this.waitlist[type].push(team);

  this.waitlist[type].push(team);
  this.getNextTask(type);

}


// #### function halt
// Stops dispatcher from pulling tasks by setting halted flag and clearing
// waitlist of available teams.
privates.halt = function(timeToLive) {

  var self = this,
      deferred = when.defer();

  this.halted = true;
  this.waitlist = {};

  setTimeout(function() {
    deferred.resolve(self.broadcast("terminating", null, { timeToLive : timeToLive }));
  }, 1000 * this.options.blockDuration);

  return deferred.promise;
}


// #### function shutdown
// Gracefully shuts down the dispatcher.
privates.shutdown = function() {
  this.terminated = true;
  return when.resolve();
}


// #### function tidy - this function will likely be renamed in the future
// Cleans out purgatory - in the future, should perform other tasks as well
privates.tidy = function() {

  var self = this,
      promise,
      sha = this.factory.scripts['tidy'],
      name = this.factory.name,
      purgatory = this.factory.prefix + 'purgatory';

  // Check if script has already been loaded. Create a decoy promise if it has.
  if ("undefined" != typeof sha)
    promise = when.resolve();
  else
    promise = this.factory.loadScripts();

  return promise.then(function() {
    sha = self.factory.scripts['tidy'];
    self.factory.execute(function(c) {
      self = null;
      return c.evalSHA(sha, 1, purgatory, name, Date.now());
    });
  });

}


// #### function requeueTask
// Requeues a task if necessary ahead of shutdown. Info is an array containing the results.
// info[0] is the result of blockPop: key, triggering task id (discard)
// info[1] is the result of sortedPop: [id, priority]
privates.requeueTask = function(keys, info, c) {

  var tasks = [],
      id,
      priority,
      triggerId,

      // This code copied from Task.queue: should ideally be modularized
      queueTask = function(c) { return c.priorityAdd(keys.waitKey, [priority, id]); },
      pushTask  = function(c) { return c.push(keys.typeKey, [triggerId]); };

  // If sortedPop returned a task id, re-queue
  if (null !== info[1]) {
    id = info[1][0];
    priority = info[1][1];
    tasks.push(queueTask)
  }

  // If blockPop returned something, put back
  if (null !== info[0]) {
    triggerId = info[0][1];
    tasks.push(pushTask);
  }

  if (tasks.length)
    return sequence(tasks, c);
  else
    return when.resolve();

}


// #### function getNextTask
// Checks for the next task of a particular type.
Dispatcher.prototype.getNextTask = function(type) {

  // Terminate of shutting down
  if (this.halted) return;

  var cleanUp = function() {
    if (!!self) self = null;
  }

  try {

    var self       = this,
        typeKey    = this.prefix + 'tasks:' + type,
        waitKey    = this.prefix + 'tasks:' + type + ':waiting',

        blockPop   = function(c) { return c.blockPop(typeKey, self.options.blockDuration); },
        sortedPop  = function(c) { return c.sortedPop(waitKey); },

        getTask    = function(c) {
          return blockPop(c).then(function(res) {
            if (null === res)
              return when.resolve([null, null]);
            else
              return when.join(when.resolve(res), sortedPop(c));
          });
        },

        runTask = function(res, c) {

          // If halted or there are no workers available (mistaken queue), re-queue
          if (self.halted || _.isEmpty(self.waitlist[type]))
            return privates.requeueTask({ waitKey : waitKey, typeKey : typeKey }, res, c);

          // If there are available teams, delegate to one of them
          // res[1] contains the results of sortedPop. res[1][0] is the task id.
          if (null !== res[1]) {
            var team = self.waitlist[type].shift();
            team.delegate(res[1][0]);
          }

          // If there are teams left, block again.
          if (self.waitlist[type].length) {
            var getNextTask = self.getNextTask.bind(self);
            process.nextTick(function(){ getNextTask(type); getNextTask = null; });
          }

          return when.resolve();
        };

  } catch (err) { cleanUp(); return when.reject(err); }

  return this.factory.execute(function(c) {
    return getTask(c).then(function(res) { runTask(res, c); });
  }).ensure(cleanUp);

}


// #### function subscribe
// Subscribes to the events message queue
Dispatcher.prototype.subscribe = function() {
  if (this.subscribed) return;
  this.subscriber.subscribe(this.eventsKey);
  this.subscriber.on('message', this.routeMessage);
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
privates.ignoreTask = function(id) {
  if (this.tasks[id]) delete this.tasks[id];
}


// #### function routeMessage
// Processes an incoming message. Error handling must occur here
// so as not to crash the server.
privates.routeMessage = function(channel, message) {

  try {

    var message = JSON.parse(message),
        task    = this.tasks[message.id];

    if (task) {

      task.emit.apply(task, _.values(message.args));

      // Remove task on "remove" event, or with removeAfter if event is failure or success.
      if ('remove' == message.event) this.ignoreTask(message.id);

      else {
        var removeAfter = task.metadata.removeAfter;

        if ("undefined" != typeof removeAfter && !!~['success', 'failure'].indexOf(message.event)) {
          var self = this;

          // Auto-remove tasks that include removeAfter
          setTimeout(function() {
            self.ignoreTask(message.id);
            self = null;
          }, parseInt(removeAfter) * 1000);
        }
      }
    } else if (!this.halted) {
      if ("terminating" == message.event) {
        // Add one second plus random delay to tidying to ensure all processes don't
        // fire at once, and that sufficient time has been given for power down.
        _.delay(this.tidy, 1000 * (1 + message.args.timeToLive + Math.random()));
      }
    }

  } catch (err) {
    console.log("Error", err);
  }

}


// #### function broadcast
// Broadcasts a message to other dispatchers.
Dispatcher.prototype.broadcast = function(event, id, args) {

  // !!! THIS IS HACKY - CHANGE
  if (!event || this.terminated) return;

  var eventsKey = this.eventsKey,
      message = JSON.stringify({ id : id, event : event, args : args });

  return this.factory.execute(function(c) {
    return c.publish(eventsKey, message);
  })

  .otherwise(function(err) {
    console.log("ERROR", err);
    return when.reject(err);
  });

}



exports = module.exports = Dispatcher;
