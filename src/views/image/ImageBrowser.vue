<template>
  <div class="image-browser">
    <div v-if="currentPath" class="browser-header">
      <div class="path-info">
        <el-icon><Folder /></el-icon>
        <el-input
          v-if="editingPath"
          ref="pathInputRef"
          v-model="pathInput"
          class="path-input"
          size="small"
          placeholder="Enter folder path..."
          @keyup.enter="confirmPath"
          @keyup.esc="cancelPath"
          @blur="cancelPath"
        />
        <span
          v-else
          class="path-text"
          :title="currentPath"
          @click="startEditPath"
        >{{ currentPath }}</span>
        <span class="count">{{ files.length }} images</span>
      </div>
      <div class="actions">
        <el-radio-group v-model="browserMode" size="small">
          <el-radio-button label="grid">
            <el-icon><Grid /></el-icon>
          </el-radio-button>
          <el-radio-button label="list">
            <el-icon><List /></el-icon>
          </el-radio-button>
          <el-radio-button label="large">
            <el-icon><Picture /></el-icon>
          </el-radio-button>
        </el-radio-group>
        <el-button
          type="primary"
          size="small"
          :disabled="!selectedFiles.length"
          @click="onCompare"
        >
          {{ $t('general.compare') || 'Compare' }} ({{ selectedFiles.length }})
        </el-button>
        <el-button
          size="small"
          :disabled="!selectedFiles.length"
          @click="onSingle"
        >
          Single
        </el-button>
        <el-button size="small" @click="clearSelection">Clear</el-button>
      </div>
    </div>

    <div class="browser-body" tabindex="-1" @keydown="handleKeydown">
      <div v-if="loading" class="loading-wrap">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>Loading...</span>
      </div>

      <div v-else-if="!files.length" class="empty-state">
        <el-empty :description="currentPath ? 'No images in this folder' : 'Select a folder to preview images'" />
      </div>

      <!-- Grid Mode -->
      <div v-else-if="browserMode === 'grid'" class="image-grid">
        <div
          v-for="(file, index) in files"
          :key="file.path"
          class="image-card"
          :class="{ selected: selectedSet.has(file.path), 'last-clicked': lastClickedIndex === index }"
          @click="handleClick(file, index, $event)"
        >
          <div class="image-thumb" :data-path="file.path">
            <img
              v-if="visibleSet.has(file.path)"
              :src="thumbUrls[file.path] || getImageUrl(file.path)"
              loading="lazy"
              decoding="async"
              draggable="false"
              @error="onImageError(file)"
            />
            <div v-if="selectedSet.has(file.path)" class="check-indicator">
              <el-icon><Check /></el-icon>
            </div>
          </div>
          <div class="image-info">
            <span class="image-name" :title="file.name">{{ file.name }}</span>
            <span class="image-size">{{ file.size }}</span>
          </div>
        </div>
      </div>

      <!-- List Mode -->
      <div v-else-if="browserMode === 'list'" class="image-list">
        <div
          v-for="(file, index) in files"
          :key="file.path"
          class="list-row"
          :class="{ selected: selectedSet.has(file.path), 'last-clicked': lastClickedIndex === index }"
          @click="handleClick(file, index, $event)"
        >
          <div class="list-thumb" :data-path="file.path">
            <img
              v-if="visibleSet.has(file.path)"
              :src="thumbUrls[file.path] || getImageUrl(file.path)"
              loading="lazy"
              decoding="async"
              draggable="false"
              @error="onImageError(file)"
            />
            <div v-if="selectedSet.has(file.path)" class="check-indicator">
              <el-icon><Check /></el-icon>
            </div>
          </div>
          <div class="list-meta">
            <span class="list-name">{{ file.name }}</span>
            <span class="list-size">{{ file.size }}</span>
          </div>
        </div>
      </div>

      <!-- Large Mode -->
      <div v-else-if="browserMode === 'large'" class="image-large">
        <div
          v-for="(file, index) in files"
          :key="file.path"
          class="large-card"
          :class="{ selected: selectedSet.has(file.path), 'last-clicked': lastClickedIndex === index }"
          @click="handleClick(file, index, $event)"
        >
          <div class="large-thumb" :data-path="file.path">
            <img
              v-if="visibleSet.has(file.path)"
              :src="thumbUrls[file.path] || getImageUrl(file.path)"
              loading="lazy"
              decoding="async"
              draggable="false"
              @error="onImageError(file)"
            />
            <div v-if="selectedSet.has(file.path)" class="check-indicator">
              <el-icon><Check /></el-icon>
            </div>
          </div>
          <div class="large-info">
            <span class="large-name">{{ file.name }}</span>
            <span class="large-size">{{ file.size }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, onMounted, onActivated, onDeactivated, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Folder, Loading, Check, Grid, List, Picture } from '@element-plus/icons-vue'
import { readDir, isFile, getExtname, joinPath, formatFileSize, getFileStat } from '@/utils/file'
import { getImageUrlSyncNoCache } from '@/utils/image'
import { useImageStore } from '@/store/imageStore'

const props = defineProps({
  currentPath: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['path-change'])

const router = useRouter()
const imageStore = useImageStore()

const files = ref([])
const loading = ref(false)
const selectedFiles = ref([])
const lastClickedIndex = ref(-1)
const thumbUrls = ref({})
const visibleSet = ref(new Set())
const inflightThumbs = ref(new Set())
const observer = ref(null)

const editingPath = ref(false)
const pathInput = ref('')
const pathInputRef = ref(null)

const selectedSet = computed(() => new Set(selectedFiles.value))

const browserMode = computed({
  get: () => imageStore.browserMode,
  set: (v) => imageStore.setBrowserMode(v)
})

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tif', '.tiff', '.avif', '.ico']

watch(() => props.currentPath, (newPath, oldPath) => {
  if (oldPath) {
    window.megspotAPI.invoke('folder:unwatch')
  }
  refreshFiles()
  if (newPath) {
    window.megspotAPI.invoke('folder:watch', newPath)
  }
}, { immediate: true })
watch([files, browserMode], () => {
  nextTick(setupObserver)
})

let unwatchIpc = null

onMounted(() => {
  nextTick(setupObserver)
  // Listen for folder change events from main process
  unwatchIpc = window.megspotAPI.on('folder:changed', () => {
    refreshFiles(true)
  })
})

onActivated(() => {
  // Force refresh when returning from compare (keep-alive restore)
  nextTick(() => {
    refreshFiles()
    if (props.currentPath) {
      window.megspotAPI.invoke('folder:watch', props.currentPath)
    }
  })
})

onDeactivated(() => {
  window.megspotAPI.invoke('folder:unwatch')
})

onBeforeUnmount(() => {
  window.megspotAPI.invoke('folder:unwatch')
  if (unwatchIpc) {
    unwatchIpc()
    unwatchIpc = null
  }
  if (observer.value) {
    observer.value.disconnect()
    observer.value = null
  }
})

function setupObserver() {
  if (observer.value) {
    observer.value.disconnect()
    observer.value = null
  }
  const container = document.querySelector('.browser-body')
  if (!container) return

  observer.value = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const path = entry.target.dataset.path
          if (path && !visibleSet.value.has(path)) {
            visibleSet.value.add(path)
            generateThumbForPath(path)
          }
        }
      })
    },
    { root: container, rootMargin: '200px 0px' }
  )

  const cards = container.querySelectorAll('[data-path]')
  cards.forEach((card) => observer.value.observe(card))
}

async function generateThumbForPath(filePath) {
  if (thumbUrls.value[filePath]) return
  if (inflightThumbs.value.has(filePath)) return
  inflightThumbs.value.add(filePath)

  const api = typeof window !== 'undefined' && window.megspotAPI
  if (!api?.generateThumbnail) {
    inflightThumbs.value.delete(filePath)
    return
  }
  try {
    const thumbPath = await api.generateThumbnail(filePath)
    thumbUrls.value[filePath] = getImageUrlSyncNoCache(thumbPath)
  } catch {
    thumbUrls.value[filePath] = getImageUrlSyncNoCache(filePath)
  } finally {
    inflightThumbs.value.delete(filePath)
  }
}

async function refreshFiles(keepSelection = false) {
  const path = props.currentPath
  if (!path) {
    files.value = []
    if (!keepSelection) {
      selectedFiles.value = []
      lastClickedIndex.value = -1
    }
    visibleSet.value.clear()
    return
  }
  loading.value = true
  try {
    const list = await readDir(path)
    const imageFiles = []
    for (const name of list) {
      if (name.startsWith('.')) continue
      const fullPath = joinPath(path, name)
      if (!isFile(fullPath)) continue
      const ext = getExtname(fullPath)
      if (!IMAGE_EXTS.includes(ext)) continue
      try {
        const stat = await getFileStat(fullPath)
        imageFiles.push({
          name,
          path: fullPath,
          size: formatFileSize(stat.size)
        })
      } catch {
        imageFiles.push({ name, path: fullPath, size: '' })
      }
    }
    files.value = imageFiles
  } catch (e) {
    files.value = []
  } finally {
    loading.value = false
  }
  if (!keepSelection) {
    selectedFiles.value = []
    lastClickedIndex.value = -1
  } else {
    // Remove selections that no longer exist
    const fileSet = new Set(files.value.map((f) => f.path))
    selectedFiles.value = selectedFiles.value.filter((p) => fileSet.has(p))
  }
  visibleSet.value.clear()
  thumbUrls.value = {} // Clear thumbnail cache so new/modified images get fresh thumbs
}

function getImageUrl(filePath) {
  return getImageUrlSyncNoCache(filePath)
}

function onImageError(file) {
  // silently fail; broken image icon will show
}

function handleClick(file, index, event) {
  if (event.shiftKey && lastClickedIndex.value !== -1) {
    const start = Math.min(lastClickedIndex.value, index)
    const end = Math.max(lastClickedIndex.value, index)
    const pathsToAdd = files.value.slice(start, end + 1).map((f) => f.path)
    const newSet = new Set(selectedFiles.value)
    pathsToAdd.forEach((p) => newSet.add(p))
    selectedFiles.value = Array.from(newSet)
  } else if (event.ctrlKey || event.metaKey) {
    const newSet = new Set(selectedFiles.value)
    if (newSet.has(file.path)) {
      newSet.delete(file.path)
    } else {
      newSet.add(file.path)
    }
    selectedFiles.value = Array.from(newSet)
    lastClickedIndex.value = index
  } else {
    selectedFiles.value = [file.path]
    lastClickedIndex.value = index
  }
}

function clearSelection() {
  selectedFiles.value = []
  lastClickedIndex.value = -1
}

function onCompare() {
  if (!selectedFiles.value.length) return
  const len = selectedFiles.value.length
  let layout = '1x1'
  if (len === 2) layout = '2x1'
  else if (len === 3) layout = '3x1'
  else if (len === 4) layout = '2x2'
  else if (len >= 5) layout = '2x3'
  imageStore.setImageConfig({ layout })
  imageStore.setImages(selectedFiles.value)
  router.push('/image/compare')
}

function onSingle() {
  if (!selectedFiles.value.length) return
  if (selectedFiles.value.length === 1) {
    // Use all files in current folder, jump to selected index
    const allPaths = files.value.map((f) => f.path)
    const idx = allPaths.indexOf(selectedFiles.value[0])
    imageStore.setSinglePaths(allPaths)
    imageStore.setSingleIndex(idx >= 0 ? idx : 0)
  } else {
    // Use only selected files
    imageStore.setSinglePaths(selectedFiles.value)
  }
  router.push('/image/single')
}

function startEditPath() {
  pathInput.value = props.currentPath
  editingPath.value = true
  nextTick(() => {
    pathInputRef.value?.input?.select()
  })
}

async function confirmPath() {
  const raw = pathInput.value.trim()
  if (!raw || raw === props.currentPath) {
    cancelPath()
    return
  }
  try {
    const stat = await window.megspotAPI.fs.stat(raw)
    if (!stat?.isDirectory) {
      ElMessage.warning('Path is not a directory')
      cancelPath()
      return
    }
    editingPath.value = false
    emit('path-change', raw)
  } catch {
    ElMessage.error('Path does not exist')
    cancelPath()
  }
}

function cancelPath() {
  editingPath.value = false
  pathInput.value = props.currentPath
}

function handleKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    onSingle()
  }
}
</script>

<style scoped lang="scss">
.image-browser {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;

  .browser-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: #fff;
    border-bottom: 1px solid #e4e7ed;

    .path-info {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;

      .el-icon {
        color: #e6a23c;
        flex-shrink: 0;
      }

      .path-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
        color: #606266;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        transition: background 0.15s;

        &:hover {
          background: #f0f2f5;
          color: #409eff;
        }
      }

      .path-input {
        flex: 1;
        min-width: 0;

        :deep(.el-input__wrapper) {
          padding: 0 6px;
        }
      }

      .count {
        font-size: 12px;
        color: #909399;
        flex-shrink: 0;
      }
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
  }

  .browser-body {
    flex: 1;
    overflow: auto;
    padding: 12px;

    .loading-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 200px;
      color: #909399;

      .loading-icon {
        animation: rotate 1s linear infinite;
      }
    }

    /* Grid Mode */
    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;

      .image-card {
        background: #fff;
        border-radius: 6px;
        overflow: hidden;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

        &:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        &.selected {
          border-color: #409eff;
        }

        .image-thumb {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          background: #f0f2f5;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .check-indicator {
            position: absolute;
            top: 6px;
            right: 6px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #409eff;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
          }
        }

        .image-info {
          padding: 8px;

          .image-name {
            display: block;
            font-size: 11px;
            color: #303133;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .image-size {
            display: block;
            font-size: 10px;
            color: #909399;
            margin-top: 2px;
          }
        }
      }
    }

    /* List Mode */
    .image-list {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .list-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        background: #fff;
        border-radius: 6px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.15s;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        &.selected {
          border-color: #409eff;
        }

        .list-thumb {
          position: relative;
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 4px;
          background: #f0f2f5;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .check-indicator {
            position: absolute;
            top: 2px;
            right: 2px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #409eff;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
          }
        }

        .list-meta {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;

          .list-name {
            font-size: 13px;
            color: #303133;
            white-space: nowrap;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: thin;

            &::-webkit-scrollbar {
              height: 4px;
            }
            &::-webkit-scrollbar-thumb {
              background: #c0c4cc;
              border-radius: 2px;
            }
          }

          .list-size {
            font-size: 11px;
            color: #909399;
          }
        }
      }
    }

    /* Large Mode */
    .image-large {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 600px;
      margin: 0 auto;
      width: 100%;

      .large-card {
        background: #fff;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

        &:hover {
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        &.selected {
          border-color: #409eff;
        }

        .large-thumb {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;
          background: #f0f2f5;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .check-indicator {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: #409eff;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
          }
        }

        .large-info {
          padding: 10px 14px;

          .large-name {
            display: block;
            font-size: 13px;
            color: #303133;
            word-break: break-all;
          }

          .large-size {
            display: block;
            font-size: 11px;
            color: #909399;
            margin-top: 4px;
          }
        }
      }
    }
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
