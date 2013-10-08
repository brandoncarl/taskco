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

  var name = team.name;
  this.waitlist[name] = this.waitlist[name] || [];

  if (this.waitlist[name].length)
    return this.waitlist[name].push(team);

  this.waitlist[name].push(team);
  this.getNextJob(name);
}


// #### function getNextJob
// Checks for the next job of a particular type.
Manager.prototype.getNextJob = function(name) {

  var self = this;

  this.getClient(name, function(name, client) {

    client.blpop(self.prefix + 'tasks:' + name , 0, function(err) {

      // !!! RECORD ERROR HERE
      // if (err) return team.process(err);
      var key = self.prefix + 'tasks:' + name + ':waiting';
      zpop(client, key, function(err, id) {
        // !!! RECORD ERROR HERE
        // if (err) return team.process(err);
        // if (!id) return team.process(null);

        if (self.waitlist[name].length) {
          var team = self.waitlist[name].shift();
          team.process(id);

          if (self.waitlist[name].length)
            process.nextTick(function(){ self.getNextJob(name); });
        }
      });
    });
  });

}


// #### function getClient
// Provides access to procedure-specific clients
Manager.prototype.getClient = function(name, done) {

  var client = this.clients[name],
      self = this;

  if (client) return done(name, client)

  this.factory.broker.spawn(function(client) {
    self.clients[name] = client;
    self = null;
    done(name, client);
  });
}


exports = module.exports = Manager;
