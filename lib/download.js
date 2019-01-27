const EventEmitter = require('events')
const debug = require('debug')('downloadr:download')
const { promisify } = require('util')
const stat = promisify(require('fs').stat)
const H = require('highland')
const parallel = require('parallel-transform')
const getRepo = require('./repo')()
const downloadTo = require('./download-to').withCallback

// Helpers

const callMethodWith = (methodName, ...args) => o => o[methodName](...args)

const reduceP = (fn, acc, xs) => new Promise((resolve, reject) => {
  if (!xs.length) {
    resolve(acc)
  } else {
    const x = xs[0]
    const xss = xs.slice(1)
    resolve(fn(acc, x).then(acc2 => reduceP(fn, acc2, xss)))
  }
})

const filterP = pred => xs => reduceP((acc, x) => pred(x).then(b => b ? acc.concat(x) : acc), [], xs)

// Files

const needsDownload = destDir => ({ url, path: maybePath, bytes }) => {
  const path = maybePath || downloadTo.getFilePath(destDir, url)
  return stat(path)
    .then(({ size }) => size !== parseInt(bytes, 10))
    .catch(() => true)
}

// DB

const getAllRecords = (dbPath, dbTable) => getRepo(dbPath, dbTable)
  .then(callMethodWith('getAll'))

const updateDb = (dbPath, dbTable) => o => getRepo(dbPath, dbTable)
  .then(callMethodWith('update', o))

// Main

module.exports = o => {
  debug('Options: %o', o)
  const { destDir, dbPath, dbTable, force, dryRun } = o

  let output

  const promisedRecords = getAllRecords(dbPath, dbTable)
    .then(rs => force ? rs : filterP(needsDownload(destDir))(rs))
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

  const download = H(records.pipe(parallel(5, downloadTo(destDir))))

  output = download
    .zip(records.observe())
    .map(([dlResult, record]) => Object.assign({}, record, dlResult))
    .doto(updateDb(dbPath, dbTable))

  return output
}
