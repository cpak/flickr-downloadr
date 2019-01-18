require('dotenv').config()

const debug = require('debug')('downloadr:meta')
const R = require('ramda')
const H = require('highland')
const createApi = require('./flickr')
const getRepo = require('./repo')()
const photosStream = require('./photos-stream')

const KEY = process.env.KEY
const SECRET = process.env.SECRET

// Helpers

const callMethodWith = (methodName, ...args) => o => o[methodName](...args)

const wrapH = fn => (...args) => H(fn(...args))

const colonOrHyphenRx = new RegExp(':|-', 'g')
const formatDateTaken = s => s.replace(' ', 'T').replace(colonOrHyphenRx, '')

// DB

const createRecord = photoData => Object.assign({}, photoData, { type: photoData.media, url: photoData.url_o, path: '', date_taken: formatDateTaken(photoData.datetaken) })

const insertDb = (dbPath, dbTable) => o => getRepo(dbPath, dbTable)
  .then(callMethodWith('insertOrIgnore', o))

// Videos

const originalSourceFromSizes = R.compose(
  R.objOf('url'),
  R.prop('source'),
  R.find(R.propEq('label', 'Video Original')),
  R.path(['data', 'sizes', 'size'])
)

const getVideoSource = api => record => {
  if (record.type !== 'video') return Promise.resolve(record)
  debug(`Fetching video source URL for ${record.id}`)
  return api
    .getSizes(record.id)
    .then(R.pipe(originalSourceFromSizes, R.mergeRight(record)))
}

// Main

module.exports = o => {
  debug('Options: %o', o)
  const { oauthPath, dbPath, dbTable, pageStart, pageSize, pageLimit } = o
  const API = createApi(KEY, SECRET, oauthPath)
  const opts = {
    api: API,
    startPage: pageStart,
    perPage: pageSize,
    pages: pageLimit,
    extras: ['url_o', 'date_taken', 'media']
  }

  const photos = photosStream(opts)

  const output = H(photos)
    .map(createRecord)
    .flatMap(wrapH(getVideoSource(API)))
    .doto(insertDb(dbPath, dbTable))

  photos.on('total', n => output.emit('total', n))

  return output
}
