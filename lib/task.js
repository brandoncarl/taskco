"use strict";

/*

  ### Introduction
  The Task module is used to set up traditional task templating.

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

  if ("object" == typeof id) {
    // In this situation, id is a misnomer and represents a task
    _.extend(this, _.pick(id, ['id', 'type', 'data', 'options', 'metadata', 'uid']))
  } else {
    this.id = id;
    this.type = type;
    this.data = data || {};
    this.options = options || {};

    // Set uid if has been specified
    if ("undefined" != typeof this.data.uid) this.uid = this.type + ":" + this.data.uid;
  }

}


Task.prototype.__proto__ = EventEmitter.prototype;


Task.prototype.toObject = Task.prototype.toJSON = function() {

  var json = {
    id      : this.id,
    type    : this.type,
    data    : this.data,
    options : this.options,
  };

  if ("undefined" != typeof this.uid) json.uid = this.uid;
  return json;

}


// Should both get and set metadata.
Task.prototype.metadata = function() {
  return this._metadata;
}


Task.prototype.save = function() {

  var self = this,
      priority = 0,
      uidFxns = privates.uidFunctions(this);

  // Object-store keys
  var prefix  = this.factory.prefix + 'tasks:',
      jobKey  = prefix + this.id,
      typeKey = prefix + this.type,
      uidKey  = typeKey + ':uids',
      waitKey = typeKey + ':waiting';

  // Note that we add to waiting before to jobs so as to not early-trigger BLPOP
  return uidFxns.check()
         .then(function() { return proxy.run(self.factory.client, 'hmset', jobKey, self.toJSON()); })
         .then(function() { return proxy.run(self.factory.client, 'zadd', waitKey, priority, self.id); })
         .then(uidFxns.update)
         .then(function() { return proxy.run(self.factory.client, 'rpush', typeKey, self.id); })
         .otherwise(function(err) { console.log(err); })
         .ensure(function() { self = null; });

}


var privates = {};

privates.uidFunctions = function(self) {
  var fxns = {};

  if ("undefined" != typeof self.uid) {
    fxns.check  = function() { return self.factory.lacksTask(self.type, self.uid); };
    fxns.update = function() { return proxy.run(self.factory.client, 'hset', uidKey, self.id); };
  } else {
    fxns.check  = function() { return when.resolve(); }
    fxns.update = function() { return when.resolve(); }
  }

  return fxns;
}




module.exports = Task;

