const querystring = require('querystring')
const axios = require('axios')

const signedRequestConfig = require('./signed-request-config')

const requestConfig = {
  method: 'GET',
  url: 'https://www.flickr.com/services/oauth/request_token'
}

const requestToken = (apiKey, apiSecret) => axios(signedRequestConfig({ apiKey, apiSecret }, requestConfig))
  .then(extractToken, onError)

const extractToken = ({ data }) => {
  const qs = querystring.parse(data)
  return {
    token: qs.oauth_token,
    tokenSecret: qs.oauth_token_secret
  }
}

const onError = ({ response: { data } }) => console.error(data)

module.exports = requestToken
