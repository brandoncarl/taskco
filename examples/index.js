
// Using URL
// var config,
//     url = require('url'),
//     redisURL = "redis://rediscloud:...";
//     redisURL = url.parse(redisURL);

// config = {
//   hostname : redisURL.hostname,
//   port     : redisURL.port,
//   options  : { no_ready_check : true }
// };

// var redisURL = "redis://rediscloud:...";
// var TaskCo = require('../index.js').setup(redisURL);


// Local
var TaskCo = require('../index.js').setup()


console.time('tasks');
var i = 0; runs = 10;

var processEmail = {

  // Sample custom event
  alert: function(text) {
    // console.log(text);
  },


  work: function(task, done) {
    // task.emit('alert', 'Hi there!');

    task.on('success', function() {
      console.log('Completed task!', task.id)
      // task.off();
      if (++i == runs) console.timeEnd('tasks');
    });

    setTimeout(done, 50);
  },

};


TaskCo.addProcedure('email', processEmail, { removeAfter : 5 }).andTeam(3);

// TaskCo.addTeam('email', 1);

setTimeout(function() {

  for (var i = 0; i < runs; ++i) {
    TaskCo.quickEntry('email', {}).then(function(task) {
      console.log('TASK CREATED WITH ID', task.id);
    }, function(err) {
      console.log("PROBLEM!", err)
    });
  }

}, 500);
