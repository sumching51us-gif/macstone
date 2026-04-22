<template>
  <router-view />

  <!-- Auto-update progress panel -->
  <Transition name="slide-fade">
    <div v-if="updateState.visible" class="update-panel">
      <div class="update-header">
        <span class="update-title">{{ updateState.title }}</span>
        <div v-if="updateState.done" class="update-actions">
          <button class="update-btn secondary" @click="openReleasePage">
            手动下载
          </button>
          <button class="update-btn" @click="installUpdate">
            重启安装
          </button>
        </div>
      </div>
      <el-progress
        v-if="!updateState.done"
        :percentage="updateState.percent"
        :show-text="true"
        :stroke-width="6"
        status="success"
      />
      <div v-if="!updateState.done" class="update-meta">
        {{ updateState.transferred }} / {{ updateState.total }} — {{ updateState.speed }}
      </div>
      <div v-if="updateState.error" class="update-error">
        {{ updateState.error }}
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { onMounted, onUnmounted, reactive } from 'vue'

const updateState = reactive({
  visible: false,
  title: '发现新版本',
  percent: 0,
  transferred: '',
  total: '',
  speed: '',
  done: false,
  error: '',
})

let unlistenUpdate = null
let unlistenProgress = null
let unlistenDownloaded = null

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function installUpdate() {
  window.megspotAPI?.send('updateNow')
}

function openReleasePage() {
  window.megspotAPI?.openExternal('https://github.com/sumching51us-gif/macstone/releases/latest')
}

onMounted(() => {
  try {
    window.megspotAPI?.send('renderer-ready', 'App mounted')
  } catch (e) {}

  unlistenUpdate = window.megspotAPI?.on('updater:available', (info) => {
    updateState.visible = true
    updateState.title = `发现新版本 AnyStone ${info.version}`
    updateState.percent = 0
    updateState.done = false
  })

  unlistenProgress = window.megspotAPI?.on('updater:progress', (info) => {
    updateState.visible = true
    updateState.percent = Math.round(info.percent || 0)
    updateState.transferred = formatBytes(info.transferred || 0)
    updateState.total = formatBytes(info.total || 0)
    updateState.speed = formatBytes(info.bytesPerSecond || 0) + '/s'
  })

  unlistenDownloaded = window.megspotAPI?.on('updater:downloaded', () => {
    updateState.visible = true
    updateState.title = '更新已下载完成'
    updateState.percent = 100
    updateState.done = true
  })

  window.megspotAPI?.on('updater:error', (err) => {
    console.error('[Updater] renderer error:', err)
    updateState.error = err.message || String(err)
  })
})

onUnmounted(() => {
  unlistenUpdate?.()
  unlistenProgress?.()
  unlistenDownloaded?.()
})
</script>

<style scoped>
.update-panel {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 280px;
  padding: 14px 16px;
  background: rgba(30, 30, 30, 0.92);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  color: #fff;
  font-size: 13px;
}
.update-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.update-title {
  font-weight: 600;
  font-size: 14px;
}
.update-actions {
  display: flex;
  gap: 6px;
}
.update-btn {
  padding: 4px 12px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}
.update-btn:hover {
  background: #66b1ff;
}
.update-btn.secondary {
  background: transparent;
  border: 1px solid #666;
  color: #ccc;
}
.update-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.update-meta {
  margin-top: 6px;
  font-size: 11px;
  color: #aaa;
  text-align: right;
}
.update-error {
  margin-top: 6px;
  font-size: 11px;
  color: #f56c6c;
  word-break: break-all;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
