require('dotenv').config()

const axios = require('axios')

const signedRequestConfig = require('./lib/auth/signed-request-config')

const KEY = process.env.KEY
const SECRET = process.env.SECRET
const TOKEN = '72157693117043810-01de883bbd4e7e23'
const TOKEN_SECRET = '6ff60eb90f72f98c'

const signArgs = { apiKey: KEY, apiSecret: SECRET, tokenSecret: TOKEN_SECRET }

const photoSizes = ({ id }) => {
  const requestConfig = {
    method: 'GET',
    url: 'https://api.flickr.com/services/rest',
    params: {
      method: 'flickr.photos.getSizes',
      nojsoncallback: 1,
      format: 'json',
      photo_id: id,
      oauth_token: TOKEN
    }
  }
  return axios(signedRequestConfig(signArgs, requestConfig))
}

const main = () => {
  const requestConfig = {
    method: 'GET',
    url: 'https://api.flickr.com/services/rest',
    params: {
      method: 'flickr.people.getPhotos',
      nojsoncallback: 1,
      format: 'json',
      oauth_token: TOKEN,
      user_id: 'me'
    }
  }
  return axios(signedRequestConfig(signArgs, requestConfig))
}

const dumpData = ({ data }) => console.log(JSON.stringify(data, null, 2))

main()
  .then(({ data: { photos: { photo: photos } } }) => photoSizes(photos[0]))
  .then(dumpData, console.error)
