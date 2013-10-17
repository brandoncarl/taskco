
// Process #1 (parent)
var TaskCo = require('../').setup();



// Cross-process bindings must occur within the "createTask" framework.
TaskCo.createTask('email', { name : "Whoop" }).then(function(task) {

  task.on('alert', function(msg) {
    console.log("ALERT", msg);
  });

  // task.on('success', function() {
  //   console.log("SUCCESS");
  // });

  task.save();

});