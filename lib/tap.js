const debug = require('debug')('nflickr')

const tap = p => d => (debug(p, d), d)

module.exports = tap
