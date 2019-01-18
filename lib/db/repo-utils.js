const string = x => (x === undefined || x === null)
  ? null
  : `${x}`

const int = x => {
  if (x === undefined || x === null) return null
  const maybeInt = parseInt(x, 10)
  if (isNaN(x)) throw new Error(`parseInt failed for input ${x}`)
  return maybeInt
}

const unary = fn => x => fn(x)

const values = o => Object.keys(o).map(k => o[k])

const sanitize = fields => o => Object
  .keys(fields)
  .reduce((acc, k) => Object.assign({}, acc, { [k]: fields[k](o[k]) }), {})

const sanitizePartial = fields => o => Object
  .keys(fields)
  .filter(unary(Array.prototype.includes.bind(Object.keys(o))))
  .reduce((acc, k) => Object.assign({}, acc, { [k]: fields[k](o[k]) }), {})

module.exports = { string, int, values, sanitize, sanitizePartial }
