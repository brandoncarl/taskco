
/*

  ### Introduction
  The Worker module is used to set up traditional task templating.

*/



// ### Dependencies


function Worker(procedure, id) {
  this.procedure = procedure;
  this.id = id;
}


exports = module.exports = Worker;
