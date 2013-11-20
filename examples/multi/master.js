
// Process #1 (parent)
var colors = require('colors'),
    TaskCo = require('../../').setup(),
    pre = "#1 ".cyan;


// Cross-process bindings must occur within the "createTask" framework.
TaskCo.createTask('email', { name : "Whoop" }).then(function(task) {

  task.on('alert', function(msg) {
    console.log(pre + "ALERT", msg);
  });

  task.save();

});