const R = require('ramda')
const signRequestConfig = require('./auth/sign-request-config')
const asArray = require('./as-array')

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
const params = R.curry((ps, cfg) => Object.keys(ps).reduce((acc, k) => param(k, ps[k], acc), cfg))

const sign = R.curry((apiKey, apiSecret, token, tokenSecret, cfg) => signRequestConfig(
  { apiKey, apiSecret, token, tokenSecret },
  cfg
))

module.exports = {
  base: (extra = {}) => params(extra, R.clone(baseConfig)),
  param,
  params,
  sign
}
