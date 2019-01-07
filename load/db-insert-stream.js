const path = require('path')
require('dotenv').load({ path: path.join(__dirname, '.env') })

const AsyncTx = require('./async-tx-stream')
const createClient = require('./sqlite-client')
const createRepo = require('./photos-repo')

const prepareDb = (dbPath, tableName) => createClient(dbPath)
  .then(c => createRepo(c, tableName))
  .then(r => r.createTable().then(() => r))

const thenInsert = p => o => p
  .then(r => r.insertOrIgnore(o))
  .then(({ changes }) =>
    `${changes ? 'inserted' : 'skipped'} "${o.url}" (${o.id})\n`
  )

const createDbInsertStream = (dbPath = process.env.DB_PATH, tableName = process.env.TABLE_NAME) => {
  if (!dbPath) throw new Error('Missing database path')
  if (!tableName) throw new Error('Missing table name')
  const s = new AsyncTx(
    thenInsert(prepareDb(dbPath, tableName)),
    { writableObjectMode: true }
  )

  return s
}

module.exports = createDbInsertStream
