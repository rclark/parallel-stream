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
-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** options to pass to the transform stream.

Returns **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** a transform stream. **Do not** override the `._transform` function.

### writable

A concurrent writable stream

**Parameters**

-   `work` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** a function to process a single chunk. Function
    signature should be `process(chunk, enc, callback)`. When finished processing,
    fire the provided `callback`.
-   `flush` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)=** a function to run once all chunks have been
    processed, but before the stream emits a `finished` event. Function signature
    should be `flush(callback)`, fire the provided `callback` when complete.
-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)=** options to pass to the writable stream.

Returns **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** a writable stream. **Do not** override the `._write` function.
