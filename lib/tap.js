const debug = require('debug')('nflickr')

const tap = p => d => (debug(p, d), d)
tap.with = (p, fn) => d => (debug(p, fn(d)), d)

module.exports = tap
