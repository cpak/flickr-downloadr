require('dotenv').config()
const fs = require('fs')
const path = require('path')

const debug = require('debug')('nflickr:main')
const R = require('ramda')
const H = require('highland')
const createApi = require('./lib/flickr')
const photosStream = require('./photos-stream')
const createClient = require('./load/sqlite-client')
const createRepo = require('./load/photos-repo')

const DB_PATH = process.env.DB_PATH
const DB_TABLE_NAME = process.env.DB_TABLE_NAME
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR
const KEY = process.env.KEY
const SECRET = process.env.SECRET
const OAUTH_PATH = './.oauth'

const API = createApi(KEY, SECRET, OAUTH_PATH)

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

const originalUrl = wrapH(R.composeP(
  wrapP(originalUrlFromSizes),
  API.getSizes,
  wrapP(R.prop('id'))
))

// DB

const prepareDb = (dbPath, tableName) => createClient(dbPath)
  .then(client => createRepo(client, tableName))
  .then(repo => repo.createTable().then(() => repo))

const getRepo = (() => {
  let promisedRepo = null
  return () => promisedRepo || (promisedRepo = prepareDb(DB_PATH, DB_TABLE_NAME))
})()

const createRecord = ([photoData, url]) => Object.assign({}, photoData, { url, path: '' })

const insertDb = o => getRepo()
  .then(callMethodWith('insertOrIgnore', o))
  .then(({ changes }) => debug(`${changes ? 'inserted' : 'skipped '} "${JSON.stringify(o)}"`))

const updateDb = o => getRepo()
  .then(callMethodWith('update', o))
  .then(({ changes }) => debug(`${changes ? 'updated' : 'skipped '} "${JSON.stringify(o)}"`))

// Download

const getFileName = url => new URL(url).pathname.split('/').reverse()[0]

const downloadToDir = dirPath => record => new Promise((resolve, reject) => {
  const url = record.url
  const filePath = path.join(dirPath, getFileName(url))
  debug('Downloading %s to %s', url, filePath)
  const requestConfig = {
    method: 'GET',
    url,
    responseType: 'stream'
  }
  API
    .signedRequest(requestConfig)
    .then(({ data }) => {
      debug('Got response, writing...')
      data.on('error', reject)
      data.on('end', () => resolve(Object.assign({}, record, { path: filePath })))
      data.pipe(fs.createWriteStream(filePath))
    })
})

// Main

const opts = {
  api: API,
  startPage: 1,
  perPage: 10,
  pageLimit: 10
}

const main = () => {
  const photos = H(photosStream(opts))
  H([photos.observe(), photos.fork().flatMap(originalUrl)])
    .zipAll0()
    .map(createRecord)
    .doto(insertDb)
    .map(wrapH(downloadToDir(DOWNLOAD_DIR)))
    .parallel(5)
    .doto(updateDb)
    .map(({ url, path }) => `${url} => ${path}`)
    .pipe(process.stdout)
}

main()
