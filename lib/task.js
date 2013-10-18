"use strict";

/*

  ### Introduction
  The Task module is used to set up traditional task templating.

  When a task is created, multiple updates occurs. In example below,
  we use email as the type, and 3 as the id.
  1. The task JSON is added to :tasks:3
  2. The task is added to the set :tasks:email:waiting
  3. The task id is added to :tasks:email

  The job process goes as follows:
  1. The change to :tasks:emails alerts manager that to process something.
  2. The manager attempts to pop highest priority from :tasks:emails:waiting
  3. The team asssigns a worker to process the job.
  4. As a result, the only "remaining" key in place when job is complete
     is :tasks:email:3.

  ### Status
  [√] Incorporates Promises
  [ ] Has logging
  [ ] Has documentation
  [√] Reports exceptions
  [ ] Has unit tests

*/



// ### Dependencies

var _            = require('lodash-node'),
    when         = require('when'),
    sequence     = require('when/sequence'),
    EventEmitter = require('events').EventEmitter;



// ### Private functions
// These functions are not accessible via module.exports, but stored in a single
// `privates` object for testing via packages like rework.

var privates = {};


// #### function uidFunctions - synchronous
// If task has unique identifier, checks for existence before saving and stores update.
// Errors are propagated to caller.
privates.uidFunctions = function(task) {

  var fxns = {},
      uidInfo = {},
      uidKey = task.factory.prefix + task.type + ':uids';

  if ("undefined" != typeof task.uid) {
    fxns.check  = function() { return task.factory.lacksTask(task.type, task.uid); };
    fxns.update = function(client) { return client.hashSet(uidKey, task.uid, task.id); };
  } else {
    fxns.check  = function() { return when.resolve(); }
    fxns.update = function() { return when.resolve(); }
  }

  return fxns;
}


// #### function expireFunction - synchronous
// If task has "removeAfter", sets task to expire. Errors are propagated to caller.
privates.expireFunction = function(task) {

  var key = task.key,
      expires = task.metadata.removeAfter;

  if ("undefined" == typeof expires)
    return function() { return when.resolve(); };
  else
    return function(client) { return client.expire(key, expires); };
}




// ### Task Class

// The internal class used by Tasks. The task constructor can be used either by passing (factory, task),
// or by passing additional arguments. In the event that id is not a number, we will attempt to create
// from a task. Errors are propagated to caller.
//

function Task(factory, id, type, data, options) {

  this.factory = factory;

  // Either create task from existing task (passed as second arg) or from arguments.
  if ("object" == typeof id) {

    if ("string" == typeof id.metadata) id.metadata = JSON.parse(id.metadata);
    if ("string" == typeof id.data) id.data = JSON.parse(id.data);

    _.extend(this, _.pick(id, ['id', 'key', 'type', 'data', 'metadata', 'uid']))

  } else {

    // Set up key simple variables
    this.id       = id;
    this.key      = this.factory.prefix + 'tasks:' + this.id;
    this.type     = type;
    this.data     = data || {};
    this.metadata = {};

    // Set up metadata
    this.metadata.created = Date.now();
    this.metadata.state = "waiting";
    this.metadata.progress = 0;
    this.metadata.broadcasts = [];

    // Set uid if defined
    if ("undefined" != typeof this.data.uid) this.uid = this.data.uid;

  }

  // Copy over defaults
  var defaults = (factory.procedures[this.type] || { defaults : {} }).defaults;
  for (var key in defaults)
    this.metadata[key] = this.metadata[key] || defaults[key];

}

Task.prototype.__proto__ = EventEmitter.prototype;


// #### function save - asynchronous
// Performs multi database operations in order to save a task. See the example
// listed in the introduction for specific steps. Returns valueless promise.
Task.prototype.save = function() {

  var cleanUp = function() {
    if (!!self) self = null;
    if (!!uidFxns) uidFxns = null;
  }

  try {

    var p,
        priority  = 0,
        self      = this,
        uidFxns   = privates.uidFunctions(this),

        // Object-store keys
        prefix    = self.factory.prefix + 'tasks:',
        taskKey   = prefix + this.id,
        typeKey   = prefix + this.type,
        waitKey   = typeKey + ':waiting',

        storeTask = function(c) { return c.hashMultiSet(taskKey, self.serialize()); },
        queueTask = function(c) { return c.sortedAdd(waitKey, [priority, self.id]); },
        pushTask  = function(c) { return c.push(typeKey, [self.id]); },

        seq = [uidFxns.check, storeTask, queueTask, pushTask, uidFxns.update];

  } catch (err) { cleanUp(); return when.reject(err); }

  // Note that we add to waiting before to tasks so as to not early-trigger BLPOP
  // Alternatively, we could set up a transaction.
  return self.factory.client().then(function(c) {
    return sequence(seq, c).ensure(function() { self.factory.release(c); });
  }).ensure(cleanUp);

}


// #### function on - synchronous √
// Replaces default EventEmitter function so as add task to dispatcher
Task.prototype.on = function(event) {
  if (!this.broadcasts(event))
    this.metadata.broadcasts.push(event);

  EventEmitter.prototype.on.apply(this, arguments);
  return this.factory.dispatcher.watch(this);
}


// #### function bindLocal
Task.prototype.bindLocal = function() {
  return EventEmitter.prototype.on.apply(this, arguments);
}


// #### function broadcast - synchronous
// Ensures that message is sent to all available listeners.
Task.prototype.broadcast = function(event) {
  // Note that we intentionally include the event in the arguments
  return this.factory.dispatcher.dispatch(this.id, event, arguments);
  // EventEmitter.prototype.emit.apply(this, arguments);
}


Task.prototype.broadcasts = function(event) {
  return !!~this.metadata.broadcasts.indexOf(event);
}


// #### function announce - synchronous
// Intelligently emits an event (if local only), or broadcasts an event (if global or broadcast)
Task.prototype.announce = function(event) {
  if (this.metadata.broadcastAll || this.broadcasts(event))
    this.broadcast.apply(this, arguments);
  else
    this.emit.apply(this, arguments);
}


// #### function off - synchronous
// Convenience alias for removeAllListeners.
Task.prototype.off = function(event) {
  this.removeAllListeners(event);
}



// #### function toObject - synchronous
// Returns a JSON-representation of the object.
Task.prototype.toObject = Task.prototype.toJSON = function() {

  var json = {
    id       : this.id,
    key      : this.key,
    type     : this.type,
    data     : ("string" == typeof this.data) ? JSON.parse(this.data) : this.data,
    metadata : ("string" == typeof this.metadata) ? JSON.parse(this.metadata) : this.metadata
  };

  if ("undefined" != typeof this.uid) json.uid = this.uid;
  return json;

}


// #### function info - synchronous (getter) / asynchronous (setter)
// Overloaded operator: provides getting/setting access to metadata.
// Returns metadata if no argument. Returns valueless promise if setting.
Task.prototype.info = function(changes) {

  if ("undefined" == typeof changes) return this.metadata;

  // Update metadata
  for (var key in changes)
    this.metadata[key] = changes[key];

  var key = this.key,
      factory = this.factory,
      metadata = this.metadata;

  // Get client, set new data, and release
  return factory.client().then(function(c) {
    return c.hashSet(key, 'metadata', metadata)
            .ensure(function() { factory.release(c); });
  });

}


// #### function activate - asynchronous
// Changes task status to `active`. Returns a valueless promise.
Task.prototype.activate = function() {
  return this.info({ state : 'active' });
}


// #### function deactivate - asynchronous
// Changes task status to `waiting`. Returns a valueless promise.
Task.prototype.deactivate = function() {
  return this.info({ state : 'waiting', progress : 0 });
}


// #### function serialize - synchronous
// Converts an object to a "storeable" object by forcing values to literals.
// Errors are propagated to caller. Returns serialized object.
Task.prototype.serialize = function() {

  var serialized = this.toJSON();

  serialized.data = JSON.stringify(serialized.data);
  serialized.metadata = JSON.stringify(serialized.metadata);

  return serialized;

}


// #### function progress - synchronous (getter) / asynchronous (setter)
// Overloaded getter and setter of progress. If no arguments, returns progress.
// If one argument, sets progress (out of 100). If two, normalizes to percent * 100.
// Getter returns progress, setter returns valueless promise.
Task.prototype.progress = function(num, den) {

  if ("undefined" == typeof num) return parseFloat(this.progress);

  var progress,
      key = this.key;

  if ("undefined" == typeof den)
    progress = Math.min(num, 100);
  else
    progress = Math.min(100 * num / den, 100);

  this.announce('progress', progress);

  if (100 == progress)
    return this.finalize("success", 100);
  else
    return this.info({ progress : progress });

}


// #### function finalize - asynchronous
// Sets state and progress and triggers potential auto-removal.
// Returns a valueless promise.
Task.prototype.finalize = function(state, progress, err) {

  var cleanUp = function(err) {
    if (!!factory) factory = null;
    if (!!metadata) metadata = null;
    if (!!expireFxn) expireFxn = null;
  }


  try {

    this.metadata.progress = progress;
    this.metadata.state = state;

    if (err) this.metadata.error = err;

    var p,
        key       = this.key,
        uid       = this.uid,
        factory   = this.factory,
        metadata  = this.metadata,
        expireFxn = privates.expireFunction(this),
        uidKey    = this.factory.prefix + this.type + ':uids',

        hashSet   = function(c) { return c.hashSet(key, 'metadata', metadata); },
        hashUnset = function(c) { return c.hashUnset(uidKey, [uid]); },
        update    = function(c) { return sequence([hashSet, hashUnset, expireFxn], c); };

  } catch (err) { cleanUp(); return when.reject(err); }


  p = factory.client()

  .then(function(c) {
    return update(c).ensure(function() { factory.release(c); });
  })

  .ensure(cleanUp);

  return p;

}


// #### function success - asynchronous
// Emits success and successs task in store. Returns a valueless promise.
Task.prototype.success = function() {
  this.announce("success");
  return this.finalize("success", 100);
}


// #### function failure - asynchronous
// Emits failure and rejects task in store. Returns a valueless promise.
Task.prototype.failure = function(err) {
  this.announce("failure");

  // THIS SHOULD NOT OVERWRITE PROGRESS WITH 0: WANT TO KNOW WHERE FAILURE OCCURRED
  return this.finalize("failure", 0, err);
}




module.exports = Task;
