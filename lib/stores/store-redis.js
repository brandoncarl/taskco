"use strict";

/*

  ### Introduction
  The Store module allows different interfaces to be set up.

  They must have the following functions.
  * constructor
  * run
  * remove
  * hashIncrement
  * hashGet
  * hashGetAll
  * hashSet
  * hashMultiSet
  * hashUnset
  * prepend
  * push
  * setAdd
  * sortedAdd
  * priorityAdd
  * expire
  * blockPop
  * sortedPop

  Sorted functions must facilitate removing the highest-priority item, and to use
  FIFO when tasks have the same priority.

*/


// ### Dependencies
var _ = require('lodash-node'),
    url = require('url'),
    when = require('when'),
    redis = require('redis'),
    utils = require('../utils');


function Store(settings) {
  this.settings = settings || {};
}


Store.prototype.createConnection = function(done) {
  try {
    var connection = new StoreRedis(this.settings);

    // Unclear whether to include callback in auth.
    // auth is called only once, and does not pass back connection.
    if ("undefined" != typeof connection.password)
      connection.client.auth(connection.password);

  } catch (err) { done(err, null); }

  done(null, connection);
}


Store.prototype.destroyConnection = function(connection) {
  connection.client.end();
}


// Defaults to no_ready_check for url
function StoreRedis(args) {

  if ("undefined" == typeof args || "undefined" == typeof args.uri) {
    this.client = redis.createClient(args.port || 6379, args.hostname || '127.0.0.1', args.options || {});
    if (args.password) this.password = args.password;
  } else if ("string" == typeof args.uri) {
    var redisUrl = url.parse(args.uri);
    this.client = redis.createClient(redisUrl.port, redisUrl.hostname, { no_ready_check : true });
    this.password = redisUrl.auth.split(":")[1];
  } else {
    throw new Error("Invalid connection settings. Cannot connect to Redis");
  }

  _.bindAll(this);

}


// #### function run
// Helper function to wrap commands in promises.
StoreRedis.prototype.run = function(command) {

  var deferred = when.defer(),
      args = arguments[1] || [];

  // Set up and store callback function
  var cb = function(err, results) {
    if (err) return deferred.reject(err);
    return deferred.resolve(results);
  }

  args.push(cb);

  this.client[command].apply(this.client, args)
  return deferred.promise;
}


// #### function delete
// Delete a key.
StoreRedis.prototype.remove = function(key) {
  return this.run('del', [key]);
}

// #### function hashIncrement
// Increment the integer value of a hash field by the given number.
StoreRedis.prototype.hashIncrement = function(key, field, increment) {
  return this.run('hincrby', [key, field, increment]);
};


// #### function hashGet
// Get the value of a hash field.
StoreRedis.prototype.hashGet = function(key, field) {
  return this.run('hget', [key, field]);
};


// #### function hashGetAll
// Get all the fields and values in a hash.
StoreRedis.prototype.hashGetAll = function(key) {
  return this.run('hgetall', [key]);
};


// #### function hashSet
// Set the string value of a hash field.
StoreRedis.prototype.hashSet = function(key, field, value) {
  return this.run('hset', [key, field, JSON.stringify(value)]);
};


// #### function hashMultiSet
// Set multiple field values based on an object.
StoreRedis.prototype.hashMultiSet = function(key, obj) {
  return this.run('hmset', [key, utils.serialize(obj)]);
};


// #### function hashUnset
// Delete one or more hash fields (fields are given as an array).
StoreRedis.prototype.hashUnset = function(key, fields) {
  fields.unshift(key)
  return this.run('hdel', fields);
};


// #### function prepend
// Prepend one or multiple values to a list (values given as an array).
StoreRedis.prototype.prepend = function(key, values) {
  values.unshift(key)
  return this.run('lpush', utils.serialize(values));
};


// #### function push
// Append one or multiple values to a list.
StoreRedis.prototype.push = function(key, values) {
  values.unshift(key)
  return this.run('rpush', utils.serialize(values));
};


// #### function setAdd
// Add one or more members to a set (members given as an array)
StoreRedis.prototype.setAdd = function(key, members) {
  members.unshift(key)
  return this.run('sadd', utils.serialize(members));
};


// #### function sortedAdd
// Add one or more members to a sorted set, or update its score if it already exists.
// Members consists of array [score1, member1, score2, member2, ...]
// NOTE: this function must adhere to sorted function requirements (see intro)
StoreRedis.prototype.sortedAdd = function(key, members) {
  members.unshift(key);
  return this.run('zadd', utils.serialize(members));
};


// #### function priorityAdd
// Performs a sortedAdd properly reversing priority order as needing by Redis. If the order
// is not reversed, we encounter FIFO/LIFO problems with the queue.
StoreRedis.prototype.priorityAdd = function(key, members) {
  for (var i = 0, len = members.length - 1; i < len; i += 2) members[i] = -1 * members[i];
  return this.sortedAdd(key, members);
}


// #### function expire
// Set a key's time to live in seconds
StoreRedis.prototype.expire = function(key, seconds) {
  return this.run('expire', [key, seconds]);
};


// #### function blockPop
// Remove and get the first element in a list, or block until one is available.
// Keys should be an array and timeout an integer.
StoreRedis.prototype.blockPop = function(keys, timeout) {
  if (!Array.isArray(keys)) keys = [keys];
  keys.push(timeout);
  return this.run('blpop', keys);
}


// #### function sortedPop
// Pops the element with the lower score from a sorted set atomically.
// NOTE: this function must adhere to sorted function requirements (see intro)
// Pop must be done with negative priorities to prevent LIFO instead of FIFO
StoreRedis.prototype.sortedPop = function(key) {

  var deferred = when.defer();

  // Set up and store callback function
  var cb = function(err, results) {
    if (err) return deferred.reject(err);
    return deferred.resolve(results);
  }

  this.client.multi()
  .zrange(key, 0, 0)
  .zremrangebyrank(key, 0, 0)
  .exec(function(err, res){
    if (err) return cb(err, null);
    cb(null, [res[0][0], res[1]]);  // input is [[id], priority], return [id, priority]
  });

  return deferred.promise;
}


// #### function publish
// Post a message to a channel.
StoreRedis.prototype.publish = function(channel, message) {
  return this.run('publish', [channel, message]);
}


module.exports = Store;
