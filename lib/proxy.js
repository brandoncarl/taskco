
/*

  ### Introduction
  The Proxy module adds promises to traditional client functions.

*/



// ### Dependencies

var when = require('when');


function noop() {}


exports.run = function(client, command) {

  var deferred = when.defer();

  // Store arguments in an array
  var args = [];
  for (var i = 2; i < arguments.length; ++i)
    args.push(arguments[i]);

  // Set up and store callback function
  var cb = function(err, results) {
    if (err) return deferred.reject(err);
    return deferred.resolve(results);
  }

  args.push(cb);

  client[command].apply(client, args)
  return deferred.promise;
}
