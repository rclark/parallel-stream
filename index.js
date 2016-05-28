var stream = require('stream');

/**
 * A concurrent writable stream
 *
 * @param {function} work - a function to process a single chunk. Function
 * signature should be `process(chunk, enc, callback)`. When finished processing,
 * fire the provided `callback`.
 * @param {function} [flush=undefined] - a function to run once all chunks have been
 * processed, but before the stream emits a `finished` event. Function signature
 * should be `flush(callback)`, fire the provided `callback` when complete.
 * @param {object} [options=undefined] - options to pass to the writable stream.
 * @param {number} [options.concurrency=1] - number of chunks to process concurrently.
 * @returns {object} a writable stream. **Do not** override the `._write` function.
 * @example
 * var parallel = require('parallel-stream');
 *
 * var writable = parallel.writable(function(chunk, enc, callback) {
 *   processAsync(chunk)
 *     .on('done', callback);
 * }, { objectMode: true, concurrency: 15 });
 *
 * readable.pipe(writable)
 *  .on('finish', function() {
 *    console.log('complete!');
 * });
 */
module.exports.writable = function(work, flush, options) {
  if (typeof flush === 'object') {
    options = flush;
    flush = null;
  }
  if (!flush) flush = function(callback) { callback(); };
  options = options || {};
  var concurrency = options.concurrency || 1;

  var writable = new stream.Writable(options);
  writable.pending = 0;

  writable._write = function(chunk, enc, callback) {
    if (writable.err) {
      writable.errored = true;
      return callback(writable.err);
    }

    if (writable.pending >= concurrency) {
      return writable.once('free', function() {
        writable._write(chunk, enc, callback);
      });
    }

    writable.pending++;
    work.call(writable, chunk, enc, function(err) {
      writable.pending--;
      writable.emit('free');
      if (err) writable.err = err;
    });

    callback();
    if (writable._writableState.buffer.length === 0) writable.emit('empty');
  };

  var end = writable.end.bind(writable);

  writable.end = function(chunk, enc, callback) {
    if (writable._writableState.buffer.length) {
      return writable.once('empty', function() {
        writable.end(chunk, enc, callback);
      });
    }

    if (writable.pending) {
      return writable.once('free', function() {
        writable.end(chunk, enc, callback);
      });
    }

    if (typeof chunk === 'function') {
      callback = chunk;
      chunk = null;
    }

    if (typeof enc === 'function') {
      callback = enc;
      enc = null;
    }

    if (chunk) {
      writable.write(chunk, enc);
      return writable.once('free', function() {
        writable.end(callback);
      });
    }

    if (callback) writable.on('finish', callback);

    if (writable.err && !writable.errored)
      return writable.emit('error', writable.err);

    flush(function(err) {
      if (err) return writable.emit('error', err);
      end();
    });
  };

  return writable;
};

/**
 * A concurrent transform stream
 *
 * @param {function} work - a function to process a single chunk. Function
 * signature should be `process(chunk, enc, callback)`. When finished processing,
 * fire the provided `callback`.
 * @param {object} [options = undefined] - options to pass to the transform stream.
 * @param {number} [options.concurrency = 1] - number of chunks to process concurrently.
 * @returns {object} a transform stream. **Do not** override the `._transform` function.
 * @example
 * var parallel = require('parallel-stream');
 *
 * var transform = parallel.transform(function(chunk, enc, callback) {
 *   processAsync(chunk)
 *     .on('done', function(processedData) {
 *       callback(null, processedData);
 *     });
 * }, { objectMode: true, concurrency: 15 });
 *
 * readable.pipe(transform)
 *  .on('data', function(data) {
 *     console.log('got processed data: %j', data);
 *  })
 *  .on('end', function() {
 *    console.log('complete!');
 * });
 */
module.exports.transform = function(work, options) {
  options = options || {};
  var concurrency = options.concurrency || 1;

  var transform = new stream.Transform(options);
  transform.pending = 0;

  transform._transform = function(chunk, enc, callback) {
    if (transform.err) {
      transform.errored = true;
      return callback(transform.err);
    }

    if (transform.pending >= concurrency) {
      return transform.once('free', function() {
        transform._transform(chunk, enc, callback);
      });
    }

    transform.pending++;
    work.call(transform, chunk, enc, function(err, data) {
      transform.pending--;
      if (err) transform.err = err;
      else if (data) transform.push(data);
      transform.emit('free');
    });

    callback();
  };

  var end = transform.end.bind(transform);

  transform.end = function(chunk, enc, callback) {
    if (transform.pending) {
      return transform.once('free', function() {
        transform.end(chunk, enc, callback);
      });
    }

    if (typeof chunk === 'function') {
      callback = chunk;
      chunk = null;
    }

    if (typeof enc === 'function') {
      callback = enc;
      enc = null;
    }

    if (chunk) {
      transform.write(chunk, enc);
      return transform.once('free', function() {
        transform.end(callback);
      });
    }

    if (callback) transform.on('finish', callback);

    if (transform.err && !transform.errored)
      return transform.emit('error', transform.err);

    end();
  };

  return transform;
};
