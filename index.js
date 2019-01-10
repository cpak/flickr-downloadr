require('dotenv').config()
const fs = require('fs')
const path = require('path')

const debug = require('debug')('nflickr:main')
const R = require('ramda')
const H = require('highland')
const createApi = require('./lib/flickr')
const photosStream = require('./lib/photos-stream')
const createClient = require('./db/sqlite-client')
const createRepo = require('./db/photos-repo')

const KEY = process.env.KEY
const SECRET = process.env.SECRET

// Helpers

const wrapP = fn => (...args) => Promise.resolve(fn(...args))
const wrapH = fn => (...args) => H(fn(...args))
const callMethodWith = (methodName, ...args) => o => o[methodName](...args)

// URL juggling

const originalUrlFromSizes = R.compose(
  R.propOr(null, 'source'),
  R.find(R.propEq('label', 'Original')),
  R.path(['data', 'sizes', 'size'])
)

const originalUrl = api => wrapH(R.composeP(
  wrapP(originalUrlFromSizes),
  api.getSizes,
  wrapP(R.prop('id'))
))

// DB

const prepareDb = (dbPath, tableName) => createClient(dbPath)
  .then(client => createRepo(client, tableName))
  .then(repo => repo.createTable().then(() => repo))

const getRepo = (() => {
  let promisedRepo = null
  return (dbPath, dbTable) => promisedRepo || (promisedRepo = prepareDb(dbPath, dbTable))
})()

const createRecord = ([photoData, url]) => Object.assign({}, photoData, { url, path: '' })

const insertDb = (dbPath, dbTable) => o => getRepo(dbPath, dbTable)
  .then(callMethodWith('insertOrIgnore', o))
  .then(({ changes }) => debug(`${changes ? 'inserted' : 'skipped '} "${JSON.stringify(o)}"`))

const updateDb = (dbPath, dbTable) => o => getRepo(dbPath, dbTable)
  .then(callMethodWith('update', o))
  .then(({ changes }) => debug(`${changes ? 'updated' : 'skipped '} "${JSON.stringify(o)}"`))

// Download

const getFileName = url => new URL(url).pathname.split('/').reverse()[0]

const downloadToDir = (api, dirPath) => record => new Promise((resolve, reject) => {
  const url = record.url
  const filePath = path.join(dirPath, getFileName(url))
  debug('Downloading %s to %s', url, filePath)
  const requestConfig = {
    method: 'GET',
    url,
    responseType: 'stream'
  }
  api
    .signedRequest(requestConfig)
    .then(({ data }) => {
      debug('Got response, writing...')
      data.on('error', reject)
      data.on('end', () => resolve(Object.assign({}, record, { path: filePath })))
      data.pipe(fs.createWriteStream(filePath))
    })
})

// Main

module.exports = (o) => {
  debug(o)
  const { destDir, oauthPath, dbPath, dbTable, pageStart, pageSize, pageLimit } = o
  const API = createApi(KEY, SECRET, oauthPath)
  const opts = {
    api: API,
    startPage: pageStart,
    perPage: pageSize,
    pageLimit: pageLimit
  }
  const photos = H(photosStream(opts))
  return H([photos.observe(), photos.fork().flatMap(originalUrl(API))])
    .zipAll0()
    .map(createRecord)
    .doto(insertDb(dbPath, dbTable))
    .map(wrapH(downloadToDir(API, destDir)))
    .parallel(5)
    .doto(updateDb(dbPath, dbTable))
    .map(({ url, path }) => `${url} => ${path}`)
}
