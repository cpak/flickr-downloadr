const crypto = require('crypto')
const querystring = require('querystring')
const debug = require('debug')('nflickr:auth')

const sign = (data, apiSecret, tokenSecret) => {
  const hmacKey = `${apiSecret}&${tokenSecret || ''}`
  const hmac = crypto.createHmac('SHA1', hmacKey)
  hmac.update(data)
  return hmac.digest('base64')
}

const asQueryString = o => Object
  .keys(o)
  .sort()
  .map(k => `${k}=${querystring.escape(o[k])}`)
  .join('&')

const defaultParams = apiKey => ({
  oauth_consumer_key: apiKey,
  oauth_signature_method: 'HMAC-SHA1',
  oauth_version: '1.0',
  oauth_callback: 'oob'
})

const withAuthVals = opts => {
  const timestamp = `${Math.round(Date.now() / 1000)}`
  const md5 = crypto.createHash('md5').update(timestamp).digest('hex')
  const nonce = md5.substring(0, 32)
  return Object.assign({}, opts, { oauth_timestamp: timestamp, oauth_nonce: nonce })
}

const baseString = (method, url, params) => [
  method,
  encodeURIComponent(url),
  encodeURIComponent(asQueryString(params))
].join('&')

const withSignature = (bs, apiSecret, tokenSecret, params) => Object.assign(
  {},
  { oauth_signature: sign(bs, apiSecret, tokenSecret) },
  params
)

const signedRequestConfig = (args, requestOpts) => {
  const { apiKey, apiSecret, tokenSecret } = args
  debug('request opts: %o', requestOpts)
  const { method, url, params } = requestOpts
  const paramsWithOauthDefaults = Object.assign({}, params, withAuthVals(defaultParams(apiKey)))
  const bs = baseString(method.toUpperCase(), url, paramsWithOauthDefaults)
  debug('base string: %s', bs)
  const signedParams = withSignature(bs, apiSecret, tokenSecret, paramsWithOauthDefaults)
  debug('signed params: %o', signedParams)
  return Object.assign({}, requestOpts, { params: signedParams })
}

module.exports = signedRequestConfig
