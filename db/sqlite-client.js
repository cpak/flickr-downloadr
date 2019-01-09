const debug = require('debug')('nflickr:sqlite-client')
const sqlite3 = require('sqlite3')

const run = db => (sql, params = []) =>
  new Promise((resolve, reject) => {
    debug('[run] query "%s" with params "%s"', sql, params)
    db.run(sql, params, function (err) {
      if (err) {
        debug('ERROR', err)
        reject(err)
      } else {
        resolve({ id: this.lastID, changes: this.changes })
      }
    })
  })

const get = db => (sql, params = []) =>
  new Promise((resolve, reject) => {
    debug('[get] query "%s" with params "%s"', sql, params)
    db.get(sql, params, function (err, res) {
      if (err) {
        debug('ERROR', err)
        reject(err)
      } else {
        resolve(res)
      }
    })
  })

const all = db => (sql, params = []) =>
  new Promise((resolve, reject) => {
    debug('[all] query "%s" with params "%s"', sql, params)
    db.all(sql, params, function (err, res) {
      if (err) {
        debug('ERROR', err)
        reject(err)
      } else {
        resolve(res)
      }
    })
  })

const client = db => ({
  run: run(db),
  get: get(db),
  all: all(db)
})

const create = dbFilePath => new Promise((resolve, reject) => {
  const db = new sqlite3.Database(dbFilePath, err => {
    if (err) {
      reject(err)
    } else {
      resolve(client(db))
    }
  })
})

module.exports = create
