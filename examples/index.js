
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


// client = redis.createClient redisURL.port, redisURL.hostname, {no_ready_check: true}
// client.auth redisURL.auth.split(":")[1]


var processEmail = {

  // Sample custom event
  alert: function(text) {
    console.log(text);
  },


  work: function(task, done) {
    task.emit('alert', 'Hi there!');

    task.on('complete', function() {
      console.log('Completed task!')
      task.off();
    });

    setTimeout(done, 500);
  },

};


TaskCo.addProcedure('email', processEmail, { removeAfter : 5 }).andTeam(3);

// TaskCo.addTeam('email', 1);

setTimeout(function() {

  for (var i = 0; i < 10; ++i) {
    TaskCo.quickEntry('email', {}).then(function(task) {
      console.log('TASK CREATED WITH ID', task.id);
    });
  }

}, 500);
