"use strict";

/*

  ### Introduction
  The Transport module may eventually allow different interfaces to be set up. For now, we
  stick with standard Redis commands.

*/


// ### Dependencies
var redis = require('redis');


// ### Client instantiation
exports.createClient = function(args) {
  return redis.createClient(args.port || 6379, args.host || '127.0.0.1', args.options || {});
}
