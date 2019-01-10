#!/usr/bin/env node

const fs = require('fs')
const cli = require('commander')
const { version } = require('./package.json')
const download = require('.')

const usage = `
  Usage
    $ download <destination dir> [options]

  Options
    --db-path, -d     location of sqlite db
    --db-table, -t    table name
    --page-start, -s  number of first page to fetch from flickr
    --page-size, -p   number of photos per page
    --page-limit, -l  number of pages to fetch

  Examples
    $ download ~/photos -d ~/flickr.db -t photos -s 1 -p 100 -l 10

`
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

const die = msg => {
  console.error(msg)
  process.exit(1)
}

const destDir = cli.args[0]
if (!destDir) die(`Missing <destination dir>\n${usage}`)
try {
  const stat = fs.statSync(destDir)
  if (!stat.isDirectory()) die(`${destDir} is not a directory`)
} catch (err) {
  die(err.message)
}

opts.destDir = destDir
download(opts).pipe(process.stdout)
