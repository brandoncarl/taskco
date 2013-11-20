
// Example that creates a locking condition - appears to be solved

// Local
var TaskCo = require('../../').setup();

// THIS EXAMPLE CREATES A LOCKING CONDITION AT TASK 599;
console.time('tasks');
var i = 0; runs = 1000;

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

  for (var i = 0; i < 100; ++i) {
    TaskCo.quickEntry('email', { uid : "Hello" + i }).then(function(task) {
      console.log('TASK CREATED WITH ID', task.id);
    }, function(err) {
      console.log("PROBLEM!", err)
    });
  }

}, 500);

setTimeout(function() {

  for (var i = 501; i < runs; ++i) {
    TaskCo.quickEntry('email', { uid : "Hello" + i }).then(function(task) {
      console.log('TASK CREATED WITH ID', task.id);
    }, function(err) {
      console.log("PROBLEM!", err)
    });
  }

}, 3000);
