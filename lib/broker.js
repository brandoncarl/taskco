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


// ### Dependencies
// Specify your desired store here.
var when = require('when'),
    Pool = require('generic-pool');



// ### Broker Class
// Parameters include connection settings and pool settings.
function Broker(cxnSettings, poolSettings) {

  // Set up store and default to redis
  if ("string" == typeof cxnSettings) cxnSettings = { uri : cxnSettings };
  cxnSettings = cxnSettings || {};
  cxnSettings.store = cxnSettings.store || 'redis';

  this.store = new (require('./stores/store-' + cxnSettings.store.toLowerCase()))(cxnSettings);

  // Store parameters
  // Ideally we would not require a maximum. Without this, generic-pool sets maximum to 1.
  this.poolSettings = poolSettings || { min : 3, max : 10 };
  this.parsePoolSettings();

  // Set up creation/destruction methods
  this.poolSettings.create = this.store.createConnection.bind(this.store);
  this.poolSettings.destroy = this.store.destroyConnection.bind(this.store);

  // Create pool
  this.pool = Pool.Pool(this.poolSettings);

  // Convenience function to access the pools of the store: this function intentionally
  // does not make use of promises as they cause delays during computationally intensive tasks.
  this.acquire = this.pool.acquire.bind(this.pool);

}


// #### function parsePoolSettings
// Parses shorthand entries in poolSettings such as { minMax : "3,10" }
Broker.prototype.parsePoolSettings = function() {

  // Allow minMax parameters to be passed in as a string: this facilitates using
  // environment variables to parameterize. e.g. minMax = "3,5"
  if ("undefined" != typeof this.poolSettings.minMax) {
    if ("string" == typeof this.poolSettings.minMax)
      this.poolSettings.minMax = this.poolSettings.minMax.replace(/\s/g, '').split(",");

    if (Array.isArray(this.poolSettings.minMax)) {
      this.poolSettings.min = this.poolSettings.min || this.poolSettings.minMax[0];
      this.poolSettings.max = this.poolSettings.max || this.poolSettings.minMax[1];
      delete this.poolSettings.minMax;
    }
  }
}


// #### function release
// Convenience function to release the pools of the store
Broker.prototype.release = function(client) {
  return this.pool.release(client);
}


// #### function getSubscriber
// Creates or returns the subscribe singleton
Broker.prototype.getSubscriber = function() {

  if (!!this.subscriber) return when.resolve(this.subscriber);

  var self = this,
      deferred = when.defer();

  this.store.createConnection(function(err, connection) {
    if (err) return deferred.reject(err);
    self.subscriber = connection.client;
    deferred.resolve(self.subscriber);
  });

  return deferred.promise;

}


exports = module.exports = Broker;
