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
const objMerge = objs => Object.assign({}, ...objs)

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

// Date taken

const colonOrHyphenRx = new RegExp(':|-', 'g')
const formatDateTaken = s => s.replace(' ', 'T').replace(colonOrHyphenRx, '')

const dateTaken = api => wrapH(R.composeP(
  wrapP(formatDateTaken),
  wrapP(R.path(['data', 'photo', 'dates', 'taken'])),
  api.getInfo,
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

const createRecord = ([photoData, url, dateTaken]) => Object.assign({}, photoData, { url, path: '' }, { date_taken: dateTaken })

const insertDb = (dbPath, dbTable) => o => getRepo(dbPath, dbTable)
  .then(callMethodWith('insertOrIgnore', o))
  .then(({ changes }) => debug(`${changes ? 'inserted' : 'skipped '} "${JSON.stringify(o)}"`))

const updateDb = (dbPath, dbTable) => o => getRepo(dbPath, dbTable)
  .then(callMethodWith('update', o))
  .then(({ changes }) => debug(`${changes ? 'updated' : 'skipped '} "${JSON.stringify(o)}"`))

// Download

const getFileName = url => new URL(url).pathname.split('/').reverse()[0]

const downloadTo = (dirPath, api) => ({ url }) => new Promise((resolve, reject) => {
  const requestConfig = {
    method: 'GET',
    url,
    responseType: 'stream'
  }
  const filePath = path.join(dirPath, getFileName(url))
  debug(`Downloading ${url} to ${filePath}`)
  return api
    .signedRequest(requestConfig)
    .then(({ headers, data }) => {
      const expectedBytes = headers['content-length']
      data.on('error', reject)
      data.on('end', () => resolve({ path: filePath, bytes: expectedBytes }))
      data.pipe(fs.createWriteStream(filePath))
    })
    .catch(reject)
})

// Main

module.exports = (o) => {
  debug('Options: %o', o)
  const { destDir, oauthPath, dbPath, dbTable, pageStart, pageSize, pageLimit } = o
  const API = createApi(KEY, SECRET, oauthPath)
  const opts = {
    api: API,
    startPage: pageStart,
    perPage: pageSize,
    pageLimit: pageLimit
  }
  const photos = H(photosStream(opts))
  const records = H([
    photos.observe(),
    photos.fork().flatMap(originalUrl(API)),
    photos.fork().flatMap(dateTaken(API))
  ])
    .zipAll0()
    .map(createRecord)
    .doto(insertDb(dbPath, dbTable))

  return H([
    records.observe(),
    records.fork().flatMap(wrapH(downloadTo(destDir, API)))
  ])
    .zipAll0()
    .map(objMerge)
    .doto(updateDb(dbPath, dbTable))
}
