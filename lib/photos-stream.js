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

  const isDone = res => {
    const currentPage = parseInt(res.data.photos.page, 10)
    const limit = parseInt(pageLimit || res.data.photos.pages, 10)

    debug(`Page ${currentPage} of ${limit}`)

    return currentPage === limit
  }

  const extractData = R.path(['data', 'photos', 'photo'])

  const pages = PaginatedGenerator(getPage, isDone, extractData, startPage)

  return new StreamFromPromiseGenerator(
    pages,
    { flatten: true },
    { objectMode: true }
  )
}

module.exports = createPhotosStream
