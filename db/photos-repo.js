const { string, int, values, sanitize: _sanitize, sanitizePartial: _sanitizePartial } = require('./lib/repo-utils')

const fields = {
  id: string,
  url: string,
  owner: string,
  secret: string,
  server: string,
  farm: int,
  title: string,
  path: string
}

const sanitize = _sanitize(fields)
const sanitizePartial = _sanitizePartial(fields)

const DEFAULT_TABLE_NAME = 'photos'

const CREATE_TABLE_SQL = tableName => `
CREATE TABLE IF NOT EXISTS ${tableName} (
  id VARCHAR(255) PRIMARY KEY,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  url VARCHAR(255),
  owner VARCHAR(255),
  secret VARCHAR(255),
  server VARCHAR(255),
  farm INTEGER,
  title VARCHAR(255),
  path VARCHAR(255)
)`
const createTable = (client, tableName) => () => client.run(CREATE_TABLE_SQL(tableName))

const INSERT_SQL = tableName => `INSERT INTO ${tableName}
  (id, url, owner, secret, server, farm, title, path)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
const insert = (client, tableName) => o => client.run(INSERT_SQL(tableName), values(sanitize(o)))

const INSERT_OR_IGNORE_SQL = tableName => `INSERT OR IGNORE INTO ${tableName}
  (id, url, owner, secret, server, farm, title, path)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
const insertOrIgnore = (client, tableName) => o => client.run(INSERT_OR_IGNORE_SQL(tableName), values(sanitize(o)))

const UPDATE_SQL = (tableName, cols) => `UPDATE ${tableName} SET ${cols.map(c => c + ' = ?').join(', ')} WHERE id = ?`
const update = (client, tableName) => o => {
  const kv = sanitizePartial(o)
  if (!kv.id) return Promise.reject(new Error('Update data is missing primary key'))
  const id = kv.id
  const keys = Object.keys(kv).filter(k => k !== 'id')
  const values = keys.map(k => kv[k])
  return client.run(UPDATE_SQL(tableName, keys), values.concat(id))
}

const GET_BY_ID_SQL = tableName => `SELECT * FROM ${tableName} WHERE id = ?`
const getById = (client, tableName) => id => client.get(GET_BY_ID_SQL(tableName), [string(id)])

const GET_ALL_SQL = tableName => `SELECT * FROM ${tableName}`
const getAll = (client, tableName) => () => client.all(GET_ALL_SQL(tableName))

const DELETE_BY_ID_SQL = tableName => `DELETE FROM ${tableName} WHERE id = ?`
const deleteById = (client, tableName) => id => client.run(DELETE_BY_ID_SQL(tableName), [string(id)])

const FLUSH_SQL = tableName => `DELETE FROM ${tableName}`
const flush = (client, tableName) => () => client.run(FLUSH_SQL(tableName))

const createRepo = (client, tableName = DEFAULT_TABLE_NAME) => ({
  createTable: createTable(client, tableName),
  insert: insert(client, tableName),
  insertOrIgnore: insertOrIgnore(client, tableName),
  update: update(client, tableName),
  getById: getById(client, tableName),
  getAll: getAll(client, tableName),
  deleteById: deleteById(client, tableName),
  flush: flush(client, tableName)
})

module.exports = createRepo
