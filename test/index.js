
var TaskCo = require('../index.js').setup();
// var worker = require('./worker');

var processEmail = function(task, done) {
  console.log('PROCESSING JOB', task.id);
  setTimeout(done, 500);
}


TaskCo.addProcedure('email', processEmail);

TaskCo.addTeam('email', 1, function(err, team) { team.start(); });

// TaskCo.quickTask

var id;

// setTimeout(function() {

//   TaskCo.createTask('email', {}).then(function(task) {

//     // Store task id
//     id = task.id;

//     // Attach listeners
//     task.on('complete', function() {
//       console.log("completed");
//       // Free memory
//       task = null;
//     });

//     // Save
//     task.save();
//   });

// }, 500)


setTimeout(function() {

  for (var i = 0; i < 10; ++i) {
    TaskCo.shortcut('email', {}).then(function(id) {
      console.log('TASK CREATED WITH ID', id);
    });
  }

}, 500)



setTimeout(function() {

  TaskCo.shortcut('email', {}).then(function(id) {

  });

}, 5000);