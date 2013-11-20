"use strict";

/*

  ### Introduction
  The scripts provides Lua scripts for Redis.
  module.exports contains {scripts, shas}

*/

var _      = require('lodash-node'),
    crypto = require('crypto');

var scripts, shas;

scripts = {

  tidy : 'local tasks = redis.call("ZRANGE", KEYS[1], 0, ARGV[2]) \
          local decoded, taskKey, typeKey, waitKey, metadata \
          taskKey = "tc:" .. ARGV[1] .. ":tasks:" \
          for taskCount = 1, #tasks do \
            decoded = cjson.decode(tasks[taskCount]) \
            typeKey = taskKey .. decoded["type"] \
            waitKey = typeKey .. ":waiting" \
            metadata = redis.call("HGET", taskKey .. decoded["id"], "metadata") \
            if metadata then \
              if cjson.decode(metadata)["state"] == "active" then \
                redis.call("ZADD", waitKey, -decoded["priority"], decoded["id"]) \
                redis.call("RPUSH", typeKey, decoded["id"]) \
              end \
            end \
          end \
          redis.call("ZREMRANGEBYSCORE", KEYS[1], 0, ARGV[2]) \
          return tasks'

}

shas = _.transform(scripts, function(result, script, name) {
  var shasum = crypto.createHash('sha1');
  shasum.update(script);
  result[name] = shasum.digest('hex');
});


module.exports = { scripts : scripts, shas : shas };
