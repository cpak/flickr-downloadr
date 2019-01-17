require('dotenv').config()
const fs = require('fs')
const path = require('path')

const debug = require('debug')('nflickr:main')
const H = require('highland')
const parallel = require('parallel-transform')
const createApi = require('./flickr')
const photosStream = require('./photos-stream')
const createClient = require('../db/sqlite-client')
const createRepo = require('../db/photos-repo')

const KEY = process.env.KEY
const SECRET = process.env.SECRET

// Helpers

const wrapH = fn => (...args) => H(fn(...args))
const callMethodWith = (methodName, ...args) => o => o[methodName](...args)

const colonOrHyphenRx = new RegExp(':|-', 'g')
const formatDateTaken = s => s.replace(' ', 'T').replace(colonOrHyphenRx, '')

// DB

const prepareDb = (dbPath, tableName) => createClient(dbPath)
  .then(client => createRepo(client, tableName))
  .then(repo => repo.createTable().then(() => repo))

const getRepo = (() => {
  let promisedRepo = null
  return (dbPath, dbTable) => promisedRepo || (promisedRepo = prepareDb(dbPath, dbTable))
})()

const createRecord = photoData => Object.assign({}, photoData, { url: photoData.url_o, path: '' }, { date_taken: formatDateTaken(photoData.datetaken) })

const insertDb = (dbPath, dbTable) => o => getRepo(dbPath, dbTable)
  .then(callMethodWith('insertOrIgnore', o))

const updateDb = (dbPath, dbTable) => o => getRepo(dbPath, dbTable)
  .then(callMethodWith('update', o))

const hasNoPath = (dbPath, dbTable) => o => getRepo(dbPath, dbTable)
  .then(callMethodWith('getById', o.id))
  .then(maybeRec => !(maybeRec || {}).path)

// Download

const getFileName = url => new URL(url).pathname.split('/').reverse()[0]

const downloadTo = (dirPath, api) => ({ url }, cb) => {
  const requestConfig = {
    method: 'GET',
    url,
    responseType: 'stream'
  }
  const filePath = path.join(dirPath, getFileName(url))
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

// Main

module.exports = (o) => {
  debug('Options: %o', o)
  const { destDir, oauthPath, dbPath, dbTable, pageStart, pageSize, pageLimit } = o
  const API = createApi(KEY, SECRET, oauthPath)
  const opts = {
    api: API,
    startPage: pageStart,
    perPage: pageSize,
    pages: pageLimit,
    extras: ['url_o', 'date_taken']
  }

  const photos = photosStream(opts)

  const records = H(photos)
    .flatFilter(wrapH(hasNoPath(dbPath, dbTable)))
    .map(createRecord)
    .doto(insertDb(dbPath, dbTable))

  const download = H(records.pipe(parallel(5, downloadTo(destDir, API))))

  const output = download
    .zip(records.observe())
    .map(([p, r]) => Object.assign({}, r, p))
    .doto(updateDb(dbPath, dbTable))

  photos.on('total', n => {
    debug('total', n)
    output.emit('total', n)
  })

  return output
}
