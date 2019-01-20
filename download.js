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
  .option('-f, --force', 'force download', false)
  .parse(process.argv)

const opts = [
  'oauthPath',
  'dbPath',
  'dbTable',
  'force'
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
output.on('total', n => (total = n))

output
  .map(({ path, bytes, duration }) => `${++current}/${total}: ${path} ${bytes}b, ${duration}ms\n`)
  .pipe(process.stdout)
