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

*/



// ### Dependencies

var _ = require('lodash-node'),
    when = require('when'),
    sequence = require('when/sequence'),
    EventEmitter = require('events').EventEmitter;

function noop() {}


// #### function Task
// The internal class used by Tasks. The task constructor can be used either by passing (factory, task),
// or by passing additional arguments. In the event that id is not a number, we will attempt to create
// from a task.
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

    // Copy over defaults
    var defaults = (factory.procedures[type] || { defaults : {} }).defaults;
    for (var key in defaults) this.metadata[key] = defaults[key];
    for (var key in options) this.metadata[key] = options[key];

    // Set up metadata
    this.metadata.created = Date.now();
    this.metadata.state = "waiting";
    this.metadata.progress = 0;

    // Set uid if defined
    if ("undefined" != typeof this.data.uid) this.uid = this.data.uid;

  }

}


Task.prototype.__proto__ = EventEmitter.prototype;


Task.prototype.toObject = Task.prototype.toJSON = function() {

  var json = {
    id      : this.id,
    key     : this.key,
    type    : this.type,
    data    : this.data,
    metadata: this.metadata
  };

  if ("undefined" != typeof this.uid) json.uid = this.uid;
  return json;

}


// #### function info
// Overloaded operator: provides getting/setting access to metadata.
Task.prototype.info = function(changes) {
  if ("undefined" == typeof changes)
    return this.metadata;
  else {
    for (var key in changes)
      this.metadata[key] = changes[key];

    var key = this.key,
        metadata = this.metadata;

    return this.factory.client().then(function(client) {
      return client.hashSet(key, 'metadata', metadata)
    });
  }
}


Task.prototype.activate = function() {
  return this.info({ state : 'active' });
}


Task.prototype.deactivate = function() {
  return this.info({ state : 'inactive', progress : 0 });
}


Task.prototype.serialize = function() {
  var serialized = this.toJSON();

  serialized.data = JSON.stringify(serialized.data);
  serialized.metadata = JSON.stringify(serialized.metadata);

  return serialized;
}


// #### function progress
// Overloaded getter and setter of progress. If no arguments, returns progress.
// If one argument, sets progress (out of 100). If two, normalizes to percent * 100.
Task.prototype.progress = function(num, den) {

  if ("undefined" == typeof num)
    return this.progress;
  else {
    var promise,
        progress,
        key = this.key;

    if ("undefined" == typeof den)
      progress = Math.min(num, 100);
    else
      progress = Math.min(100 * num / den, 100);

    if (100 == progress) return this.finalize("complete", 100);
    return this.info({ progress : progress });
  }

}


// #### function finalize
// Sets state and progress and triggers potential auto-removal.
Task.prototype.finalize = function(state, progress) {

  try {

    this.metadata.progress = progress;
    this.metadata.state = state;

    var p, q,
        expireFxn = privates.expireFunction(this),
        key = this.key,
        uid = this.uid,
        factory = this.factory,
        metadata = this.metadata,
        uidKey = this.factory.prefix + this.type + ':uids',

        hashSet   = function(c) { return c.hashSet(key, 'metadata', metadata); },
        hashUnset = function(c) { return c.hashUnset(uidKey, [uid]); },
        update    = function(c) { return sequence([hashSet, hashUnset, expireFxn]); };

  } catch (err) { return when.reject(err); }


  p = this.factory.client().then(function(c) {
    q = update(c);
    q.ensure(function() { release(c); });
    return q;
  });

  p.ensure(function() { factory = null; metadata = null; });
  return p;
}


Task.prototype.complete = function() {
  this.emit("complete");
  return this.finalize("complete", 100);
}


Task.prototype.failure = function(err) {
  this.emit("failure");

  this.metadata.state = "failure";
  this.metadata.progress = 0;
  if (err) this.metadata.error = err;

  return this.info(this.metadata);
}


Task.prototype.save = function() {

  var promise,
      priority  = 0,
      self      = this,
      uidFxns   = privates.uidFunctions(this),

      // Object-store keys
      prefix    = this.factory.prefix + 'tasks:',
      taskKey   = prefix + this.id,
      typeKey   = prefix + this.type,
      waitKey   = typeKey + ':waiting',

      release   = this.factory.release.bind(this.factory),
      storeTask = function(c) { return c.hashMultiSet(taskKey, self.serialize()); },
      queueTask = function(c) { return c.sortedAdd(waitKey, [priority, self.id]); },
      pushTask  = function(c) { return c.push(typeKey, [self.id]); },

      seq = [uidFxns.check, storeTask, queueTask, pushTask, uidFxns.update, release];

  // Note that we add to waiting before to tasks so as to not early-trigger BLPOP
  // Alternatively, we could set up a transaction.
  promise = this.factory.client()
                .then(function(client) {
                  return sequence(seq, client);
                });

  promise.otherwise(function(err) {})
  promise.ensure(function() { self = null; });

  return promise;
}


Task.prototype.off = function(event) {
  this.removeAllListeners(event);
}
var privates = {};

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


privates.expireFunction = function(task) {
  var key = task.key,
      expires = task.metadata.removeAfter;

  if ("undefined" == typeof expires)
    return function() { return when.resolve(); };
  else
    return function(client) { return client.expire(key, expires); };
}


module.exports = Task;
