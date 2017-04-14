# chunk-store-read-stream [![Build Status][travis-image]][travis-url] [![npm][npm-image]][npm-url]

[![Greenkeeper badge](https://badges.greenkeeper.io/xuset/chunk-store-read-stream.svg)](https://greenkeeper.io/)

[npm-image]: https://img.shields.io/npm/v/chunk-store-read-stream.svg?style=flat
[npm-url]: https://npmjs.org/package/chunk-store-read-stream
[travis-image]: https://travis-ci.org/xuset/chunk-store-read-stream.svg?branch=master
[travis-url]: https://travis-ci.org/xuset/chunk-store-read-stream

#### Read an [abstract-chunk-store](https://github.com/mafintosh/abstract-chunk-store) as a stream

[![abstract chunk store](https://cdn.rawgit.com/mafintosh/abstract-chunk-store/master/badge.svg)](https://github.com/mafintosh/abstract-chunk-store)

chunk-store-read-stream allows for a chunk-store to be read as a [nodejs Readable stream](https://nodejs.org/api/stream.html#stream_readable_streams). Only a portion of the chunk-store can be ready by supplying the `start` and `end` options, and the chunk-store can be read while it's not fully populated by supplying the `onmiss` option.

## Usage

```js
var Stream = require('chunk-store-read-stream')
var chunkStore // = some chunk store

stream.on('data', console.log)
```

Start or end at specified byte indexes of the chunk store
```js
var stream = new Stream(chunkStore, {
  start: 1, // Start reading at byte index 1 of the chunk store
  end: 10   // End after reading the byte at index 10
})
```

Read a chunk-store that is missing some chunks
```js
var stream = new Stream(chunkStore, { onmiss: onmiss })

function onmiss(err, index, retry) {
  // An error occured while retreiving a chunk at `index`
  // When a chunk is missing, an error is produced.
  
  // ... some time passes and we know the chunk exists now ...
  
  retry()
}
```

## API

### `var stream = new Stream(chunkStore, [opts])`

Instantiates a new [nodejs Readable stream](https://nodejs.org/api/stream.html#stream_readable_streams) for the given `chunkStore`. The `opts` argument will be passed into the Readable Stream's options argument. It can also have the following properties:

* `opts.start` - The inclusive byte index to start reading at
* `opts.end` - The inclusive byte index to stop reading at
* `opts.onmiss` - The function to call to handle chunk misses

If `opts.end` is not given then `chunkStore.length - 1` is used instead. One of these properties must be defined.

#### `opts.onmiss = function (err, index, retry) {}`

`err` is the error that was generated from retreiving the chunk at `index`. The chunk-store interface does not distinguish between errors that occured because the chunk is simply missing or because something worse happend.

Once you know that the chunk does exist, you can call `retry()`. If an error does occure, this can be passed into retry like `retry(err)`.

## License

MIT. Copyright (c) Austin Middleton.
