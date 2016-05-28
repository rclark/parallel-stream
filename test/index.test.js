var stream = require('stream');
var test = require('tape');
var _ = require('underscore');
var parallel = require('..');

// All tests defined below, run for various concurrencies
writableTests();
writableTests(10);
writableTests(100);
transformTests();
transformTests(10);
transformTests(100);

function timedWorker(pauseTime, err) {
  var worker = function(data, enc, callback) {
    worker.running++;
    worker.data.push(Number(data.toString()));

    function work(data) {
      if (worker.err) return callback(worker.err);
      if (err) callback(err);
      else callback(null, data);
      worker.running--;
    }

    if (pauseTime) setTimeout(work, pauseTime, data);
    else work(data);
  };
  worker.running = 0;
  worker.data = [];

  return worker;
}

function timedReadable(pauseTime) {
  var readable = new stream.Readable();
  readable.count = 0;
  readable._read = function() {
    if (readable.stop) {
      return readable.push(null);
    }
    setTimeout(function() {
      readable.push((++readable.count).toString());
    }, pauseTime);
  };

  return readable;
}

function writableTests(concurrency) {
  var options = concurrency ? { concurrency: concurrency } : undefined;
  concurrency = concurrency || 1;

  test('[writable: ' + concurrency + '] maintains desired concurrency', function(assert) {
    var work = timedWorker(30);
    var read = timedReadable(20);
    var failed = false;

    var interval = setInterval(function() {
      if (work.running > concurrency) assert.fail(work.running + ' is above desired concurrency of ' + concurrency);
      failed = true;
    }, 5);

    setTimeout(function() {
      read.stop = true;
    }, 2000);

    read.pipe(parallel.writable(work, options))
      .on('error', function(err) {
        assert.ifError(err, 'encountered unexpected errror');
        failed = true;
      })
      .on('finish', function() {
        clearInterval(interval);

        assert.deepEqual(work.data, _.range(1, read.count + 1), 'worker received all work');
        assert.ok(failed, 'finished successfully');
        assert.end();
      });
  });

  test('[writable: ' + concurrency + '] passes through stream options', function(assert) {
    var opts = { objectMode: true };
    if (options) opts.concurrency = options.concurrency;

    var writable = parallel.writable(timedWorker(30), opts);
    assert.doesNotThrow(function() {
      writable.write({ one: 1 });
    }, 'success');
    assert.end();
  });

  test('[writable: ' + concurrency + '] handles worker error', function(assert) {
    var work = timedWorker(30, new Error('processing failed'));
    var read = timedReadable(20);

    setTimeout(function() {
      read.stop = true;
    }, 2000);

    read.pipe(parallel.writable(work, options))
      .on('error', function(err) {
        assert.equal(err.message, 'processing failed', 'error passed through');
        assert.end();
      })
      .on('finish', function() {
        assert.fail('finish event should not fire');
      });
  });

  test('[writable: ' + concurrency + '] handles work error after .end() is caled', function(assert) {
    var work = timedWorker(30);
    var read = timedReadable(20)
      .on('end', function() {
        work.err = new Error('post .end() failure');
      });

    setTimeout(function() {
      read.stop = true;
    }, 2000);

    read.pipe(parallel.writable(work, options))
      .on('error', function(err) {
        assert.equal(err.message, 'post .end() failure', 'error passed through');
        assert.end();
      })
      .on('finish', function() {
        assert.fail('finish event should not fire');
      });
  });

  test('[writable: ' + concurrency + '] accepts chunks on .end()', function(assert) {
    var work = timedWorker(30);
    var writable = parallel.writable(work, options);
    writable.end('42');

    writable.on('finish', function() {
      assert.deepEqual(work.data, [42], '.end() chunk written');
      assert.end();
    });
  });

  test('[writable: ' + concurrency + '] accepts callback on .end()', function(assert) {
    var work = timedWorker(30);
    var writable = parallel.writable(work, options);
    writable.end(function() {
      assert.end();
    });
  });

  test('[writable: ' + concurrency + '] accepts chunk and callback on .end()', function(assert) {
    var work = timedWorker(30);
    var writable = parallel.writable(work, options);

    writable.end('42', function() {
      assert.deepEqual(work.data, [42], '.end() chunk written');
      assert.end();
    });
  });

  test('[writable: ' + concurrency + '] accepts chunk, enc, and callback on .end()', function(assert) {
    var work = timedWorker(30);
    var writable = parallel.writable(work, options);

    writable.end('42', 'utf8', function() {
      assert.deepEqual(work.data, [42], '.end() chunk written');
      assert.end();
    });
  });

  test('[writable: ' + concurrency + '] flush success', function(assert) {
    assert.plan(2);

    function flush(callback) {
      assert.deepEqual(work.data, [42], '.end() chunk written');
      callback();
    }

    var work = timedWorker(30);
    var writable = parallel.writable(work, flush, options);

    writable.end('42');
    writable.on('finish', function() {
      assert.pass('finish event fired');
    });
  });

  test('[writable: ' + concurrency + '] handles flush error', function(assert) {
    assert.plan(2);

    function flush(callback) {
      assert.deepEqual(work.data, [42], '.end() chunk written');
      callback(new Error('flush error'));
    }

    var work = timedWorker(30);
    var writable = parallel.writable(work, flush, options);

    writable.end('42');
    writable.on('error', function(err) {
      assert.equal(err.message, 'flush error', 'flush error emitted');
    });
  });

  test('[writable: ' + concurrency + '] synchronous writer', function(assert) {
    var work = timedWorker(0);
    var read = timedReadable(20)
      .on('end', function() {
        work.err = new Error('post .end() failure');
      });

    setTimeout(function() {
      read.stop = true;
    }, 2000);

    read.pipe(parallel.writable(work, options))
      .on('error', function(err) {
        assert.ifError(err, 'should not error');
      })
      .on('finish', function() {
        assert.pass('finish event should fire');
        assert.end();
      });
  });
}

function transformTests(concurrency) {
  var options = concurrency ? { concurrency: concurrency } : undefined;
  concurrency = concurrency || 1;

  test('[transform: ' + concurrency + '] maintains desired concurrency', function(assert) {
    var work = timedWorker(30);
    var read = timedReadable(20);
    var failed = false;

    var interval = setInterval(function() {
      if (work.running > concurrency) assert.fail(work.running + ' is above desired concurrency of ' + concurrency);
      failed = true;
    }, 5);

    setTimeout(function() {
      read.stop = true;
    }, 2000);

    var written = [];
    read.pipe(parallel.transform(work, options))
      .on('error', function(err) {
        assert.ifError(err, 'encountered unexpected errror');
        failed = true;
      })
      .on('end', function() {
        clearInterval(interval);
        assert.ok(failed, 'finished successfully');

        assert.deepEqual(work.data, _.range(1, read.count + 1), 'worker received all work');
        assert.deepEqual(written, _.range(1, read.count + 1), 'transform wrote all data');
        assert.end();
      })
      .on('data', function(d) {
        written.push(Number(d));
      });
  });

  test('[transform: ' + concurrency + '] passes through stream options', function(assert) {
    var opts = { objectMode: true };
    if (options) opts.concurrency = options.concurrency;

    var transform = parallel.transform(timedWorker(30), opts);
    assert.doesNotThrow(function() {
      transform.write({ one: 1 });
    }, 'success');
    assert.end();
  });

  test('[transform: ' + concurrency + '] handles worker error', function(assert) {
    var work = timedWorker(30, new Error('processing failed'));
    var read = timedReadable(20);

    setTimeout(function() {
      read.stop = true;
    }, 2000);

    read.pipe(parallel.transform(work, options))
      .on('error', function(err) {
        assert.equal(err.message, 'processing failed', 'error passed through');
        assert.end();
      })
      .on('finish', function() {
        assert.fail('finish event should not fire');
      }).resume();
  });

  test('[transform: ' + concurrency + '] handles work error after .end() is caled', function(assert) {
    var work = timedWorker(30);
    var read = timedReadable(20)
      .on('end', function() {
        work.err = new Error('post .end() failure');
      });

    setTimeout(function() {
      read.stop = true;
    }, 2000);

    read.pipe(parallel.transform(work, options))
      .on('error', function(err) {
        assert.equal(err.message, 'post .end() failure', 'error passed through');
        assert.end();
      })
      .on('finish', function() {
        assert.fail('finish event should not fire');
      });
  });

  test('[transform: ' + concurrency + '] worker can this.push(data)', function(assert) {
    function work(data, enc, callback) {
      this.push(data);
      callback();
    }

    var transform = parallel.transform(work, options)
      .on('data', function(data) {
        assert.equal(data.toString(), 'pushed', 'this.push wrote data');
        assert.end();
      });

    transform.write('pushed');
    transform.resume();
  });

  test('[transform: ' + concurrency + '] accepts chunks on .end()', function(assert) {
    var work = timedWorker(30);
    var writable = parallel.transform(work, options);
    writable.end('42');

    writable.on('end', function() {
      assert.deepEqual(work.data, [42], '.end() chunk written');
      assert.end();
    }).resume();
  });

  test('[transform: ' + concurrency + '] accepts chunk and callback on .end()', function(assert) {
    var work = timedWorker(30);
    var transform = parallel.transform(work, options);

    transform.end('42', function() {
      assert.deepEqual(work.data, [42], '.end() chunk written');
      assert.end();
    });

    transform.resume();
  });

  test('[transform: ' + concurrency + '] accepts chunk, enc, and callback on .end()', function(assert) {
    var work = timedWorker(30);
    var transform = parallel.transform(work, options);

    transform.end('42', 'utf8', function() {
      assert.deepEqual(work.data, [42], '.end() chunk written');
      assert.end();
    });

    transform.resume();
  });

  test('[transform: ' + concurrency + '] flush success', function(assert) {
    assert.plan(2);

    var work = timedWorker(30);
    var transform = parallel.transform(work, options);

    transform._flush = function(callback) {
      assert.deepEqual(work.data, [42], 'flush called after writes completed');
      callback();
    };

    transform.end('42');
    transform.resume();

    transform.on('end', function() {
      assert.pass('end event fired');
    });
  });
}
