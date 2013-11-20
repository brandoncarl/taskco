
// Helper function to convert a Lua script passed via the command line
// Filename should be entered without directory: e.g. tidy.lua

var fs = require('fs'),
    path = require('path'),
    filename = path.join(__dirname, process.argv[2]),
    file,
    lines;

file = fs.readFileSync(filename, 'utf8');
lines = file.split('\n');

for (var i = lines.length - 1; i >= 0; i--) {
  if ("" == lines[i] || /^\s*\-\-/.test(lines[i]))
    lines.splice(i,1);
}

for (var i = 0; i < lines.length - 1; ++i) lines[i] += " \\";
lines[0] = "'" + lines[0];
lines[i] += "'";

console.log("\nCOPY THE FOLLLOWING LINES INTO SCRIPTS.JS\n");
console.log(lines.join("\n"));
