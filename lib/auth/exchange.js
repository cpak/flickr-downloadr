const axios = require('axios')
const querystring = require('querystring')

const signRequestConfig = require('./sign-request-config')

const requestConfig = verifier => ({
  method: 'GET',
  url: 'https://www.flickr.com/services/oauth/access_token',
  params: {
    oauth_verifier: verifier
  }
})

const exchange = (apiKey, apiSecret, token, tokenSecret, verifier) =>
  axios(signRequestConfig({ apiKey, apiSecret, token, tokenSecret }, requestConfig(verifier)))
    .then(parseData, onError)

const parseData = ({ data }) => querystring.parse(data)

const onError = ({ response: { data } }) => console.error(data)

module.exports = exchange
