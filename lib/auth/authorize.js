const B = require('bluebird')
const prompt = require('prompt')

const confirmUrl = (token, perms = 'read') => `https://www.flickr.com/services/oauth/authorize?oauth_token=${token}&perms=${perms}`

const authorizationPrompt = token => {
  console.log(`Please authorize app at this URL ${confirmUrl(token)}`)
  return new B((resolve, reject) => {
    prompt.start()
    prompt.get(['code'], (err, { code }) => {
      if (err) {
        reject(err)
      } else {
        resolve(`${code}`.trim())
      }
    })
  })
}

module.exports = authorizationPrompt
