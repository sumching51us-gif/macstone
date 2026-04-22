<template>
  <div
    class="home"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <div v-if="isDraggingOver" class="drop-overlay">
      <div class="drop-content">
        <el-icon :size="48"><Upload /></el-icon>
        <span>Drop videos or folders here</span>
      </div>
    </div>
    <div class="toolbar">
      <div class="toolbar-items">
        <el-button size="small" text @click="$router.push('/dashboard')">
          <el-icon><HomeFilled /></el-icon> Home
        </el-button>
        <el-button type="primary" round class="toolbar-item add-folder" @click="addFolder">
          {{ $t('image.toolbar.addFolder') }}
        </el-button>
        <SelectedBtn :selectedList="videoStore.videoList" @remove="removeSelected" @clearAll="videoStore.emptyVideos" />
        <el-button type="primary" round class="toolbar-item" :disabled="!videoStore.videoList.length" @click="compare">
          {{ $t('general.compare') }}
        </el-button>
      </div>
    </div>

    <div class="content">
      <div class="split-left">
        <div class="folder-list">
          <div v-for="folder in videoStore.videoFolders" :key="folder" class="folder-item" @click="selectFolder(folder)">
            <span>{{ folder }}</span>
            <el-button type="danger" text size="small" @click.stop="removeFolder(folder)">×</el-button>
          </div>
          <div v-if="!videoStore.videoFolders.length" class="empty-tip">Click Add Folder</div>
        </div>
      </div>
      <div class="split-right">
        <VideoPreview @addFolder="addFolder" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { HomeFilled, Upload } from '@element-plus/icons-vue'
import { useVideoStore } from '@/store/videoStore'
import SelectedBtn from '@/components/SelectedBtn.vue'
import VideoPreview from './VideoPreview.vue'

const VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.ts', '.m2ts']

const router = useRouter()
const videoStore = useVideoStore()
const isDraggingOver = ref(false)
let dragCounter = 0

onMounted(() => {
  window.addEventListener('keydown', handleHotKey, true)
})
onDeactivated(() => {
  window.removeEventListener('keydown', handleHotKey, true)
})

const handleHotKey = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    compare()
  }
}

const handleDragEnter = () => {
  dragCounter++
  isDraggingOver.value = true
}
const handleDragOver = (e) => {
  e.dataTransfer.dropEffect = 'copy'
}
const handleDragLeave = () => {
  dragCounter--
  if (dragCounter <= 0) {
    isDraggingOver.value = false
    dragCounter = 0
  }
}
const handleDrop = async (e) => {
  isDraggingOver.value = false
  dragCounter = 0
  const files = Array.from(e.dataTransfer.files)
  if (!files.length) return

  const droppedVideos = []
  const droppedFolders = []

  for (const file of files) {
    const filePath = file.path
    if (!filePath) continue
    try {
      const stat = await window.megspotAPI.fs.stat(filePath)
      if (stat.isDirectory) {
        droppedFolders.push(filePath)
      } else if (stat.isFile) {
        const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
        if (VIDEO_EXTS.includes(ext)) {
          droppedVideos.push(filePath)
        }
      }
    } catch {
      // ignore
    }
  }

  for (const folder of droppedFolders) {
    if (!videoStore.videoFolders.includes(folder)) {
      videoStore.setVideoFolders([...videoStore.videoFolders, folder])
    }
  }

  if (droppedVideos.length) {
    videoStore.addVideos(droppedVideos)
  }

  if (droppedVideos.length || droppedFolders.length) {
    ElMessage.success(`Added ${droppedVideos.length} video(s), ${droppedFolders.length} folder(s)`)
  }
}

const compare = () => {
  router.push('/video/compare')
}

const addFolder = async () => {
  const { canceled, filePaths } = await window.megspotAPI.showOpenDialog({
    title: 'add folder',
    properties: ['openDirectory']
  })
  if (canceled || !filePaths?.length) {
    ElMessage.info('Cancelled to add folder')
    return
  }
  const folder = filePaths[0]
  if (videoStore.videoFolders.includes(folder)) {
    ElMessage.info('The folder has been added.')
  } else {
    videoStore.setVideoFolders([...videoStore.videoFolders, folder])
    ElMessage.success('Successed to add folder')
  }
}

const removeFolder = (folder) => {
  const tmp = videoStore.videoFolders.filter((f) => f !== folder)
  videoStore.setVideoFolders(tmp)
  const toRemove = videoStore.videoList.filter((item) => item.startsWith(folder))
  videoStore.removeVideos(toRemove)
  videoStore.setFolderPath('')
}

const selectFolder = (folder) => {
  videoStore.setFolderPath(folder)
}

const removeSelected = () => {
  ElMessage.info('Remove selected (WIP)')
}
</script>

<style scoped lang="scss">
.home {
  color: #606266;
  height: 100%;
  width: 100%;
  margin: 0px;
  padding: 0px;
  box-sizing: border-box;
  position: relative;

  .drop-overlay {
    position: absolute;
    inset: 0;
    z-index: 100;
    background: rgba(64, 158, 255, 0.15);
    border: 3px dashed #409eff;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;

    .drop-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #409eff;
      font-size: 18px;
      font-weight: 500;
    }
  }

  .toolbar {
    display: flex;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #eee;

    .toolbar-item + .toolbar-item {
      margin-left: 10px;
    }
  }

  .content {
    display: flex;
    height: calc(100% - 60px);
    overflow: hidden;
  }

  .split-left {
    width: 280px;
    border-right: 1px solid #eee;
    overflow: auto;
    padding: 10px;
  }
  .split-right {
    flex: 1;
    overflow: auto;
  }

  .folder-list {
    .folder-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px;
      margin-bottom: 6px;
      background: #f5f7fa;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      word-break: break-all;
    }
    .folder-item:hover {
      background: #e4e7ed;
    }
    .empty-tip {
      color: #909399;
      font-size: 12px;
      text-align: center;
      padding: 20px;
    }
  }
}
</style>
