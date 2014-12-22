var test = require('tape');
var monitor = require('./monitor');
var Parallel = require('..');
var util = require('util');
var queue = require('queue-async');
var stream = require('stream');

util.inherits(TestStream, Parallel);
function TestStream(concurrency, delay, options) {
  this.monitor = monitor();
  this.delay = Number(delay);
  Parallel.call(this, concurrency, options);
}
TestStream.prototype._process = function(chunk, enc, callback) {
  var _this = this;
  var finished = function(err, result) {
    _this.push(result);
    callback();
  };
  this.monitor.process(chunk, this.delay, finished);
};

util.inherits(Readable, stream.Readable);
function Readable() {
  this.chunk = 0;
  stream.Readable.call(this);
}
Readable.prototype._read = function(size) {
  var stream = this;

  var chunk = this.chunk;
  this.chunk = this.chunk + 1;

  if (this.chunk === 51) {
    stream.emit('finishWrites');
    return this.push(null);
  }

  setTimeout(function() {
    stream.push(chunk.toString());
  }, 100);
};

test('reaches desired concurrency w/writes', function(t) {
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
    testStream.on('end', function() {
      t.pass('fired end event');
      t.equal(received.length, 50, 'received all chunks');

      for (var j = 0; j < 50; j++) {
        if (received.indexOf(j) === -1) t.fail('Did not receive chunk ' + j);
      }

      t.end();
    });

    t.equal(testStream.monitor.concurrency(), 10, 'hit desired concurrency');
    testStream.end();
  });
});

test('reaches desired concurrency w/pipes', function(t) {
  var received = [];
  var readable = new Readable();
  var testStream = new TestStream(10, 1000);

  readable.on('finishWrites', function() {
    setImmediate(function() {
      t.equal(testStream.monitor.concurrency(), 10, 'hit desired concurrency');
    });
  });

  testStream.on('data', function(data) {
    received.push(Number(data.toString()));
  });

  testStream.on('end', function() {
    t.pass('fired end event');
    t.equal(received.length, 50, 'received all chunks');

    for (var j = 0; j < 50; j++) {
      if (received.indexOf(j) === -1) t.fail('Did not receive chunk ' + j);
    }

    t.end();
  });

  readable.pipe(testStream);
});
