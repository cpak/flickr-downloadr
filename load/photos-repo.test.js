process.env.DEBUG = 'n-flickr:*'
const debug = require('debug')('n-flickr:test')
const DB_PATH = '/home/cpak/Projects/n-flickr-photos/db'

const log = (...args) => () => debug(...args)

const PHOTOS = [
  { url: 'https://farm4.flickr.com/photos/17998592-054a-4f09-99e3-7abeae1dc54b.jpg', date: '2018-11-11', path: '' },
  { url: 'https://farm4.flickr.com/photos/17998592-054a-4f09-99e3-7abeae1dc54b.jpg', date: '2019-01-07', path: '' }
]

const createClient = require('./sqlite-client')
const createRepo = require('./photos-repo')

const runTest = repo => repo.createTable()
  .then(log('flush'))
  .then(() => repo.flush())
  .then(log('Inserting', PHOTOS[0]))
  .then(() => repo.insert(PHOTOS[0]))
  .then(r => {
    debug(r)
    debug('getByUrl')
    return repo.getByUrl(PHOTOS[0].url)
  })
  .then(r => {
    debug(r)
    debug('insertOrIgnore')
    return repo.insertOrIgnore(PHOTOS[1])
  })
  .then(r => {
    debug(r)
    debug('getAll')
    return repo.getAll()
  })
  .then(r => {
    debug(r)
    debug('deleteByUrl')
    return repo.deleteByUrl(PHOTOS[0].url)
  })
  .then(log('flush'))
  .then(() => repo.flush())

createClient(DB_PATH)
  .then(createRepo)
  .then(runTest)
  .then(debug, console.error)
