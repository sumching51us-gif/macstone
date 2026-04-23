<template>
  <router-view />

  <!-- Update prompt -->
  <Transition name="slide-fade">
    <div v-if="updateState.visible" class="update-panel">
      <div class="update-header">
        <span class="update-title">{{ updateState.title }}</span>
      </div>
      <div class="update-detail">
        运行安装脚本会下载当前架构的安装包并替换应用。
      </div>
      <code class="update-command">{{ updateState.installCommand }}</code>
      <div class="update-actions">
        <button class="update-btn" @click="runInstaller">
          终端安装
        </button>
        <button class="update-btn secondary" @click="copyInstallCommand">
          复制命令
        </button>
        <button class="update-btn secondary" @click="openReleasePage">
          下载页
        </button>
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
  version: '',
  releaseUrl: '',
  installCommand: '',
  error: '',
})

let unlistenUpdate = null

async function runInstaller() {
  updateState.error = ''
  try {
    await window.megspotAPI?.invoke('updater:runInstallCommand')
  } catch (e) {
    updateState.error = e?.message || String(e)
  }
}

async function copyInstallCommand() {
  updateState.error = ''
  try {
    await window.megspotAPI?.invoke('updater:copyInstallCommand')
    updateState.title = `已复制安装命令`
  } catch (e) {
    updateState.error = e?.message || String(e)
  }
}

async function openReleasePage() {
  updateState.error = ''
  try {
    await window.megspotAPI?.invoke('updater:openReleasePage')
  } catch (e) {
    updateState.error = e?.message || String(e)
  }
}

onMounted(() => {
  try {
    window.megspotAPI?.send('renderer-ready', 'App mounted')
  } catch (e) {}

  unlistenUpdate = window.megspotAPI?.on('updater:available', (info) => {
    updateState.visible = true
    updateState.title = `发现新版本 AnyStone ${info.version}`
    updateState.version = info.version || ''
    updateState.releaseUrl = info.releaseUrl || ''
    updateState.installCommand = info.installCommand || ''
    updateState.error = ''
  })

  window.megspotAPI?.on('updater:error', (err) => {
    console.error('[Updater] renderer error:', err)
    updateState.error = err.message || String(err)
  })
})

onUnmounted(() => {
  unlistenUpdate?.()
})
</script>

<style scoped>
.update-panel {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 360px;
  padding: 14px 16px;
  background: rgba(30, 30, 30, 0.92);
  backdrop-filter: blur(12px);
  border-radius: 8px;
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
.update-detail {
  margin-bottom: 8px;
  color: #d7d7d7;
  line-height: 1.5;
}
.update-command {
  display: block;
  max-height: 74px;
  margin-bottom: 10px;
  padding: 8px;
  overflow: auto;
  color: #f4f4f4;
  background: rgba(0, 0, 0, 0.34);
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.4;
  word-break: break-all;
}
.update-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
  background: rgba(255, 255, 255, 0.14);
}
.update-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.22);
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
