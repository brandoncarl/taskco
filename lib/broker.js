
/*

  ### Introduction
  The Broker module manages a Factory's client singletons for both standard and
  PubSub connections.

  The connection should be instantiated with connection settings, authentication
  params, and a callback if authentication is occurring.

  !!! Should eventually handle disconnects and reconnects gracefully.

*/

function noop() {}


// ### Dependencies
var Transport = require('./transport');



// ### Broker Class
// Settings include transport-dependent settings. auth includes passcode credentials.
function Broker(settings, auth) {

  this.settings = settings || {};
  if ("undefined" != typeof auth) this.auth = auth;

}


// #### function connect
// Manages connections and callbacks if necessary
Broker.prototype.connect = function(done) {

  done = done || noop;
  this.spawn(function(client) {
    this.client = client;
    done(client);
  });

}


// #### function spawn
// Creates a new connection (e.g. on behalf of workers)
Broker.prototype.spawn = function(done) {

  var client = Transport.createClient(this.settings);

  if ("undefined" != typeof this.auth)
    client.auth(auth, function() { done(client); });
  else
    done(client);
}


// #### function client
// Creates or returns the client singleton
Broker.prototype.client = function() {
  return this.client || (this.client = this.connect());
}


// #### function pubsub
// Creates or returns the pubsub singleton
Broker.prototype.pubsub = function() {
  return this.pubsub || (this.pubsub = this.connect());
}



exports = module.exports = Broker;
