const debug = require('debug')('nflickr:paginated-generator')

const identity = x => x

const assertFunction = (label, x) => {
  const type = typeof x
  if (type !== 'function') throw new Error(`Expected "${label}" to be function but got "${type}"`)
}

async function * PaginatedGenerator (getPage, isDone, extractData = identity, startPage = 1) {
  assertFunction('getPage', getPage)
  assertFunction('isDone', isDone)
  assertFunction('extractData', extractData)
  let page = startPage
  let done = false
  while (!done) {
    debug(`Fetching page ${page}`)
    const res = await getPage(page)
    done = isDone(res)
    page += 1
    yield extractData(res)
  }
}

module.exports = PaginatedGenerator
