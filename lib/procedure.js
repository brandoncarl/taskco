
/*

  ### Introduction
  The Procedure module is used to set up template for a task.

*/



// ### Dependencies

function Procedure(prefix, name, work, settings) {
  this.prefix = prefix;
  this.name = name;
  this.work = work;
  this.defaults = settings || {};
}



exports = module.exports = Procedure;
