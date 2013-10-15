
// Process #1 (parent)
var TaskCo = require('../').setup();

// Create task
TaskCo.quickEntry('email', { name : 'hello@gmail.com' });
