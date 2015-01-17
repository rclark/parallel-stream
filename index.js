var stream = require('stream');
var util = require('util');
var queue = require('basic-queue');

module.exports = Parallel;

util.inherits(Parallel, stream.Transform);
function Parallel(concurrency, options) {
  concurrency = Number(concurrency) || 1;

  var _this = this;
  this.concurrentBuffer = [];
  this.concurrentBuffer.highWaterMark = 2 * concurrency;
  this.concurrentQueue = new queue(this._processChunk.bind(this), concurrency);
  this.concurrentQueue.on('error', function(err) {
    _this._errored = true;
    _this.emit('error', err);
  });

  stream.Transform.call(this, options);
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
  var _this = this;

  if (this.concurrentBuffer.length >= this.concurrentBuffer.highWaterMark) {
    return setImmediate(function() {
      _this._transform(chunk, enc, callback);
    });
  }

  this._preprocess(chunk, enc);
  for (var i = 0; i < this.concurrentBuffer.length; i++) {
    this.concurrentQueue.add();
  }
  callback();
};

Parallel.prototype._flush = function(callback) {
  var remaining = this.concurrentBuffer.length;
  for (var i = 0; i < remaining; i++) {
    this.concurrentQueue.add(this);
  }

  if (this.concurrentQueue.running === 0) return callback();

  var _this = this;
  this.concurrentQueue.on('empty', function() {
    callback(_this._errored ? new Error('Encountered an error') : null);
  });
};

Parallel.prototype._processChunk = function(_, callback) {
  var data = this.concurrentBuffer.shift();
  if (!data) return callback();
  this._process(data, null, callback);
};
