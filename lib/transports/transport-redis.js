"use strict";

/*

  ### Introduction
  The Transport module allows different interfaces to be set up.

  They must have the following functions.
  * constructor
  * run
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
  * expire

*/


// ### Dependencies
var when = require('when'),
    redis = require('redis');


// exports.blockPop

function TransportRedis(args) {
  this.client = redis.createClient(args.port || 6379, args.host || '127.0.0.1', args.options || {});
}


// #### function run
// Helper function to wrap commands in promises.
TransportRedis.prototype.run = function(command) {

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


// #### function hashIncrement
// Increment the integer value of a hash field by the given number.
TransportRedis.prototype.hashIncrement = function(key, field, increment) {
  return this.run('hincrby', [key, field, increment]);
};


// #### function hashGet
// Get the value of a hash field.
TransportRedis.prototype.hashGet = function(key, field) {
  return this.run('hget', [key, field]);
};


// #### function hashGetAll
// Get all the fields and values in a hash.
TransportRedis.prototype.hashGetAll = function(key) {
  return this.run('hgetall', [key]);
};


// #### function hashSet
// Set the string value of a hash field.
TransportRedis.prototype.hashSet = function(key, field, value) {
  return this.run('hset', [key, field, value]);
};


// #### function hashMultiSet
// Set multiple field values based on an object.
TransportRedis.prototype.hashMultiSet = function(key, obj) {
  return this.run('hmset', [key, obj]);
};


// #### function hashUnset
// Delete one or more hash fields (fields are given as an array).
TransportRedis.prototype.hashUnset = function(key, fields) {
  fields.unshift(key)
  return this.run('hdel', fields);
};


// #### function prepend
// Prepend one or multiple values to a list (values given as an array).
TransportRedis.prototype.prepend = function(key, values) {
  values.unshift(key)
  return this.run('lpush', values);
};


// #### function push
// Append one or multiple values to a list.
TransportRedis.prototype.push = function(key, values) {
  values.unshift(key)
  return this.run('rpush', values);
};


// #### function setAdd
// Add one or more members to a set (members given as an array)
TransportRedis.prototype.setAdd = function(key, members) {
  members.unshift(key)
  return this.run('sadd', members);
};


// #### function sortedAdd
// Add one or more members to a sorted set, or update its score if it already exists.
// Members consists of array [member1, score1, member2, score2, ...]
TransportRedis.prototype.sortedAdd = function(key, members) {
  members.unshift(key);
  return this.run('zadd', members);
};


// #### function expire
// Set a key's time to live in seconds
TransportRedis.prototype.expire = function(key, seconds) {
  return this.run('expire', [key, seconds]);
};



module.exports = TransportRedis;
