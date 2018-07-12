const { promisify } = require('util')
const fs = require('fs')
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const parse = require('dotenv/lib/main').parse

const tryParse = str => new Promise((resolve, reject) => {
  try {
    resolve(parse(str))
  } catch (e) {
    reject(e)
  }
})

const read = dotenvPath => readFile(dotenvPath, 'utf8')
  .then(tryParse)

const _write = (path, str) => writeFile(path, str, 'utf8')

const write = (path, obj) => _write(path, Object.keys(obj)
  .map(k => `${k}=${obj[k]}`)
  .join('\n'))

module.exports = { read, write }
