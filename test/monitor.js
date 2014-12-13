module.exports = function() {
  var concurrency = 0;
  var callbacks = [];
  var closed = false;

  return {
    process: function(delay, callback) {
      if (closed) return callback();

      concurrency++;
      callback.fired = false;
      callbacks.push(callback);

      setTimeout(function() {
        var cb = callbacks.shift();
        if (!cb.fired) {
          concurrency--;
          cb.fired = true;
          cb();
        }
      }, delay);
    },

    close: function() {
      closed = true;
      callbacks.forEach(function(cb) {
        if (!cb.fired) {
          concurrency--;
          cb.fired = true;
          cb();
        }
      });
    },

    concurrency: function() {
      return concurrency;
    }
  };
};
