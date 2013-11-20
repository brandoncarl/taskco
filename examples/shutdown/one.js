
// Process #1
var colors = require('colors'),
    TaskCo = require('../../').setup(),
    runs = 10,
    pre = "#1 ".cyan;


var processEmail = {
  work: function(task, done) {
    console.log(pre + 'Starting task'.grey, task.id.toString().bold)
    task.on('success', function() {
      console.log(pre + 'Completed task!'.green, task.id.toString().bold)
    });

    // Longer timeout to cause stuck tasks
    setTimeout(done, 5000);
  }
};


// Create tasks and then shut down the process in the middle
// of procesing them
setTimeout(function() {
  for (var i = 0; i < runs; ++i) {
    TaskCo.quickEntry('email', {}).then(function(task) {
      console.log(pre + 'Task created with id'.grey, task.id.toString().bold);
    });
  }

  setTimeout(function() {
    console.log(pre + "SHUT DOWN COMMENCING".bold.red)
    TaskCo.shutdown(5).ensure(function() {
      console.log(pre + "SHUT DOWN COMPLETED".red)
    });

    setTimeout(function() { process.exit() }, 5000);
  }, 200);
}, 500);