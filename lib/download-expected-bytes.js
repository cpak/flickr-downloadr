const EventEmitter = require('events')
const debug = require('debug')('downloadr:bytes')
const H = require('highland')
const got = require('got')
const parallel = require('parallel-transform')
const getRepo = require('./repo')()

// Helpers

const callMethodWith = (methodName, ...args) => o => o[methodName](...args)

// DB

const getAllRecords = (dbPath, dbTable) => getRepo(dbPath, dbTable)
  .then(callMethodWith('getAll'))

const getRecordsOfType = (dbPath, dbTable, type) => getRepo(dbPath, dbTable)
  .then(callMethodWith('getByType', type))

const updateDb = (dbPath, dbTable) => o => getRepo(dbPath, dbTable)
  .then(callMethodWith('update', o))

// Get Content-Length

const getContentLength = ({ url }, cb) => got({ method: 'HEAD', url })
  .then(({ headers }) => cb(null, headers['content-length']))
  .catch(cb)

// Main

module.exports = o => {
  debug('Options: %o', o)
  const { dbPath, dbTable, concurrent, photosOnly, force, dryRun } = o

  let output

  const promisedRecords = (photosOnly ? getRecordsOfType(dbPath, dbTable, 'photo') : getAllRecords(dbPath, dbTable))
    .then(rs => force ? rs : rs.filter(({ bytes }) => !bytes || bytes === '0'))
    .then(rs => {
      debug(`Total: ${rs.length}`)
      output.emit('total', rs.length)
      return rs
    })

  const records = H(promisedRecords).sequence()

  if (dryRun) {
    output = records
    EventEmitter.call(output)
    return output
  }

  const download = H(records.pipe(parallel(concurrent, getContentLength)))

  output = download
    .zip(records.observe())
    .map(([bytes, record]) => Object.assign({}, record, { bytes }))
    .doto(updateDb(dbPath, dbTable))

  EventEmitter.call(output)

  return output
}
