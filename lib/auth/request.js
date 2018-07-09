const querystring = require('querystring')
const axios = require('axios')

const signedRequestConfig = require('./signed-request-config')

const requestConfig = {
  method: 'GET',
  url: 'https://www.flickr.com/services/oauth/request_token'
}

const requestToken = (apiKey, secret) => axios(signedRequestConfig(apiKey, secret, requestConfig))
  .then(extractToken, onError)

const extractToken = ({ data }) => querystring.parse(data).oauth_token

const onError = ({ response: { data } }) => console.error(data)

module.exports = requestToken
