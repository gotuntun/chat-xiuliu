<script setup>
import { onMounted, ref, nextTick } from 'vue'
import { UserCircle } from '@vicons/fa'
import { LogoOctocat } from '@vicons/ionicons4'
import { nanoid } from 'nanoid'

import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import CopyButtonPlugin from 'highlightjs-copy'
hljs.addPlugin(new CopyButtonPlugin())

import XiuliuAvatar from '../assets/xiuliu_avatar.jpg'
import ChatAvatar from '../assets/chatgpt.svg'

import { useMainStore } from '../pinia.js'
const mainStore = useMainStore()

const props = defineProps({
  config: {
    type: Object,
    default: () => ({})
  }
})

const md = new MarkdownIt({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="code-block language-${lang}"><code class="language-${lang}">` + str + '</code></pre>'
      } catch (__) {}
    }
    return '<pre class="code-block"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
  },
  linkify: true
})

const scrollToBottom = (id) => {
  const element = document.getElementById(id)
  element.scrollTop = element.scrollHeight
}

const renderUserText = (text) => {
  let resolveText = text.replace(/\n{1,}/g, '\n\n')
  return md.render(resolveText)
}

const openExternalLink = (event) => {
  event.preventDefault()
  ipcRenderer.invoke('open-external', event.target.href || event.target.src)
}

const downloadImage = async (event) => {
  event.preventDefault()
  let linkElement = document.createElement('a')
  linkElement.setAttribute('download', `${event.target.alt}_${nanoid(6)}` || `image_${nanoid(6)}`)
  linkElement.setAttribute('href', event.target.src)
  linkElement.click()
}

onMounted(() => {
  ipcRenderer.on('send-message', (event, arg) => {
    if (arg.action === 'revoke') {
      mainStore.messageList = _.filter(mainStore.messageList, m => m.id !== arg.id)
      return
    }
    if (typeof arg.content === 'string') {
      if (arg.from === props.config.AI_NAME || arg.from === `(${props.config.AI_NAME})`) {
        arg.text = md.render(arg.content)
      } else {
        arg.text = renderUserText(arg.content)
      }
    } else {
      arg.text = ''
      arg.content.forEach((item) => {
        switch (item.type) {
          case 'text':
            arg.text += renderUserText(item.text)
            break
          case 'image_url':
            arg.text += md.render(`![image](${item.image_url.url})`)
            break
        }
      })
    }
    let findExist = _.find(mainStore.messageList, { id: arg.id })
    if (findExist) {
      findExist.text = arg.text
      findExist.tokenCount = arg.tokenCount
      findExist.countToken = arg.countToken
    } else {
      mainStore.messageList.push(arg)
      mainStore.messageList = _.takeRight(mainStore.messageList, 200)
    }
    nextTick(() => {
      scrollToBottom('message-list')
      document.querySelectorAll('pre.code-block code:not(.hljs)').forEach((el) => {
        hljs.highlightElement(el)
      })
      document.querySelectorAll('a:not(.added-link-handle)').forEach((el) => {
        el.classList.add('added-link-handle')
        el.removeEventListener('click', openExternalLink)
        el.addEventListener('click', openExternalLink)
      })
      document.querySelectorAll('.message-content img:not(.added-image-handle)').forEach((el) => {
        el.classList.add('added-image-handle')
        el.removeEventListener('click', downloadImage)
        el.addEventListener('click', downloadImage)
      })
    })
  })
  ipcRenderer.invoke('load-history')
})

const addUserMessage = (message) => {
  let resolveMessage = _.omit(message, ['content', 'type'])
  if (typeof message.content === 'string') {
    resolveMessage.text = renderUserText(message.content)
  } else {
    resolveMessage.text = ''
    message.content.forEach((item) => {
      switch (item.type) {
        case 'text':
          resolveMessage.text += renderUserText(item.text)
          break
        case 'image_url':
          resolveMessage.text += md.render(`![image](${item.image_url.url})`)
          break
      }
    })
  }
  mainStore.messageList.push(resolveMessage)
}

defineExpose({
  addUserMessage
})

</script>

<template>
  <n-list id="message-list">
    <n-card v-for="message in mainStore.messageList" :key="message.id" class="message-card">
      <n-thing>
        <template #avatar>
          <n-avatar v-if="[props.config?.ADMIN_NAME, `(${props.config?.ADMIN_NAME})`, '群聊'].includes(message.from)" size="small">
            <n-icon><UserCircle /></n-icon>
          </n-avatar>
          <n-avatar v-else size="small" :src="XiuliuAvatar"></n-avatar>
        </template>
        <template #header>
          {{message.from}}
        </template>
        <div class="message-content" v-html="message.text"></div>
        <n-spin size="small" v-if="!message.text" />
        <p v-if="message.countToken" class="token-count">Used {{ message.tokenCount }} tokens</p>
      </n-thing>
    </n-card>
    <n-empty description="喵有记录" v-if="mainStore.messageList.length === 0" size="large" style="margin: 10px 0">
      <template #icon>
        <n-icon>
          <LogoOctocat />
        </n-icon>
      </template>
    </n-empty>
  </n-list>
</template>

<style lang="stylus">
#message-list
  margin-top: 8px
  max-height: calc(100vh - 104px)
  overflow-y: auto
.message-card
  margin: 4px 0 6px
  .n-card-header
    padding: 10px 26px 0
  .n-card-content
    padding: 0 26px
  pre
    font-family: Avenir, Helvetica, Arial, sans-serif
    white-space: break-spaces
  .image-container
    display: grid
  .message-content
    img
      max-width: 512px
      margin-top: 4px
      cursor: pointer

.token-count
  font-size: 12px
  color: #999

.code-block
  position: relative
  code.hljs
    border-radius: 4px
.hljs-copy-button
  position: absolute
  right: 4px
  top: 4px
.hljs-copy-alert
  display: none
</style>
