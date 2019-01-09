require('dotenv').config()
const debug = require('debug')('nflickr:flickr')
const R = require('ramda')
const axios = require('axios')
const signRequestConfig = require('../auth/sign-request-config')
const asArray = require('../as-array')
const auth = require('../auth')

// Helpers

const makeRequest = opts => (debug(JSON.stringify(opts)), axios(opts)) // eslint-disable-line no-sequences

const callWith1 = R.compose(
  R.flip,
  R.binary
)(R.call)

const concat = (...args) => args.join()

const spread = fn => argList => fn(...argList)

const arrPrefix = (pf, arr) => [pf].concat(asArray(arr))

// Request construction

const baseConfig = {
  method: 'GET',
  url: 'https://api.flickr.com/services/rest',
  params: {
    nojsoncallback: 1,
    format: 'json'
  }
}

const param = R.curry((k, v, cfg) => R.assocPath(arrPrefix('params', k), v, cfg))

const params = R.curry((ps, cfg) => Object.keys(ps).reduce((acc, k) => param(k, ps[k], acc), cfg))

const sign = R.curry((apiKey, apiSecret, token, tokenSecret, cfg) => signRequestConfig(
  { apiKey, apiSecret, token, tokenSecret },
  cfg
))

const base = (extra = {}) => params(extra, R.clone(baseConfig))

// API methods

const getPhotos = extra => base(Object.assign({}, {
  method: 'flickr.people.getPhotos',
  user_id: 'me'
}, extra || {}))

const getSizes = id => base({
  method: 'flickr.photos.getSizes',
  photo_id: id
})

const credentials = R.memoizeWith(concat, (apiKey, apiSecret, oauthPath) =>
  auth(apiKey, apiSecret, oauthPath)
    .then(({ oauth_token: token, oauth_token_secret: tokenSecret }) => ([ apiKey, apiSecret, token, tokenSecret ])))

// Public API

const signedRequestFn = (apiKey, apiSecret, oauthPath) =>
  configFn => R.nAry(configFn.length, (...args) =>
    credentials(apiKey, apiSecret, oauthPath)
      .then(spread(sign))
      .then(callWith1(configFn(...args)))
      .then(makeRequest))

const create = (apiKey, apiSecret, oauthPath) => {
  const api = R.map(signedRequestFn(apiKey, apiSecret, oauthPath), { getPhotos, getSizes })
  api.signedRequest = signedRequestFn(apiKey, apiSecret, oauthPath)(R.identity)
  return api
}

module.exports = create
