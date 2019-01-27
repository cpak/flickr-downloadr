const path = require('path')
const { promisify } = require('util')
const fs = require('fs')
const stat = promisify(fs.stat)
const axios = require('axios')
const debug = require('debug')('downloadr:download')

// Helpers

const makeRequest = opts => (debug(`${opts.method || 'GET'} ${opts.url}`), axios(opts)) // eslint-disable-line no-sequences

const ifElseP = (pred, pass, fail) => (...args) => pred(...args).then(b => b ? pass() : fail())

const logAnd = (m, fn) => () => (debug(m), fn()) // eslint-disable-line no-sequences

const logError = r => err => (debug('ERROR', err), r(err)) // eslint-disable-line no-sequences

const duration = t0 => {
  const [s, ns] = process.hrtime(t0)
  return s * 1000 + Math.round(ns / 10e6)
}

// File name and path

const trailingSlash = /\/&/

const getFileName = url => new URL(url).pathname.replace(trailingSlash, '').split('/').reverse()[0]

const getFilePath = (dirPath, url) => path.join(dirPath, getFileName(url))

// Main

const downloadTo = dirPath => ({ url }) => new Promise((resolve, reject) => {
  const t0 = process.hrtime()
  const requestConfig = { method: 'GET', url, responseType: 'stream' }

  debug(`Downloading ${url}...`)

  const done = (p, expectedBytes) => () => {
    const d = duration(t0)
    resolve({ path: p, bytes: expectedBytes, duration: d })
  }
  const dl = () => makeRequest(requestConfig)
    .then(({ status, headers, data }) => {
      const filePath = getFilePath(dirPath, url)
      const expectedBytes = parseInt(headers['content-length'], 10)
      const checkSize = () => stat(filePath).then(({ size }) => size === expectedBytes)
      const onFileWritten = ifElseP(checkSize, logAnd(`Downloaded ${url} to ${filePath}`, done(filePath, expectedBytes)), logAnd(`Retrying ${url}`, dl))

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

downloadTo.getFilePath = downloadTo.withCallback.getFilePath = getFilePath

module.exports = downloadTo
