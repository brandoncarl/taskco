
// Example demonstrating errors thrown when too many teams are added
// relative to the number of available connections. Should throw an error.

var TaskCo = require('../../').setup(null, { max : 3 });

var procedure = {
  work: function(task, done) { console.log("Working..."); done(); }
};

// First team should add just fine
TaskCo.addProcedure('email', procedure).andTeam(3);

// Second team should throw error
TaskCo.addProcedure('sms', procedure).andTeam(3);
