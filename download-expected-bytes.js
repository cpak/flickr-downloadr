#!/usr/bin/env node

const cli = require('commander')
const { version } = require('./package.json')
const downloadExpectedBytes = require('./lib/download-expected-bytes')

const usage = '[options]'

cli
  .version(version)
  .usage(usage)
  .option('-d, --db-path <file path>', 'location of sqlite db', './nflickr.sqlite')
  .option('-t, --db-table <table name>', 'table name', 'nflickr_photos')
  .option('-o, --type-only <type>', 'download only for items of specified type', null)
  .option('-c, --concurrent <number>', 'number of concurrent downloads', x => parseInt(x, 10), 5)
  .option('-f, --force', 'force download', false)
  .option('-n, --dry-run', 'only output files that would have been downloaded', false)
  .parse(process.argv)

const opts = [
  'dbPath',
  'dbTable',
  'typeOnly',
  'concurrent',
  'force',
  'dryRun'
].reduce((o, k) => Object.assign({}, o, { [k]: cli[k] }), {})

const output = downloadExpectedBytes(opts)

let total = '?'
let current = 0
output.on('total', n => (total = n))

output
  .map(({ url, bytes }) => `${++current}/${total}: ${url} ${bytes}\n`)
  .pipe(process.stdout)
