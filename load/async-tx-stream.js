const { Transform } = require('stream')

class AsyncTx extends Transform {
  constructor (transformFn, options) {
    super(options)
    this._transformFn = transformFn
  }

  _transform (chunk, encoding, callback) {
    this
      ._transformFn(chunk)
      .then(data => {
        callback(null, data)
      }, callback)
  }
}

module.exports = AsyncTx
