const { string, values, sanitize: _sanitize } = require('./lib/repo-utils')

const fields = {
  url: string,
  date: string,
  path: string
}

const sanitize = _sanitize(fields)

const DEFAULT_TABLE_NAME = 'photos'

const CREATE_TABLE_SQL = tableName => `
CREATE TABLE IF NOT EXISTS ${tableName} (
  url VARCHAR(255) PRIMARY KEY,
  date DATETIME,
  path VARCHAR(255)
)`
const createTable = (client, tableName) => () => client.run(CREATE_TABLE_SQL(tableName))

const INSERT_SQL = tableName => `INSERT INTO ${tableName}
  (url, date, path)
  VALUES (?, ?, ?)`
const insert = (client, tableName) => o => client.run(INSERT_SQL(tableName), values(sanitize(o)))

const INSERT_OR_IGNORE_SQL = tableName => `INSERT OR IGNORE INTO ${tableName}
  (url, date, path)
  VALUES (?, ?, ?)`
const insertOrIgnore = (client, tableName) => o => client.run(INSERT_OR_IGNORE_SQL(tableName), values(sanitize(o)))

const GET_BY_URL_SQL = tableName => `SELECT * FROM ${tableName} WHERE url = ?`
const getByUrl = (client, tableName) => url => client.get(GET_BY_URL_SQL(tableName), [string(url)])

const GET_ALL_SQL = tableName => `SELECT * FROM ${tableName}`
const getAll = (client, tableName) => () => client.all(GET_ALL_SQL(tableName))

const DELETE_BY_URL_SQL = tableName => `DELETE FROM ${tableName} WHERE url = ?`
const deleteByUrl = (client, tableName) => url => client.run(DELETE_BY_URL_SQL(tableName), [string(url)])

const FLUSH_SQL = tableName => `DELETE FROM ${tableName}`
const flush = (client, tableName) => () => client.run(FLUSH_SQL(tableName))

const createRepo = (client, tableName = DEFAULT_TABLE_NAME) => ({
  createTable: createTable(client, tableName),
  insert: insert(client, tableName),
  insertOrIgnore: insertOrIgnore(client, tableName),
  getByUrl: getByUrl(client, tableName),
  getAll: getAll(client, tableName),
  deleteByUrl: deleteByUrl(client, tableName),
  flush: flush(client, tableName)
})

module.exports = createRepo
