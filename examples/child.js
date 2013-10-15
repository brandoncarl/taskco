
// Process #2 (child)
var TaskCo = require('../').setup();


// A procedure must have a work function
var processEmail = {
  work: function(task, done) {
    console.log(task.data.name);
    done();
  }
}

// Add the team
TaskCo.addProcedure('email', processEmail, { removeAfter : 5 }).andTeam(3);