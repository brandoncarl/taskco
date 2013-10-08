
/*

  ### Introduction
  The Task module is used to set up traditional task templating.

*/



// ### Dependencies



function Task(factory, id, name, procedure, data, options) {
  this.factory = factory;
  this.id = id;
  this.name = name;
  this.procedure = procedure;
  this.data = data;
  this.options = options;

  // Created date, etc? metadata
}


Task.prototype.start = function(data) {
  this.procedure.work(data, function() {
    console.log('finished');
  });
}


Task.prototype.toObject = Task.prototype.toJSON = function() {

}


Task.prototype.save = function(done) {
  var client = this.factory.client;



  this.factory.addTask(this.toObject());
}


exports.create = function(factory, name, procedure, data, options, done) {
  factory.getNextId('task', function(err, id) {
    done(new Task(factory, id, name, procedure, data, options));
  });
}
