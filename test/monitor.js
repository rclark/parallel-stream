module.exports = function() {
  var concurrency = 0;
  var callbacks = [];
  var closed = false;

  return {
    process: function(chunk, delay, callback) {

      if (closed) return callback();

      concurrency++;
      callback.fired = false;
      callback.chunk = chunk;
      callbacks.push(callback);

      setTimeout(function() {
        var cb = callbacks.shift();
        if (!cb.fired) {
          concurrency--;
          cb.fired = true;
          cb(null, cb.chunk);
        }
      }, delay);
    },

    close: function() {
      closed = true;
      callbacks.forEach(function(cb) {
        if (!cb.fired) {
          concurrency--;
          cb.fired = true;
          cb(null, cb.chunk);
        }
      });
    },

    concurrency: function() {
      return concurrency;
    }
  };
};
