var Stream = require('.')
var MemoryChunkStore = require('memory-chunk-store')
var concat = require('concat-stream')
var runParallel = require('run-parallel')
var test = require('tape')

test('sanity test', function (t) {
  createStore(new Buffer('abcdef'), 3, function (err, store) {
    t.error(err)
    var stream = Stream(store)
    stream.on('error', function (err) { t.fail(err) })

    stream.pipe(concat(function (buf) {
      t.deepEqual(buf, new Buffer('abcdef'))
      t.end()
    }))
  })
})

test('Uneven chunk', function (t) {
  createStore(new Buffer('abcd'), 3, function (err, store) {
    t.error(err)
    var stream = Stream(store)
    stream.on('error', function (err) { t.fail(err) })

    stream.pipe(concat(function (buf) {
      t.deepEqual(buf, new Buffer('abcd'))
      t.end()
    }))
  })
})

test('start and end', function (t) {
  createStore(new Buffer('abcdef'), 3, function (err, store) {
    t.error(err)
    var stream = Stream(store, {start: 2, end: 4})
    stream.on('error', function (err) { t.fail(err) })

    stream.pipe(concat(function (buf) {
      t.deepEqual(buf, new Buffer('cde'))
      t.end()
    }))
  })
})

test('start and end single chunk', function (t) {
  createStore(new Buffer('abcdef'), 6, function (err, store) {
    t.error(err)
    var stream = Stream(store, {start: 1, end: 3})
    stream.on('error', function (err) { t.fail(err) })

    stream.pipe(concat(function (buf) {
      t.deepEqual(buf, new Buffer('bcd'))
      t.end()
    }))
  })
})

test('start and no end', function (t) {
  createStore(new Buffer('abcdef'), 4, function (err, store) {
    t.error(err)
    var stream = Stream(store, {start: 4})
    stream.on('error', function (err) { t.fail(err) })

    stream.pipe(concat(function (buf) {
      t.deepEqual(buf, new Buffer('ef'))
      t.end()
    }))
  })
})

test('equal start and end', function (t) {
  createStore(new Buffer('abc'), 3, function (err, store) {
    t.error(err)
    var stream = Stream(store, {start: 1, end: 1})
    stream.on('error', function (err) { t.fail(err) })

    stream.pipe(concat(function (buf) {
      t.deepEqual(buf, new Buffer('b'))
      t.end()
    }))
  })
})

test('onmiss', function (t) {
  createStore(new Buffer('abc'), 3, 6, function (err, store) {
    t.error(err)
    var stream = Stream(store, {onmiss: onmiss})
    stream.on('error', function (err) { t.fail(err) })

    stream.pipe(concat(function (buf) {
      t.deepEqual(buf, new Buffer('abcdef'))
      t.end()
    }))

    function onmiss (err, index, retry) {
      t.ok(err instanceof Error)
      t.equal(index, 1)
      store.put(1, new Buffer('def'), function (err) {
        t.error(err)
        retry()
      })
    }
  })
})

test('onmiss error', function (t) {
  createStore(new Buffer('abc'), 3, 6, function (err, store) {
    t.error(err)
    var stream = Stream(store, {onmiss: onmiss})

    stream.on('error', function (err) {
      t.ok(err instanceof Error)
      t.end()
    })

    stream.pipe(concat())

    function onmiss (err, index, retry) {
      t.ok(err instanceof Error)
      t.equal(index, 1)
      retry(new Error('Should error'))
    }
  })
})

test('onmiss retry double called is ignored', function (t) {
  createStore(new Buffer('abc'), 3, 6, function (err, store) {
    t.error(err)
    var stream = Stream(store, {onmiss: onmiss})

    stream.on('error', function (err) { t.error(err) })

    stream.pipe(concat(function (buf) {
      t.deepEqual(buf, new Buffer('abcdef'))
      t.end()
    }))

    function onmiss (err, index, retry) {
      t.ok(err instanceof Error)
      if (index === 2) return
      t.equal(index, 1)

      store.put(1, new Buffer('def'), function (err) {
        t.error(err)
        retry()
        t.throws(retry)
      })
    }
  })
})

test('destroy mid stream', function (t) {
  createStore(new Buffer('abc'), 3, 6, function (err, store) {
    t.error(err)
    var stream = Stream(store, {onmiss: onmiss})

    stream.on('error', function (err) { t.error(err) })
    stream.on('data', function (chunk) {
      t.deepEqual(chunk, new Buffer('abc'))
    })
    stream.on('close', function () {
      t.equal(stream.destroyed, true)
      t.end()
    })

    function onmiss (err, index, retry) {
      t.ok(err instanceof Error)
      t.equal(index, 1)
      stream.destroy()
    }
  })
})

test('simple errors', function (t) {
  var noLengthStore = new MemoryChunkStore(1)
  delete noLengthStore.length
  t.throws(function () { Stream(noLengthStore) })

  var store = new MemoryChunkStore(1)
  t.doesNotThrow(function () { Stream(store) })
  t.throws(function () { Stream() })
  t.throws(function () { Stream(store, {start: 1, end: 0}) })
  t.doesNotThrow(function () {
    var s = new Stream(store)
    s.destroy()
    s.destroy()
  })
  t.end()
})

function createStore (buffer, chunkSize, length, cb) {
  if (typeof length === 'function') return createStore(buffer, chunkSize, undefined, length)
  length = length || buffer.length
  var count = buffer.length / chunkSize
  var store = new MemoryChunkStore(chunkSize, {length: length})
  var tasks = []
  for (var i = 0; i < count; i++) {
    (function (index) {
      var chunk = buffer.slice(index * chunkSize, (index + 1) * chunkSize)
      tasks.push(function (cb) { store.put(index, chunk, cb) })
    })(i)
  }
  runParallel(tasks, function (err) {
    if (err) cb(err)
    else cb(null, store)
  })
}
