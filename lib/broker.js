"use strict";

/*

  ### Introduction
  The Broker module manages a Factory's client singletons for both standard and
  subscription connections.

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
// Parameters include connection settings and pool settings.
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


// #### function getSubscriber
// Creates or returns the subscribe singleton
Broker.prototype.getSubscriber = function() {

  if (!!this.subscriber) return when.resolve(this.subscriber);

  var self = this,
      deferred = when.defer();

  this.transport.createConnection(function(err, connection) {
    if (err) return deferred.reject(err);
    self.subscriber = connection.client;
    deferred.resolve(self.subscriber);
  });

  return deferred.promise;

}


exports = module.exports = Broker;
