#!/usr/bin/env node

const fs = require('fs')
const cli = require('commander')
const { version } = require('./package.json')
const download = require('./lib/download')

const usage = '<destination dir> [options]'

cli
  .version(version)
  .usage(usage)
  .option('-o, --oauth-path <file path>', 'location to store oauth credentials', './.oauth')
  .option('-d, --db-path <file path>', 'location of sqlite db', './nflickr.sqlite')
  .option('-t, --db-table <table name>', 'table name', 'nflickr_photos')
  .parse(process.argv)

const opts = [
  'oauthPath',
  'dbPath',
  'dbTable'
].reduce((o, k) => Object.assign({}, o, { [k]: cli[k] }), {})

const die = msg => {
  console.error(msg)
  process.exit(1)
}

const destDir = cli.args[0]
if (!destDir) die(`Missing <destination dir>\n`)
try {
  const stat = fs.statSync(destDir)
  if (!stat.isDirectory()) die(`${destDir} is not a directory`)
} catch (err) {
  die(err.message)
}
opts.destDir = destDir

const output = download(opts)

let total = '?'
let current = 0
output.on('total', n => {
  total = n
})

const time = () => new Date().toISOString().split('T')[1].split('.')[0]

output
  .map(({ url, path, bytes }) => `${time()} ${++current}/${total}\n`)
  .pipe(process.stdout)
