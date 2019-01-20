const path = require('path')
const { promisify } = require('util')
const fs = require('fs')
const debug = require('debug')('downloadr:download')
const stat = promisify(fs.stat)

const ifElseP = (pred, pass, fail) => (...args) => pred(...args).then(b => b ? pass() : fail())

const getFileName = url => new URL(url).pathname.split('/').reverse()[0]

const logAnd = (m, fn) => () => (debug(m), fn()) // eslint-disable-line no-sequences

const logError = r => err => (debug('ERROR', err), r(err)) // eslint-disable-line no-sequences

const downloadTo = (api, dirPath) => ({ url, path: maybePath }) => new Promise((resolve, reject) => {
  const requestConfig = { method: 'GET', url, responseType: 'stream' }
  const filePath = maybePath || path.join(dirPath, getFileName(url))

  debug(`Downloading ${url} to ${filePath}`)

  const done = expectedBytes => () => resolve({ path: filePath, bytes: expectedBytes })
  const dl = () => api
    .signedRequest(requestConfig)
    .then(({ status, headers, data }) => {
      const expectedBytes = parseInt(headers['content-length'], 10)
      const checkSize = () => stat(filePath).then(({ size }) => size === expectedBytes)
      const onFileWritten = ifElseP(checkSize, logAnd(`Downloaded ${url}`, done(expectedBytes)), logAnd(`Retrying ${url}`, dl))

      const ws = fs.createWriteStream(filePath)
      ws.on('error', logError(reject))
      ws.on('finish', onFileWritten)

      data.pipe(ws)
    })
    .catch(logError(reject))

  return dl()
})

downloadTo.withCallback = (api, dirPath) =>
  ({ url, path: maybePath }, cb) =>
    downloadTo(api, dirPath)({ url, path: maybePath })
      .then(res => cb(null, res), cb)

module.exports = downloadTo
