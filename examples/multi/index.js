
// Example demonstrating basic multi-process and passing events between

var fork = require('child_process').fork;

fork(__dirname + '/master.js');
fork(__dirname + '/slave.js');