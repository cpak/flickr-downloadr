const { Readable } = require('stream')

const identity = x => x

// const assertFunction = (label, x) => {
//   const type = typeof x
//   if (type !== 'function') throw new Error(`Expected "${label}" to be function but got "${type}"`)
// }

const handleError = s => err => process.nextTick(() => s.emit('error', err))

class StreamFromPromiseGenerator extends Readable {
  constructor (generator, opts = {}, streamOpts) {
    super(streamOpts)
    // TODO: check types
    this.generator = generator
    this.extractData = opts.extractData || identity
    this.flatten = Boolean(opts.flatten)
    this._buffer = []
  }

  _fillBuffer () {
    const b = this._buffer
    return this.generator.next()
      .then(({ done, value }) => {
        if (done) {
          b.push(null)
        } else {
          const data = this.extractData(value)
          if (this.flatten) {
            Array.prototype.push.apply(b, data)
          } else {
            b.push(data)
          }
        }
      })
  }

  _pushFromBuffer () {
    const b = this._buffer
    if (b.length) {
      this.push(b.shift()) && this._pushFromBuffer()
    } else {
      this._fillBuffer()
        .then(this._pushFromBuffer.bind(this))
        .catch(handleError(this))
    }
  }

  _read (_) {
    this._pushFromBuffer()
  }
}

module.exports = StreamFromPromiseGenerator
