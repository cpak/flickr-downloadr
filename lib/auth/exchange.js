const axios = require('axios')
const querystring = require('querystring')

const signedRequestConfig = require('./signed-request-config')

const requestConfig = (token, verifier) => ({
  method: 'GET',
  url: 'https://www.flickr.com/services/oauth/access_token',
  params: {
    oauth_token: token,
    oauth_verifier: verifier
  }
})

const exchange = (apiKey, apiSecret) => (token, tokenSecret, verifier) => axios(signedRequestConfig({ apiKey, apiSecret, tokenSecret }, requestConfig(token, verifier)))
  .then(parseData, onError)

const parseData = ({ data }) => querystring.parse(data)

const onError = ({ response: { data } }) => console.error(data)

module.exports = exchange
