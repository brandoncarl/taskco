
0.2.3 / 2013-10-21
==================
* Moves task cleanup logic from worker to task
* Moves team autostart to Factory.addTeam (prevents race conditions)


0.2.2 / 2013-10-18
==================
* Changed Dispatcher#broadcast(id, event) to (event, id)
* Binds appropriate Dispatcher functions in-module rather than out-of-module
* Switches sortedAdd/sortedPop order in order to fix LIFO problem
* Adds race condition example (demonstrates breaking)
* Cleans up remaining noop and done calls/declarations
* Adds extensive argument polymorphism: many fxn can accept client + factory
* Eliminates calls to "run" and Factory.run (was causing binding problems)
* Binds transport-redis functions to self


0.2.1 / 2013-10-18
==================
* Adds "priority" feature and updates Readme
* Fixed another "subcriber" typo in Dispatcher.constructor


0.2.0 / 2013-10-18
==================
MAJOR RENAMING: GOAL IS INTUITIVE, CONSISTENT FUNCTION NAMES
* Renamed "finish" event to "end"
* Procedure.andTeam now returns the team created
* Renames factory.client to getClient
* Renames "sub" to "subscriber" (and corresponding functions)
* Renames Dispatcher.digest to routeMessage
* Renames Dispatcher.dispatch to broadcast
* Renames Dispatcher{watch, ignore} to watchTask and ignoreTask
* Removes "done" references from Company
* Renames "localBind" to "bindLocal"
* Removes progress binding in Worker.work
* Renames "settings" variables to cxnSettings, and auth" to poolSettings


0.1.3 / 2013-10-17
==================
* Adds local vs global binding abilities


0.1.2 / 2013-10-17
==================
* Renamed complete event to success
* Fixes problem where expiration didn't work across processes
* Bug fixes in dispatcher
* Moves worker "complete" and "failure" to single "finished" event


0.1.1 / 2013-10-16
==================
* Adds task on/broadcast functionality
* Added publish to transport-redis
* Added master/slave example
* Changes pubSub language to "sub" (publish clients are separate)
* Adds basic dispatch functions
* Allows for errors in transport-redis.createConnection
* Adds pubSub to Broker, cleans up legacy code


0.1.0 / 2013-10-15
==================
 * Fixes auth connection string problem with transport-redis
 * Refactors dispatcher and fixes memory leak in getNextJob
 * Cleans up console.log and whitespace
 * Switches Manager to Dispatcher (more appropriate name), binds delegate function
 * Initial refactoring of team/worker
 * Inserts missing variable in sequence call
 * Deleted unused functions from task/tasks
 * Better documentation for task.js
 * Refactoring of tasks
 * Utilizes pooled connections
 * Adds expiration to teams that don't check in
 * Fixes bug in Task defaults/options
 * Adds failure messages


0.0.5 / 2013-10-12
==================
* Fixes serialization in hashSet
* Fixes typos in Task.progress


0.0.4 / 2013-10-12
==================
* Adds error handling to Factory.quickEntry
* Removes required procedure for task creation
* Adds auto-serialization to TransportRedis


0.0.3 / 2013-10-12
==================
 * Adds string parsing to transport-redis
 * Procedure has "andTeam" chaining
 * lacksTask now rejects with id vs error


0.0.2 / 2013-10-12
==================
 * Provides small redis url example and improves transport-redis arguments
 * Improves broker auth race condition (hard to circumvent)
 * Extracts out Transport layer functions (to allow different Transports)


0.0.1 / 2013-10-11
========================
 * Removes callback from Factory.reserveTaskId
 * Updates example for new form of quickEntry
 * Ensures that progress maxes out at 100
 * More extensive factory testing
 * Changes uid hash to not store type
 * Changes quickEntry to return task
 * Switches find to findExists in Factory.lacksTask
 * Fixes reference problem in Monitor.findExists
 * Adds Task.info
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
 * Adds complete and failure events to task
 * Consolidates complete/failure functions. Adds progress function.
 * Adds task activate and deactivate functions
 * Added metadata to task and wrapped options into it.
 * Moves Team creation to Team from Factory, adds "heartbeat" to team
 * Changes Team.process to Team.delegate
 * Small formatting fixes
 * Promisifies tasks
 * Promisifies task
 * Promisifies factory module
 * Formatting fixes
 * Adds task expiration (auto-removal)
 * Adds task completion/failure
 * Fixes some team serialization problems
 * Adds event handling to worker
 * Changes "job" to "task" (for consistency)
 * Changes "name" in manager to "type" (for consistency)
 * Adds initial support for custom events
 * Updates casing of title
 * Creates README
 * Adds TaskCo jpg
 * Begin separation of Tasks/Monitoring
 * Adds sketch diagram
 * Adds strict mode
 * irresponsibly large number of changes
 * increased formality to structure