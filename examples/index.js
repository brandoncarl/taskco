
var TaskCo = require('../index.js').setup();
// var worker = require('./worker');

var processEmail = {

  alert: function(text) {
    console.log(text);
  },

  work: function(task, done) {
    // task.emit('alert', 'Hi there!');
    console.log('PROCESSING JOB', task.id);
    setTimeout(done, 500);
    task.on('complete', function() {
      console.log("COMPLETED");
      task.off();
    })
  },

};


TaskCo.addProcedure('email', processEmail, { removeAfter : 5 });

TaskCo.addTeam('email', 1);

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
    TaskCo.quickEntry('email', {}).then(function(task) {
      console.log('TASK CREATED WITH ID', task.id);
    });
  }

}, 500)



setTimeout(function() {

  TaskCo.quickEntry('email', {}).then(function(id) {

  });

}, 5000);