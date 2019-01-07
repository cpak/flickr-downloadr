const string = x => `${x}`

const number = x => {
  const maybeFloat = parseFloat(x)
  if (isNaN(x)) throw new Error(`parseFloat failed for input ${x}`)
  return maybeFloat
}

const values = o => Object.keys(o).map(k => o[k])

const sanitize = fields => o => Object
  .keys(fields)
  .reduce((acc, k) => Object.assign({}, acc, { [k]: fields[k](o[k]) }), {})

module.exports = { string, number, values, sanitize }
