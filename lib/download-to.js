const path = require('path')
const { promisify } = require('util')
const fs = require('fs')
const stat = promisify(fs.stat)
const got = require('got')
const throttle = require('just-throttle')
const debug = require('debug')('downloadr:download')

// Helpers

const downloadStream = opts => (debug(`${opts.method || 'GET'} ${opts.url}`), got.stream(opts)) // eslint-disable-line no-sequences

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
  const requestConfig = { method: 'GET', url }

  debug(`Downloading ${url}...`)

  const done = (p, b) => () => {
    const d = duration(t0)
    resolve({ path: p, bytes: b, duration: d })
  }

  const filePath = getFilePath(dirPath, url)
  let expectedBytes = 0
  let attempts = 0

  const dl = () => {
    if (++attempts > 3) {
      debug(`Giving up on ${url}`)
      return done(filePath, expectedBytes)
    }

    const data = downloadStream(requestConfig)

    data.on('downloadProgress', throttle(({ percent, total }) => {
      if (total && !expectedBytes) {
        expectedBytes = total
        debug(`expectedBytes (from process): ${expectedBytes}`)
      }
      debug(`${url} ${Math.round(percent * 100)}%`)
    }), 5000, true)

    data.on('response', ({ headers }) => {
      if (headers['content-length'] && !expectedBytes) {
        expectedBytes = parseInt(headers['content-length'], 10)
        debug(`expectedBytes (from response): ${expectedBytes}`)
      }
    })

    const checkSize = () => stat(filePath).then(({ size }) => {
      const r = size === expectedBytes
      if (!r) debug(`Expected ${expectedBytes}, saw ${size}`)
      return r
    })

    const onFileWritten = ifElseP(checkSize, logAnd(`Downloaded ${url} to ${filePath}`, done(filePath, expectedBytes)), logAnd(`Retrying ${url}`, dl))

    const ws = fs.createWriteStream(filePath)
    ws.on('error', logError(reject))
    ws.on('finish', onFileWritten)

    data.pipe(ws)
  }

  return dl()
})

downloadTo.withCallback = (api, dirPath) =>
  ({ url, path: maybePath }, cb) =>
    downloadTo(api, dirPath)({ url, path: maybePath })
      .then(res => cb(null, res), cb)

downloadTo.getFilePath = downloadTo.withCallback.getFilePath = getFilePath

module.exports = downloadTo
