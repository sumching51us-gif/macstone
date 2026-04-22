<template>
  <router-view />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { ElNotification } from 'element-plus'

let unlistenUpdate = null
let unlistenDownloaded = null

onMounted(() => {
  try {
    window.megspotAPI?.send('renderer-ready', 'App mounted')
  } catch (e) {}

  // Listen for auto-updater events from main process
  unlistenUpdate = window.megspotAPI?.on('updater:available', (info) => {
    ElNotification({
      title: '发现新版本',
      message: `AnyStone ${info.version} 正在后台下载...`,
      type: 'info',
      duration: 5000,
    })
  })

  unlistenDownloaded = window.megspotAPI?.on('updater:downloaded', (info) => {
    ElNotification({
      title: '更新已就绪',
      message: `AnyStone ${info.version} 已下载完成，重启应用即可安装。`,
      type: 'success',
      duration: 0,
      showClose: true,
      onClose: () => {
        window.megspotAPI?.send('updateNow')
      },
    })
  })
})

onUnmounted(() => {
  unlistenUpdate?.()
  unlistenDownloaded?.()
})
</script>
