# concurrent-stream

![build status](https://travis-ci.org/rclark/concurrent-stream.svg?branch=master)

A transform stream that processes chunks concurrently. Stream order is not preserved.

## Example usage

```javascript
var Concurrent = require('concurrent-stream');
var util = require('util');
var fs = require('fs');

util.inherits(MyStream, Concurrent);
function MyStream(concurrency, options) {
  Concurrent.call(this, concurrency, options);
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
