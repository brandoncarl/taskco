
// Process #2
var colors = require('colors'),
    TaskCo = require('../../').setup(),
    pre = '#2 '.cyan;

var processEmail = {
  work: function(task, done) {
    console.log(pre + 'Starting task'.grey, task.id.toString().bold)
    task.on('success', function() {
      console.log(pre + 'Completed task!'.green, task.id.toString().bold)
    });

    setTimeout(done, 50);
  }
};


// Wait to add team (this is arbitrary and only to demonstrate task handover)
setTimeout(function() {
  TaskCo.addProcedure('email', processEmail, { removeAfter : 5 }).andTeam(3);
}, 5000);
