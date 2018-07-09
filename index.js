require('dotenv').config()

const authRequest = require('./lib/auth/request')
const authorize = require('./lib/auth/authorize')

const main = authRequest

main(process.env.KEY, process.env.SECRET)
  .then(authorize)
  .then(console.log)
