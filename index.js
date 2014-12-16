var stream = require('stream');
var util = require('util');
var queue = require('queue-async');

module.exports = Parallel;

util.inherits(Parallel, stream.Transform);
function Parallel(concurrency, options) {
  stream.Transform.call(this, options);

  concurrency = Number(concurrency) || 1;
  this.concurrentQueue = queue(concurrency);
  this.concurrentBuffer = [];
  this.concurrentBuffer.highWaterMark = 2 * concurrency;
}

// Override _process in your implementation. Otherwise this is a pass-through
Parallel.prototype._process = function(chunk, enc, callback) {
  this.push(chunk);
  callback();
};

// Optionally, override _preprocess to perform any pre-processing steps that may
// convert an incoming chunk into one or more processing jobs. You must push
// each chunk to be processed into the internal buffer
Parallel.prototype._preprocess = function(chunk, enc) {
  this.concurrentBuffer.push(chunk);
};

// Do not override _tranform and _flush functions
Parallel.prototype._transform = function(chunk, enc, callback) {
  var stream = this;
  stream._priorEncoding = enc;

  if (this.concurrentBuffer.length >= this.concurrentBuffer.highWaterMark) {
    return setImmediate(function() {
      stream._transform(chunk, enc, callback);
    });
  }

  this._preprocess(chunk, enc);
  for (var i = 0; i < this.concurrentBuffer.length; i++) {
    this.concurrentQueue.defer(processChunk, this, enc);
  }
  callback();
};

Parallel.prototype._flush = function(callback) {
  var remaining = this.concurrentBuffer.length;

  for (var i = 0; i < remaining; i++) {
    this.concurrentQueue.defer(processChunk, this, this._priorEncoding);
  }

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
