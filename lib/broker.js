"use strict";

/*

  ### Introduction
  The Broker module manages a Factory's client singletons for both standard and
  PubSub connections.

  The connection should be instantiated with connection settings, authentication
  params, and a callback if authentication is occurring.

  Pool documentation can be found at: https://github.com/coopernurse/node-pool

  !!! Should eventually handle disconnects and reconnects gracefully.

*/

function noop() {}


// ### Dependencies
// Specify your desired transport here.
var when = require('when'),
    Pool = require('generic-pool');



// ### Broker Class
// Settings include transport-dependent settings. auth includes passcode credentials.
function Broker(cxnSettings, poolSettings) {

  // Set up transport and default to redis
  if ("string" == typeof cxnSettings) cxnSettings = { uri : cxnSettings };
  cxnSettings = cxnSettings || {};
  cxnSettings.transport = cxnSettings.transport || 'redis';

  this.transport = new (require('./transports/transport-' + cxnSettings.transport.toLowerCase()))(cxnSettings);

  // Store parameters
  this.poolSettings = poolSettings || { min : 2, max : 5 };

  // Set up creation/destruction methods
  this.poolSettings.create = this.transport.createConnection.bind(this.transport);
  this.poolSettings.destroy = this.transport.destroyConnection.bind(this.transport);

  // Create pool
  this.pool = Pool.Pool(this.poolSettings);
}


// #### function acquire
// Convenience function to access the pools of the transport
Broker.prototype.acquire = function() {
  var deferred = when.defer();

  this.pool.acquire(function(err, client) {
    if (err) return deferred.reject(err);
    return deferred.resolve(client);
  });

  return deferred.promise;
}



// #### function release
// Convenience function to release the pools of the transport
Broker.prototype.release = function(client) {
  return this.pool.release(client);
}


// #### function connect
// Manages connections and callbacks if necessary
// Broker.prototype.connect = function(done) {

//   var self = this;
//   done = done || noop;

//   this.spawn(function(client) {
//     self.client = client;
//     self = null;
//     done(client);
//   });

// }


// #### function spawn
// Creates a new connection (e.g. on behalf of workers)
// Broker.prototype.spawn = function(done) {

//   var client = new Transport(this.cxnSettings);

//   if ("undefined" != typeof client.password)
//     client.client.auth(client.password);

//   done(client);
// }


// #### function client
// Creates or returns the client singleton
// Broker.prototype.client = function() {
//   return this.client || (this.client = this.connect());
// }


// #### function pubsub
// Creates or returns the pubsub singleton
// Broker.prototype.pubsub = function() {
//   return this.pubsub || (this.pubsub = this.connect());
// }



exports = module.exports = Broker;
