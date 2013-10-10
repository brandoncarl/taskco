"use strict";

/*

  ### Introduction
  The Manager module to monitor tasks and respond to worker requests for
  more work.

*/



// ### Dependencies


/**
 * Atomic ZPOP implementation.
 *
 * @param {String} key
 * @param {Function} fn
 * @api private
 */

var zpop = function(client, key, fn){
  client.multi()
  .zrange(key, 0, 0)
  .zremrangebyrank(key, 0, 0)
  .exec(function(err, res){
    if (err) return fn(err);
    var id = res[0][0];
    fn(null, id);
  });
};



function Manager(factory) {
  this.factory = factory;
  this.prefix = factory.prefix;
  this.clients = {};
  this.waitlist = {};
}


// #### function delegate
// Waits for work and assigns it when available.
Manager.prototype.delegate = function(team) {

  var type = team.name;
  this.waitlist[type] = this.waitlist[type] || [];

  if (this.waitlist[type].length)
    return this.waitlist[type].push(team);

  this.waitlist[type].push(team);
  this.getNextJob(type);
}


// #### function getNextJob
// Checks for the next job of a particular type.
Manager.prototype.getNextJob = function(type) {

  var self = this;

  this.getClient(type, function(type, client) {

    client.blpop(self.prefix + 'tasks:' + type , 0, function(err) {

      // !!! RECORD ERROR HERE
      // if (err) return team.process(err);
      var key = self.prefix + 'tasks:' + type + ':waiting';
      zpop(client, key, function(err, id) {
        // !!! RECORD ERROR HERE
        // if (err) return team.process(err);
        // if (!id) return team.process(null);

        if (self.waitlist[type].length) {
          var team = self.waitlist[type].shift();
          team.process(id);

          if (self.waitlist[type].length)
            process.nextTick(function(){ self.getNextJob(type); });
        }
      });
    });
  });

}


// #### function getClient
// Provides access to procedure-specific clients
Manager.prototype.getClient = function(type, done) {

  var client = this.clients[type],
      self = this;

  if (client) return done(type, client)

  this.factory.broker.spawn(function(client) {
    self.clients[type] = client;
    self = null;
    done(type, client);
  });
}


exports = module.exports = Manager;
