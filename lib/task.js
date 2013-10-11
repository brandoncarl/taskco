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
    proxy = require('./proxy'),
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
    var defaults = factory.procedures[type].defaults,
        keys = Object.keys(defaults);

    for (var i = 0; i < keys.length; ++i)
      this.metadata[keys[i]] = options[keys[i]] || defaults[keys[i]];

    // Set up metadata
    this.metadata.created = Date.now();
    this.metadata.state = "waiting";
    this.metadata.progress = 0;

    // Set uid if defined
    if ("undefined" != typeof this.data.uid) this.uid = this.type + ":" + this.data.uid;

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
    return proxy.run(this.factory.client, "hmset", this.key, { metadata : this.metadata });
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
        key = this.key,
        client = this.factory.client;

    this.metadata.progress = 100;

    if ("undefined" == typeof den)
      proxy.run(client, "hmset", key, { metadata : this.metadata });
    else
      this.metadata.progress = 100 * num / den;

    promise = proxy.run(client, "hmset", key, { metadata : this.metadata });
    promise.ensure(function() { client = null; });

    return promise;
  }

}


// #### function finalize
// Sets state and progress and triggers potential auto-removal.
Task.prototype.finalize = function(state, progress) {

  var promise,
      expireFxn = privates.expireFunction(this),
      key = this.key,
      uid = this.uid,
      client = this.factory.client,
      uidKey = task.factory.prefix + task.type + ':uids';

  this.metadata.progress = progress;
  this.metadata.state = state;

  promise = proxy.run(client, "hmset", key, { metadata : this.metadata })
                 .then(function() {
                   if ("undefined" == uid) return when.resolve();
                   return proxy.run(client, "hdel", uidKey, uid);
                 })
                 .then(expireFxn);

  promise.ensure(function() { client = null; });

  return promise;
}


Task.prototype.complete = function() {
  this.emit("complete");
  return this.finalize("complete", 100);
}

Task.prototype.failure = function() {
  this.emit("failure");
  return this.finalize("failure", 0);
}


Task.prototype.save = function() {

  var self = this,
      promise,
      priority = 0,
      uidFxns = privates.uidFunctions(this);

  // Object-store keys
  var prefix  = this.factory.prefix + 'tasks:',
      taskKey  = prefix + this.id,
      typeKey = prefix + this.type,
      waitKey = typeKey + ':waiting';

  // Note that we add to waiting before to tasks so as to not early-trigger BLPOP
  // Alternatively, we could set up a transaction.
  promise = uidFxns.check()
            .then(function() { return proxy.run(self.factory.client, 'hmset', taskKey, self.serialize()); })
            .then(function() { return proxy.run(self.factory.client, 'zadd', waitKey, priority, self.id); })
            .then(uidFxns.update)
            .then(function() { return proxy.run(self.factory.client, 'rpush', typeKey, self.id); })

  promise.otherwise(function(err) {})
  promise.ensure(function() { self = null; });

  return promise;
}


var privates = {};

privates.uidFunctions = function(task) {

  var fxns = {},
      uidInfo = {},
      uidKey = task.factory.prefix + task.type + ':uids';

  if ("undefined" != typeof task.uid) {
    fxns.check  = function() { return task.factory.lacksTask(task.type, task.uid); };
    fxns.update = function() { return proxy.run(task.factory.client, 'hset', uidKey, task.uid, task.id); };
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
    return function() { return proxy.run(task.factory.client, 'expire', key, expires); };
}

module.exports = Task;

