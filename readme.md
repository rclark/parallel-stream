# parallel-stream

[![build status](https://travis-ci.org/rclark/parallel-stream.svg?branch=master)](https://travis-ci.org/rclark/parallel-stream)

A transform stream that processes chunks concurrently. Stream order is not preserved.

## Example usage

```javascript
var Parallel = require('parallel-stream');
var util = require('util');
var fs = require('fs');

util.inherits(MyStream, Parallel);
function MyStream(concurrency, options) {
  Parallel.call(this, concurrency, options);
}

MyStream.prototype._process = function(chunk, enc, callback) {
  var _this = this;
  processChunkAsync(chunk, function(err, result) {
    if (err) return callback(err);
    _this.push(result);
    callback();
  });
}

// Process up to ten chunks simultaneously
var myStream = new MyStream(10);
fs.createReadStream('/some/file')
  .pipe(myStream)
  .pipe(process.stdout);
```
