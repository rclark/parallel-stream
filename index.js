var stream = require('stream');
var util = require('util');
var queue = require('queue-async');

function Concurrent(concurrency, options) {
  stream.Transform.call(this, options);
  this.queue = queue(concurrency);
  this.buffer = [];
  this.buffer.highWaterMark = 2 * concurrency;
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
  this.buffer.push(chunk);
};

// Do not override _tranform and _flush functions
Concurrent.prototype._transform = function(chunk, enc, callback) {
  var stream = this;

  if (this.buffer.length >= this.buffer.highWaterMark) {
    return setImmediate(function() {
      stream._transform(chunk, enc, callback);
    });
  }

  this._preprocess(chunk, enc);
  this.queue.defer(processChunk, this, this.buffer.shift());
  callback();
};

Concurrent.prototype._flush = function(callback) {
  while (this.buffer.length) {
    this.queue.defer(processChunk, this, this.buffer.shift());
  }
  this.queue.await(callback);
};

function processChunk(stream, data, done) {
  if (!data) return done();

  stream._process(data, enc, function(err) {
    if (err) {
      stream.emit('error', err);
      done(err);
    }

    stream.queue.defer(processChunk);
    done();
  });
}
