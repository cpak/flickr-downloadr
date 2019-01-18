const path = require('path')
const fs = require('fs')
const debug = require('debug')('downloadr:download')

const getFileName = url => new URL(url).pathname.split('/').reverse()[0]

const downloadTo = (api, dirPath) => ({ url, path: maybePath }, cb) => {
  const requestConfig = {
    method: 'GET',
    url,
    responseType: 'stream'
  }
  const filePath = maybePath || path.join(dirPath, getFileName(url))
  debug(`Downloading ${url} to ${filePath}`)
  api
    .signedRequest(requestConfig)
    .then(({ status, headers, data }) => {
      debug('download status', status)
      const expectedBytes = headers['content-length']
      const ws = fs.createWriteStream(filePath)
      ws.on('error', cb)
      ws.on('finish', () => cb(null, { path: filePath, bytes: expectedBytes }))
      data.pipe(ws)
    })
    .catch(cb)
}

module.exports = downloadTo
