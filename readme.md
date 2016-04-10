# parallel-stream

[![build status](https://travis-ci.org/rclark/parallel-stream.svg?branch=master)](https://travis-ci.org/rclark/parallel-stream)

Transform and writable streams capable of processing chunks concurrently.

## Usage

### transform

A concurrent transform stream

**Parameters**

-   `work` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** a function to process a single chunk. Function
    signature should be `process(chunk, enc, callback)`. When finished processing,
    fire the provided `callback`.
-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** options to pass to the transform stream. (optional, default `undefined`)
    -   `options.concurrency` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** number of chunks to process concurrently. (optional, default `1`)

**Examples**

```javascript
var parallel = require('parallel-stream');

var transform = parallel.transform(function(chunk, enc, callback) {
  processAsync(chunk)
    .on('done', function(processedData) {
      callback(null, processedData);
    });
}, { objectMode: true, concurrency: 15 });

readable.pipe(transform)
 .on('data', function(data) {
    console.log('got processed data: %j', data);
 })
 .on('end', function() {
   console.log('complete!');
});
```

Returns **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** a transform stream. **Do not** override the `._transform` function.

### writable

A concurrent writable stream

**Parameters**

-   `work` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** a function to process a single chunk. Function
    signature should be `process(chunk, enc, callback)`. When finished processing,
    fire the provided `callback`.
-   `flush` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** a function to run once all chunks have been
    processed, but before the stream emits a `finished` event. Function signature
    should be `flush(callback)`, fire the provided `callback` when complete. (optional, default `undefined`)
-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** options to pass to the writable stream. (optional, default `undefined`)
    -   `options.concurrency` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** number of chunks to process concurrently. (optional, default `1`)

**Examples**

```javascript
var parallel = require('parallel-stream');

var writable = parallel.writable(function(chunk, enc, callback) {
  processAsync(chunk)
    .on('done', callback);
}, { objectMode: true, concurrency: 15 });

readable.pipe(writable)
 .on('finish', function() {
   console.log('complete!');
});
```

Returns **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** a writable stream. **Do not** override the `._write` function.
