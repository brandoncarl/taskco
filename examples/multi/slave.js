
// Process #2 (child)
var colors = require('colors'),
    TaskCo = require('../../').setup(),
    pre = "#2 ".cyan;


// A procedure must have a work function
var processEmail = {

  alert: function(msg) {
    console.log(pre + "ALERT", msg);
  },

  success: function() {
    console.log(pre + "We did it!")
  },

  work: function(task, done) {
    console.log(pre + task.data.name);
    task.broadcast('alert', "Hi there you!");
    done();
  }
}

// Add the team
TaskCo.addProcedure('email', processEmail, { removeAfter : 5 }).andTeam(3);