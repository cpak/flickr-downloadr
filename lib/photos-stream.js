const EventEmitter = require('events')
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
  const ee = new EventEmitter()
  const API = opts.api
  const extras = formatExtraFields(opts.extras)
  const startPage = opts.startPage || defaults.startPage
  const perPage = parseInt(opts.perPage || defaults.perPage, 10)
  const pageLimit = opts.pageLimit || null

  let totalPhotos = null

  const getPage = page => API.getPhotos({ page, per_page: perPage, extras })

  const isDone = res => {
    const currentPage = parseInt(res.data.photos.page, 10)
    const limit = parseInt(pageLimit || res.data.photos.pages, 10)

    if (!totalPhotos) {
      totalPhotos = (1 + limit - startPage) * perPage
      debug(`Total number of photos to fetch: ${totalPhotos}`)
      ee.emit('total', totalPhotos)
    }
    debug(`Page ${currentPage}/${limit}`)

    return currentPage === limit
  }

  const extractData = R.path(['data', 'photos', 'photo'])

  const pages = PaginatedGenerator(getPage, isDone, extractData, startPage)

  const stream = new StreamFromPromiseGenerator(
    pages,
    { flatten: true },
    { objectMode: true }
  )

  return [ stream, ee ]
}

module.exports = createPhotosStream
