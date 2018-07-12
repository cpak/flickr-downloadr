const R = require('ramda')
const signRequestConfig = require('./lib/auth/sign-request-config')
const asArray = require('./lib/as-array')

const baseConfig = {
  method: 'GET',
  url: 'https://api.flickr.com/services/rest',
  params: {
    nojsoncallback: 1,
    format: 'json'
  }
}

const arrPrefix = (pf, arr) => [pf].concat(asArray(arr))

const param = R.curry((k, v, cfg) => R.assocPath(arrPrefix('params', k), v, cfg))

const sign = R.curry((apiKey, apiSecret, token, tokenSecret, cfg) => signRequestConfig(
  { apiKey, apiSecret, token, tokenSecret },
  cfg
))

module.exports = {
  base: () => R.clone(baseConfig),
  param,
  sign
}
