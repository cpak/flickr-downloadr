const R = require('ramda')

const PaginatedGenerator = require('./lib/paginated-generator')
const StreamFromPromiseGenerator = require('./lib/stream-from-promise-generator')

const defaults = {
  perPage: 500,
  startPage: 1
}

const createPhotosStream = opts => {
  const API = opts.api
  const startPage = opts.startPage || defaults.startPage
  const perPage = opts.perPage || defaults.perPage
  const pageLimit = opts.pageLimit || null

  const getPage = page => API.getPhotos({ page, per_page: perPage })
  const isDone = res => res.data.photos.page === res.data.photos.pages || (pageLimit && res.data.photos.page === pageLimit)
  const extractData = R.path(['data', 'photos', 'photo'])

  return new StreamFromPromiseGenerator(
    PaginatedGenerator(getPage, isDone, extractData, startPage),
    { flatten: true },
    { objectMode: true }
  )
}

module.exports = createPhotosStream
