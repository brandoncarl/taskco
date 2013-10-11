
2013-10-11
==================
* Fixes reference problem in Monitor.findExists
* Adds Task.info
* Fixes uid additional and removal problems in Task
* Fixed "this" vs "self" reference in Team.heartbeat
* Fixed task with uid in Tasks.uidFunctions
* Fixed error handling in Procedure constructor
* Bug fixes in Monitor (incorrect findId call, missing proxy)
* Reordered tasks in Factory to tie to reality better
* Factory.addProcedure now actually returns procedure
* Removed unused callback from Factory constructor
* Enabled Company.addFactor to add settings without name
* Renamed Factory.shortcut to Factory.quickEntry
* Adds devDependencies for testing
* Set up test directory structure


2013-10-10
==================
* Adds complete and failure events to task
* Consolidates complete/failure functions. Adds progress function.
* Adds task activate and deactivate functions
* Added metadata to task and wrapped options into it
* Began documentation process
* Promisified most things