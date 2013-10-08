
var TaskCo = require('../index.js').setup();
// var worker = require('./worker');

var processEmail = function(data, done) {
  console.log('processing');
  done()
}


TaskCo.addProcedure('email', processEmail);

TaskCo.addTeam('email', function() { this.start(); });

setTimeout(function() {
  TaskCo.createTask('email', {}, function(task) {
    console.log(task);
  });
}, 500)

setTimeout(function() {
  TaskCo.createTask('email', {}, function(task) {
    console.log(task);
  });
}, 1500)
