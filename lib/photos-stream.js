const debug = require('debug')('nflickr:photos')
const R = require('ramda')

const PaginatedGenerator = require('./paginated-generator')
const StreamFromPromiseGenerator = require('./stream-from-promise-generator')

const defaults = {
  perPage: 500,
  startPage: 1
}

const formatExtraFields = x => {
  if (Array.isArray(x)) return x.map(R.trim).join(',')
  if (R.is(String, x)) return R.trim(x)
  return ''
}

const createPhotosStream = opts => {
  const API = opts.api
  const extras = formatExtraFields(opts.extras)
  const startPage = opts.startPage || defaults.startPage
  const perPage = opts.perPage || defaults.perPage
  const pageLimit = opts.pageLimit || null

  const getPage = page => API.getPhotos({ page, per_page: perPage, extras })
  const isDone = res => (debug(`Page ${res.data.photos.page} of ${pageLimit || res.data.photos.pages}`), (res.data.photos.page === res.data.photos.pages || (pageLimit && res.data.photos.page === pageLimit))) // eslint-disable-line no-sequences
  const extractData = R.path(['data', 'photos', 'photo'])

  return new StreamFromPromiseGenerator(
    PaginatedGenerator(getPage, isDone, extractData, startPage),
    { flatten: true },
    { objectMode: true }
  )
}

module.exports = createPhotosStream
