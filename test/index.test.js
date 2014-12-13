var test = require('tape');
var monitor = require('./monitor');
var Concurrent = require('..');
var util = require('util');
var queue = require('queue-async');

test('reaches desired concurrency', function(t) {
  function TestStream(concurrency, delay, options) {
    this.monitor = monitor();
    this.delay = Number(delay);
    Concurrent.call(this, concurrency, options);
  }

  util.inherits(TestStream, Concurrent);

  TestStream.prototype._process = function(chunk, enc, callback) {
    this.monitor.process(this.delay, callback);
  };

  var testStream = new TestStream(10, 1000);

  function write(chunk, callback) {
    setTimeout(function() {
      testStream.write(chunk.toString());
      callback();
    }, 100);
  }

  var q = queue(1);
  for (var i = 0; i < 50; i++) q.defer(write, i);
  q.await(function() {
    t.equal(testStream.monitor.concurrency(), 10, 'hit desired concurrency');
    testStream.on('data', function(d) {
      console.log(d);
    });
    testStream.monitor.close();
    testStream.end();
    t.end();
  });
});
