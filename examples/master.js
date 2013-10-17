
// Process #1 (parent)
var TaskCo = require('../').setup();


TaskCo.createTask('email', { name : "Whoop" }).then(function(task) {

  task.on('alert', function(msg) {
    console.log("ALERT", msg);
  });

  task.save();

});