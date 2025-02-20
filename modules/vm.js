const vm = require('node:vm')
const _ = require('lodash')


const env = {
  _,
  lodash: _,
  require,
  console,
  Buffer,
  global: {}
}

const context = new vm.createContext(env)

const nodejsInterpreter = ({ code }) => {
  const script = new vm.Script(`{${code}}`)
  let result = script.runInContext(context)
  return JSON.stringify(result)
}

module.exports = {
  nodejsInterpreter
}