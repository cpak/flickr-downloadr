require('dotenv').config()
const debug = require('debug')('nflickr:main')
const fs = require('fs')
const R = require('ramda')
const B = require('bluebird')

const createApi = require('./lib/flickr')

const KEY = process.env.KEY
const SECRET = process.env.SECRET
const OAUTH_PATH = './.oauth'

const API = createApi(KEY, SECRET, OAUTH_PATH)

const findOriginalUrl = sizes => new Promise((resolve, reject) => {
  const originalUrl = (sizes.find(s => s.label === 'Original') || {}).source
  if (originalUrl) {
    resolve(originalUrl)
  } else {
    reject(new Error('No original URL found'))
  }
})

const downloadTo = path => url => new Promise((resolve, reject) => {
  debug('Downloading %s to %s', url, path)
  const writeStream = fs.createWriteStream(path)
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
      data.on('end', resolve)
      data.pipe(writeStream)
    })
})

const main = () => API
  .getPhotos()
  .then(R.path(['data', 'photos', 'photo']))
  // .then(photos => API.getSizes(photos[0].id))
  .map(R.pipe(R.prop('id'), API.getSizes), { concurrency: 10 })
  .then(R.map(R.pipe(R.path(['data', 'sizes', 'size']), findOriginalUrl)))
  // .then(downloadTo('/tmp/nflickr.jpg'))

main()
  .then(
    console.log,
    console.error
  )
