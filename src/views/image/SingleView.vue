<template>
  <div ref="singleViewRef" class="single-view" tabindex="-1" @keydown="handleKeydown">
    <div class="single-toolbar">
      <el-button size="small" @click="goBack">
        <el-icon><Back /></el-icon> Back
      </el-button>
      <span class="nav-info">
        <div class="nav-name">
          <el-icon><Document /></el-icon>
          {{ currentName }}
        </div>
        <div v-if="imgSize" class="nav-size">{{ imgSize }}</div>
        <div class="nav-counter">({{ singleIndex + 1 }} / {{ singlePaths.length }})</div>
      </span>
      <el-button-group size="small">
        <el-button @click="prevImage">
          <el-icon><ArrowUp /></el-icon> Prev
        </el-button>
        <el-button @click="nextImage">
          <el-icon><ArrowDown /></el-icon> Next
        </el-button>
      </el-button-group>
    </div>
    <div ref="wrapperRef" class="single-canvas-wrapper">
      <ImageCanvas
        ref="canvasRef"
        :path="currentPath"
        :_width="canvasWidth"
        :_height="canvasHeight"
        :selectedId="null"
        @select="handleSelect"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useImageStore } from '@/store/imageStore'
import { getFileName } from '@/utils/get-file-name'
import { getImageUrlSyncNoCache } from '@/utils/image'
import ImageCanvas from './ImageCanvas.vue'
import { Back, Document, ArrowUp, ArrowDown } from '@element-plus/icons-vue'

const router = useRouter()
const imageStore = useImageStore()

const canvasRef = ref(null)
const wrapperRef = ref(null)
const canvasWidth = ref(800)
const canvasHeight = ref(600)
const positionCache = ref(new Map())
const imgSize = ref('')

const singlePaths = computed(() => imageStore.singlePaths)
const singleIndex = computed({
  get: () => imageStore.singleIndex,
  set: (v) => imageStore.setSingleIndex(v)
})

const currentPath = computed(() => singlePaths.value[singleIndex.value] || '')
const currentName = computed(() => getFileName(currentPath.value))

const updateCanvasSize = () => {
  const el = wrapperRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  canvasWidth.value = Math.max(200, Math.floor(rect.width))
  canvasHeight.value = Math.max(200, Math.floor(rect.height))
}

let resizeObserver = null

const singleViewRef = ref(null)

onMounted(() => {
  nextTick(() => {
    updateCanvasSize()
    if (wrapperRef.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateCanvasSize())
      resizeObserver.observe(wrapperRef.value)
    }
    window.addEventListener('resize', updateCanvasSize)
    // Auto-focus so keyboard works without clicking
    singleViewRef.value?.focus()
  })
})

async function loadImageSize(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(`${img.naturalWidth} × ${img.naturalHeight}`)
    img.onerror = () => resolve('')
    img.src = src
  })
}

watch(currentPath, async (newPath, oldPath) => {
  if (!newPath) {
    imgSize.value = ''
    return
  }
  // Load image size
  try {
    const src = getImageUrlSyncNoCache(newPath)
    imgSize.value = await loadImageSize(src)
  } catch {
    imgSize.value = ''
  }
  // Save old position
  if (oldPath && canvasRef.value?.getPosition) {
    positionCache.value.set(oldPath, canvasRef.value.getPosition())
  }
  // Wait for new image to load, then restore cached position
  await nextTick()
  await nextTick()
  const cached = positionCache.value.get(newPath)
  if (cached && canvasRef.value?.setPosition) {
    canvasRef.value.setPosition(cached)
  }
})

const goBack = () => {
  router.push('/image/compare')
}

const prevImage = () => {
  if (singlePaths.value.length <= 1) return
  const newIndex = singleIndex.value > 0 ? singleIndex.value - 1 : singlePaths.value.length - 1
  switchTo(newIndex)
}

const nextImage = () => {
  if (singlePaths.value.length <= 1) return
  const newIndex = singleIndex.value < singlePaths.value.length - 1 ? singleIndex.value + 1 : 0
  switchTo(newIndex)
}

const switchTo = (index) => {
  const oldPath = currentPath.value
  if (oldPath && canvasRef.value?.getPosition) {
    positionCache.value.set(oldPath, canvasRef.value.getPosition())
  }
  singleIndex.value = index
}

const handleKeydown = (e) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault()
    prevImage()
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault()
    nextImage()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

const handleSelect = () => {
  // no-op in single view
}
</script>

<style scoped lang="scss">
.single-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  outline: none;

  .single-toolbar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    background: #2a2a2a;
    border-bottom: 1px solid #444;

    .nav-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      color: #fff;
      font-size: 13px;
      overflow: hidden;
      flex: 1;
      justify-content: center;
      line-height: 1.3;

      .nav-name {
        display: flex;
        align-items: center;
        gap: 6px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;

        .el-icon {
          color: #909399;
          flex-shrink: 0;
        }
      }

      .nav-size {
        color: #909399;
        font-size: 11px;
        font-family: monospace;
      }

      .nav-counter {
        color: #909399;
        font-size: 11px;
      }
    }
  }

  .single-canvas-wrapper {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    box-sizing: border-box;

    :deep(.image-canvas) {
      width: 100% !important;
      height: 100% !important;
    }
  }
}
</style>
