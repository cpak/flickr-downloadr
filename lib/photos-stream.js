const debug = require('debug')('downloadr:photos')
const R = require('ramda')

const PaginatedGenerator = require('./paginated-generator')
const StreamFromPromiseGenerator = require('./stream-from-promise-generator')

const defaults = {
  perPage: 500,
  startPage: 1
}

const formatExtras = x => {
  if (Array.isArray(x)) return x.map(R.trim).join(',')
  if (R.is(String, x)) return R.trim(x)
  return ''
}

const calcPhotosToFetch = (startPage, endPage, perPage, lastPage, photos) => {
  if (endPage === lastPage) return (photos - (startPage - 1) * perPage)
  return (1 + endPage - startPage) * perPage
}

const createPhotosStream = opts => {
  const API = opts.api
  const extras = formatExtras(opts.extras)
  const startPage = parseInt(opts.startPage, 10) || defaults.startPage
  const perPage = parseInt(opts.perPage, 10) || defaults.perPage
  const pagesToFetch = parseInt(opts.pages, 10)
  let endPage = startPage - 1 + pagesToFetch
  let stream = null
  let photosToFetch = null

  const getPage = page => API.getPhotos({ page, per_page: perPage, extras })

  const emitPhotosToFetch = n => stream.emit('total', n)

  const isDone = res => {
    const currentPage = parseInt(res.data.photos.page, 10)
    const totalPages = parseInt(res.data.photos.pages, 10)
    const totalPhotos = parseInt(res.data.photos.total, 10)

    if (isNaN(endPage) || endPage > totalPages) {
      endPage = totalPages
    }

    if (!photosToFetch) {
      photosToFetch = calcPhotosToFetch(startPage, endPage, perPage, totalPages, totalPhotos)
      debug(`Total number of photos to fetch: ${photosToFetch}`)
      emitPhotosToFetch(photosToFetch)
    }

    return currentPage === endPage
  }

  const extractData = R.path(['data', 'photos', 'photo'])

  const pages = PaginatedGenerator(getPage, isDone, extractData, startPage)

  stream = new StreamFromPromiseGenerator(
    pages,
    { flatten: true },
    { objectMode: true }
  )

  return stream
}

module.exports = createPhotosStream
