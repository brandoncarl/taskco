
/*

  ### Introduction
  The Factory module adds procedures, houses teams and appoints managers.

*/



// ### Dependencies
var async        = require('async'),
    _            = require('lodash-node'),
    EventEmitter = require('events').EventEmitter,
    Broker       = require('./broker'),
    Manager      = require('./manager'),
    Procedure    = require('./procedure'),
    Task         = require('./task'),
    Team         = require('./team'),
    Worker       = require('./worker');


function Factory(name, settings, auth, done) {

  var self = this;

  this.name = name;
  this.prefix = "tc:" + name + ":";
  this.broker = new Broker(settings, auth);
  this.teams = {};
  this.procedures = {};

  this.broker.connect(function(client) {
    self.manager = new Manager(self);
    self.client = client;
  });

}


Factory.prototype.__proto__ = EventEmitter.prototype;


// #### function addTeam
// Accepts a name (string) and array of procedure names [string]
Factory.prototype.addTeam = function(name, procedure) {

  this.teams[name] = new Team(this, name, this.procedures[name]);
  this.teams[name].on('available', this.manager.delegate.bind(this.manager));

  return this.teams[name];
}


// #### function addProcedure
Factory.prototype.addProcedure = function(name, work, settings) {
  this.procedures[name] = new Procedure(this.prefix, name, work, settings);
  return this;
}


// #### function getNextId
// Provides the next available id for a particular category
// Sample categories might include team numbers or job numbers.
Factory.prototype.getNextId = function(name, done) {
  this.client.hincrby(this.prefix + 'counters', name, 1, done);
}



// #### function createTask
// Assigns a task an id and returns the task. Predecessory to saveTask.
Factory.prototype.createTask = function(name, data, options, done) {

  if ('function' == typeof options) {
    done = options;
    options = {};
  }

  Task.create(this, name, this.procedures[name], data, options, done);
}


// #### function saveTask
// Saves the task to the store.
Factory.prototype.saveTask = function(task) {
  task.save();
}



// #### function onboard
// Creates the necessary toolings for to onboard a team. This includes assigning
// an id to a team, watching for its events, and setting up its queue.
Factory.prototype.onboard = function(team, done) {

  var prefix = this.prefix + 'teams:' + team.name,
      client = this.client;

  this.getNextId('team', function(err, id) {

    async.parallel([
      function(next) { client.sadd(prefix, id, next); },
      function(next) { client.hmset(prefix + ':' + id, team, next); }
    ],

    function(err, results) {
      client = null;
      console.log('all set up');
    });

  });

}



// Expose the factory
exports = module.exports = Factory;
