const R = require('ramda')
const B = require('bluebird')
const persistence = require('./persistence')
const request = require('./request')
const authorize = require('./authorize')
const exchange = require('./exchange')

const auth = (key, secret) => request(key, secret)
  .then(({ token, tokenSecret }) => authorize(token)
    .then(verifier => exchange(key, secret, token, tokenSecret, verifier)))

const oauthProps = R.pick(['oauth_token', 'oauth_token_secret'])

const strictRead = p => persistence
  .read(p)
  .then(maybeObj => maybeObj || B.reject(new Error('No oauth config found')))

const write = path => obj => persistence.write(path, obj).then(() => obj)

const main = (key, secret, oauthPath) =>
  strictRead(oauthPath)
    .catch(() => auth(key, secret).then(write(oauthPath)))
    .then(oauthProps)

module.exports = main
