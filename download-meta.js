#!/usr/bin/env node

const cli = require('commander')
const { version } = require('./package.json')
const downloadMeta = require('./lib/download-meta')

const int = x => parseInt(x, 10)

cli
  .version(version)
  .option('-o, --oauth-path <file path>', 'location to store oauth credentials', './.oauth')
  .option('-d, --db-path <file path>', 'location of sqlite db', './nflickr.sqlite')
  .option('-t, --db-table <table name>', 'table name', 'nflickr_photos')
  .option('-s, --page-start <n>', 'number of first page to fetch from flickr', int, 1)
  .option('-p, --page-size <n>', 'number of photos per page', int, 100)
  .option('-l, --page-limit <n>', 'number of pages to fetch', int, NaN)
  .parse(process.argv)

const opts = [
  'oauthPath',
  'dbPath',
  'dbTable',
  'pageStart',
  'pageSize',
  'pageLimit'
].reduce((o, k) => Object.assign({}, o, { [k]: cli[k] }), {})

const output = downloadMeta(opts)

let total = '?'
let count = 0
output.on('total', n => (total = n))

output
  .map(({ id, url }) => `${++count}/${total} | ${id} | ${url}\n`)
  .pipe(process.stdout)
