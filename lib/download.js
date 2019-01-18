require('dotenv').config()

const debug = require('debug')('downloadr:photos')
const H = require('highland')
const parallel = require('parallel-transform')
const createApi = require('./flickr')
const getRepo = require('./repo')()
const downloadTo = require('./download-to')

const KEY = process.env.KEY
const SECRET = process.env.SECRET

// Helpers

const callMethodWith = (methodName, ...args) => o => o[methodName](...args)

// DB

const getAll = (dbPath, dbTable) => getRepo(dbPath, dbTable)
  .then(callMethodWith('getAll'))

const updateDb = (dbPath, dbTable) => o => getRepo(dbPath, dbTable)
  .then(callMethodWith('update', o))

// const hasNoPath = (dbPath, dbTable) => o => getRepo(dbPath, dbTable)
//   .then(callMethodWith('getById', o.id))
//   .then(maybeRec => !(maybeRec || {}).path)

// Main

module.exports = o => {
  debug('Options: %o', o)
  const { destDir, oauthPath, dbPath, dbTable } = o
  const API = createApi(KEY, SECRET, oauthPath)

  const records = H(getAll()).sequence()

  const download = H(records.pipe(parallel(5, downloadTo(API, destDir))))

  const output = download
    .zip(records.observe())
    .map(([pathAndBytes, record]) => Object.assign({}, record, pathAndBytes))
    .doto(updateDb(dbPath, dbTable))

  return output
}
