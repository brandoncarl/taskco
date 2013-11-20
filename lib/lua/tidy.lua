
----
--  Lua-helper for tidying code. This code is not accessed by TaskCo. Rather
--  it should be used be concatenated and inserted into scripts.js using convert.js
--
--  ** All arguments are required **
--  KEYS[1] contains purgatory (e.g. tc:def:purgatory)
--  ARGV[1] contains factory name (e.g. def)
--  ARGV[2] contains milliseconds cutoff
----

local tasks = redis.call("ZRANGE", KEYS[1], 0, ARGV[2])
local decoded, taskKey, typeKey, waitKey, metadata

taskKey = "tc:" .. ARGV[1] .. ":tasks:"

for taskCount = 1, #tasks do
  decoded = cjson.decode(tasks[taskCount])

  typeKey = taskKey .. decoded["type"]
  waitKey = typeKey .. ":waiting"

  -- retrieve task and check state
  metadata = redis.call("HGET", taskKey .. decoded["id"], "metadata")
  if metadata then
    if cjson.decode(metadata)["state"] == "active" then
      -- priority is reversed to match underlying code
      redis.call("ZADD", waitKey, -decoded["priority"], decoded["id"])
      redis.call("RPUSH", typeKey, decoded["id"])
    end
  end
end

redis.call("ZREMRANGEBYSCORE", KEYS[1], 0, ARGV[2])

return tasks

