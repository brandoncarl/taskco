

// Chai test suite
global.chai = require('chai');
chai.use(require("chai-as-promised"));
global.should = chai.Should();
global.expect = chai.expect;
global.assert = chai.assert;


var redis = require('redis'),
    redisClient = redis.createClient();

global.flushRedis = function(done) { redisClient.flushall(done); };


// Components
global.TaskCo  = require('../../index.js').setup(),
global.Factory = require('../../lib/factory.js');
global.Procedure = require('../../lib/procedure.js');

