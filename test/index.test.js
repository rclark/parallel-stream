var test = require('tape');
var monitor = require('./monitor');
var Parallel = require('..');
var util = require('util');
var queue = require('queue-async');

test('reaches desired concurrency', function(t) {
  function TestStream(concurrency, delay, options) {
    this.monitor = monitor();
    this.delay = Number(delay);
    Parallel.call(this, concurrency, options);
  }

  util.inherits(TestStream, Parallel);

  TestStream.prototype._process = function(chunk, enc, callback) {
    var _this = this;
    var finished = function(err, result) {
      _this.push(result);
      callback();
    };
    this.monitor.process(chunk, this.delay, finished);
  };

  var received = [];
  var testStream = new TestStream(10, 1000);
  testStream.on('data', function(data) {
    received.push(Number(data.toString()));
  });

  function write(chunk, callback) {
    setTimeout(function() {
      testStream.write(chunk.toString());
      callback();
    }, 100);
  }

  var q = queue(1);
  for (var i = 0; i < 50; i++) q.defer(write, i);
  q.await(function() {
    testStream.end();
    t.equal(testStream.monitor.concurrency(), 10, 'hit desired concurrency');
    testStream.monitor.close();
    t.equal(received.length, 50, 'received all chunks');

    for (var j = 0; j < 50; j++) {
      if (received.indexOf(j) === -1) t.fail('Did not receive chunk ' + j);
    }

    t.end();
  });
});
