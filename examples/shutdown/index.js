
// Example demonstrating graceful shutdown

var fork = require('child_process').fork;

fork(__dirname + '/one.js');
fork(__dirname + '/two.js');