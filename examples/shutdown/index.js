
// Example demonstrating graceful shutdown
// 10 tasks should be created. 3 should be completed by #1, and 3 should
// be unfinished when process exists. #2 should pick up the slack for all of them.

var fork = require('child_process').fork;

fork(__dirname + '/one.js');
fork(__dirname + '/two.js');