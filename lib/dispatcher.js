"use strict";

/*

  ### Introduction
  The Dispatcher module to monitor tasks and respond to worker requests for
  more work.

*/



// ### Dependencies
var when = require('when'),
    sequence = require('when/sequence');



// #### function delegate
// Waits for work and assigns it when available.
function delegate(team) {

  var type = team.name;
  this.waitlist[type] = this.waitlist[type] || [];

  if (this.waitlist[type].length)
    return this.waitlist[type].push(team);

  this.waitlist[type].push(team);
  this.getNextJob(type);

}



function Dispatcher(factory) {
  this.factory = factory;
  this.prefix = factory.prefix;
  this.waitlist = {};
  this.delegate = delegate.bind(this);
}



// #### function getNextJob
// Checks for the next job of a particular type.
Dispatcher.prototype.getNextJob = function(type) {

  var p, q,
      self      = this,
      release   = this.factory.release.bind(this.factory),
      masterKey = this.prefix + 'tasks:' + type,
      waitKey   = this.prefix + 'tasks:' + type + ':waiting',

      blockPop  = function(c) { return c.blockPop(masterKey, 0); },
      sortedPop = function(c) { return c.sortedPop(waitKey); },
      getTask   = function(c) { return sequence([blockPop, sortedPop], c); },

      runTask   = function(res) {
        var id = res[1];

        if (self.waitlist[type].length) {
          var team = self.waitlist[type].shift();
          team.delegate(id);

          if (self.waitlist[type].length)
           process.nextTick(function(){ self.getNextJob(type); });
        }

        return when.resolve();
      };

  p = this.factory.client().then(function(c) {
    q = getTask(c).then(runTask);
    q.ensure(function() { release(c); });
    return q;
  });

  // WHAT ABOUT RELEASING SELF/RELEASE HERE?
  // p.ensure(function() { release = null; self = null; });

  return p;

}


exports = module.exports = Dispatcher;
