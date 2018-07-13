const B = require('bluebird')
const fs = require('fs')
const readFile = B.promisify(fs.readFile)
const writeFile = B.promisify(fs.writeFile)
const parse = require('dotenv/lib/main').parse

const tryParse = str => new B((resolve, reject) => {
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
