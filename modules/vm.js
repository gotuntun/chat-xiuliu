const vm = require('node:vm')
const axios = require('axios')
const _ = require('lodash')


const env = {
  axios,
  _,
  lodash: _,
  require,
  Buffer,
  global: {}
}

const context = new vm.createContext(env)

const nodejsInterpreter = ({ code }) => {
  try {
    const script = new vm.Script(`{${code}}`)
    let result = script.runInContext(context)
    return JSON.stringify(result)
  } catch (error) {
    return error
  }
}

module.exports = {
  nodejsInterpreter
}