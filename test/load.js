var Parallel = require('..');
var stream = require('stream');
var crypto = require('crypto');
var util = require('util');
var test = require('tape');
var progress = require('progress-stream');

// Random data readable stream
util.inherits(Random, stream.Readable);
function Random(lineSize, linesPerRead, totalReads) {
  stream.Readable.call(this);
  this.lineSize = lineSize;
  this.linesPerRead = linesPerRead;
  this.totalReads = totalReads;
  this.count = 0;
}
Random.prototype._read = function() {
  var data = [];
  for (var i = 0; i < this.linesPerRead; i++) {
    data.push(crypto.randomBytes(Math.round(this.lineSize / 2)).toString('hex'));
  }
  this.push(data.join('\n'));

  this.count++;
  if (this.count > this.totalReads) this.push(null);
};

// Parallel stream that splits on newlines
util.inherits(Splitter, Parallel);
function Splitter(concurrency, delay) {
  this.delay = delay;
  Parallel.call(this, concurrency);
  this.written = 0;
}
Splitter.prototype._preprocess = function(chunk) {
  var lines = chunk.toString().split('\n');
  for (var i = 0; i < lines.length; i++) {
    this.concurrentBuffer.push(lines[i]);
  }
};
Splitter.prototype._process = function(chunk, enc, callback) {
  var _this = this;
  setTimeout(function() {
    _this.push(chunk);
    callback();

    _this.written++;
    _this.emit('written', _this.written);
  }, this.delay);
};

test('handles large loads and rapid writes', function(t) {
  var lineSize = 1024,
      linesPerRead = 10000,
      totalReads = 1000,
      parallelConcurrency = 100,
      delay = 1000;

  var random = new Random(lineSize, linesPerRead, totalReads);
  var splitter = new Splitter(parallelConcurrency, delay);

  splitter.on('error', function(err) { t.fail('should not error'); });
  splitter.on('end', function() {
    t.end();
  });

  var prog = progress({
    time: 100,
    length: lineSize * linesPerRead * totalReads
  }, function(p) {
    util.print(util.format('\r\033[K%s bytes written in %s writes, %s bytes/s', p.transferred, splitter.written, Math.round(p.speed)));
  });

  random.pipe(splitter).pipe(prog).resume();
});
