require('dotenv').config()

const authRequest = require('./lib/auth/request')
const authorize = require('./lib/auth/authorize')
const accessToken = require('./lib/auth/exchange')

const main = (key, secret) => authRequest(key, secret)
  .then(({ token, tokenSecret }) => authorize(token)
    .then(verifier => accessToken(key, secret)(token, tokenSecret, verifier)))

main(process.env.KEY, process.env.SECRET)
  .then(console.log, console.error)
