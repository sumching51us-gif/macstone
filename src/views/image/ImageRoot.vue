<template>
  <div
    class="image-root"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- Drop overlay -->
    <div v-if="isDraggingOver" class="drop-overlay">
      <div class="drop-content">
        <el-icon :size="48"><Upload /></el-icon>
        <span>Drop images or folders here</span>
      </div>
    </div>

    <!-- Collapsible Sidebar -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
        <el-icon v-if="sidebarCollapsed"><ArrowRight /></el-icon>
        <el-icon v-else><ArrowLeft /></el-icon>
      </div>
      <div v-show="!sidebarCollapsed" class="sidebar-content">
        <FileTree
          :currentPath="imageStore.currentPath"
          @select="onFolderSelect"
          @expandChange="onExpandChange"
        />
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <div class="home-back">
        <el-button size="small" text @click="$router.push('/dashboard')">
          <el-icon><HomeFilled /></el-icon> Home
        </el-button>
      </div>
      <ImageBrowser
        :currentPath="imageStore.currentPath"
        @path-change="onPathChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onDeactivated } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, HomeFilled, Upload } from '@element-plus/icons-vue'
import { useImageStore } from '@/store/imageStore'
import FileTree from '@/components/FileTree/index.vue'
import ImageBrowser from './ImageBrowser.vue'

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tif', '.tiff', '.avif', '.ico']

const imageStore = useImageStore()
const sidebarCollapsed = ref(false)
const isDraggingOver = ref(false)
let dragCounter = 0

onMounted(() => {
  window.addEventListener('keydown', handleHotKey, true)
})

onDeactivated(() => {
  window.removeEventListener('keydown', handleHotKey, true)
})

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

  const droppedImages = []
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
        if (IMAGE_EXTS.includes(ext)) {
          droppedImages.push(filePath)
        }
      }
    } catch {
      // ignore invalid paths
    }
  }

  // Open the first dropped folder
  if (droppedFolders.length) {
    imageStore.setFolderPath(droppedFolders[0])
  }

  // Add image files directly to compare list
  if (droppedImages.length) {
    imageStore.addImages(droppedImages)
  }

  if (droppedImages.length || droppedFolders.length) {
    ElMessage.success(`Added ${droppedImages.length} image(s), ${droppedFolders.length} folder(s)`)
  }
}

const handleHotKey = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
    e.preventDefault()
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}

const onFolderSelect = (data) => {
  imageStore.setFolderPath(data.path)
}

const onPathChange = (path) => {
  imageStore.setFolderPath(path)
}

const onExpandChange = (keys) => {
  imageStore.expandData = keys
}
</script>

<style scoped lang="scss">
.image-root {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;

  .sidebar {
    position: relative;
    width: 280px;
    flex-shrink: 0;
    border-right: 1px solid #e4e7ed;
    background: #fff;
    transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: width;
    display: flex;
    overflow: hidden;

    &.collapsed {
      width: 24px;
      border-right: 1px solid #e4e7ed;

      .sidebar-toggle {
        width: 24px;
        height: 100%;
      }
    }

    .sidebar-toggle {
      width: 16px;
      min-width: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      background: #f5f7fa;
      border-right: 1px solid #e4e7ed;
      color: #606266;
      transition: background 0.2s;

      &:hover {
        background: #e4e7ed;
        color: #409eff;
      }
    }

    .sidebar-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  }

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

  .main-content {
    flex: 1;
    overflow: hidden;
    min-width: 0;
    display: flex;
    flex-direction: column;

    .home-back {
      flex-shrink: 0;
      padding: 6px 12px;
      background: #fff;
      border-bottom: 1px solid #eee;
    }
  }
}
</style>
