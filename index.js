module.exports = Stream

var inherits = require('inherits')
var stream = require('readable-stream')

inherits(Stream, stream.Readable)
function Stream (chunkstore, opts) {
  if (!chunkstore) throw new Error('A chunk-store must be the first argument')
  if (!(this instanceof Stream)) return new Stream(chunkstore, opts)
  if (!opts) opts = {}

  stream.Readable.call(this, opts)

  this.chunkstore = chunkstore
  this.onmiss = opts.onmiss
  this.destroyed = false

  this._chunkLength = opts.chunkLength || chunkstore.chunkLength
  this._bytesOffset = 'start' in opts ? opts.start : 0
  this._bytesLeft = 'end' in opts ? opts.end : chunkstore.length
  this._startIndex = Math.floor(this._bytesOffset / this._chunkLength)
  this._endIndex = Math.floor(this._bytesLeft / this._chunkLength)
  this._currentIndex = this._startIndex
  this._reading = false

  if (typeof this._bytesLeft === 'undefined') {
    throw new Error('Must define opts.end or chunkstore.length')
  }
}

Stream.prototype._read = function () {
  var self = this

  if (self._reading || self.destroyed) return
  self._reading = true

  if (self._bytesLeft === 0) return self.push(null)

  self._get(self._currentIndex, function (err, chunk) {
    if (err) return self._destroy(err)

    if (self._bytesOffset !== 0) chunk = chunk.slice(self._bytesOffset)
    if (self._bytesLeft < chunk.length) chunk = chunk.slice(0, self._bytesLeft)

    self._bytesOffset = 0
    self._bytesLeft -= chunk.length
    self._currentIndex++
    self._reading = false
    if (self.push(chunk)) self._read()
  })
}

Stream.prototype._get = function (index, cb) {
  var self = this
  var callCount = 0
  retry(null)

  function retry (err) {
    callCount++
    if (callCount > 2) throw new Error('Retry cannot be called multiple times')
    if (err) return cb(err)
    self.chunkstore.get(index, function (err, chunk) {
      if (err && self.onmiss) self.onmiss(err, index, retry)
      else cb(err, chunk)
    })
  }
}

Stream.prototype._destroy = function (err) {
  if (this.destroyed) return
  this.destroyed = true

  this.chunkstore = null

  if (err) this.emit('error', err)
  this.emit('close')
}

Stream.prototype.destroy = function () {
  this._destroy()
}
