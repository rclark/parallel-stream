var stream = require('stream');
var util = require('util');
var queue = require('queue-async');

module.exports = Concurrent;

util.inherits(Concurrent, stream.Transform);
function Concurrent(concurrency, options) {
  stream.Transform.call(this, options);

  concurrency = Number(concurrency) || 1;
  this.concurrentQueue = queue(concurrency);
  this.concurrentBuffer = [];
  this.concurrentBuffer.highWaterMark = 2 * concurrency;
}

// Override _process in your implementation. Otherwise this is a pass-through
Concurrent.prototype._process = function(chunk, enc, callback) {
  this.push(chunk);
  callback();
};

// Optionally, override _preprocess to perform any pre-processing steps that may
// convert an incoming chunk into one or more processing jobs. You must push
// each chunk to be processed into the internal buffer
Concurrent.prototype._preprocess = function(chunk, enc) {
  this.concurrentBuffer.push(chunk);
};

// Do not override _tranform and _flush functions
Concurrent.prototype._transform = function(chunk, enc, callback) {
  var stream = this;

  if (this.concurrentBuffer.length >= this.concurrentBuffer.highWaterMark) {
    return setImmediate(function() {
      stream._transform(chunk, enc, callback);
    });
  }

  this._preprocess(chunk, enc);
  this.concurrentQueue.defer(processChunk, this, enc);
  callback();
};

Concurrent.prototype._flush = function(callback) {
  this.concurrentQueue.await(callback);
};

function processChunk(stream, enc, done) {
  var data = stream.concurrentBuffer.shift();
  if (!data) return done();

  stream._process(data, enc, function(err) {
    if (err) stream.emit('error', err);
    done(err);
  });
}
