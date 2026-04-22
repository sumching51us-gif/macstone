<template>
  <div
    class="image-canvas"
    :class="{ selected: isSelected }"
    :style="canvasWrapperStyle"
    @click="handleClick"
    @dblclick="handleDblclick"
  >
    <div v-if="showName" class="header" :title="getFileName(blinkActive && blinkPath ? blinkPath : path)">
      <span class="title-text">
        <span v-if="isSelected" class="selected-mark">✔</span>
        <span v-if="blinkActive && blinkPath" class="blink-mark">●</span>
        {{ getFileName(blinkActive && blinkPath ? blinkPath : path) }}
      </span>
      <span class="meta">
        <span v-if="imgFileSize" class="file-size">{{ imgFileSize }}</span>
        <span v-if="imgNaturalSize" class="size">{{ imgNaturalSize }}</span>
        <span v-if="imgScale !== 'N/A'" class="scale">{{ imgScale }}x</span>
      </span>
    </div>
    <div class="canvas-box">
      <canvas
        ref="canvasRef"
        :width="_width"
        :height="_height"
        @wheel.prevent="handleWheel"
        @mousedown="handleMouseDown"
        @mousemove="handleCanvasMouseMove"
      />
      <Histogram
        :imagePath="path"
        :active="showHistogram"
        :modes="['rgb']"
      />
      <ZoomViewer
        :sourceCanvas="canvasRef"
        :enabled="showZoomViewer && !isDragging"
        :mouseX="zoomMouseX"
        :mouseY="zoomMouseY"
        :showPos="preferenceStore.preference.colorPickerShowPos"
        :colorMode="preferenceStore.preference.colorPickerMode"
      />
      <div v-if="!isReady" class="loading">Loading...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, onActivated, watch, nextTick } from 'vue'
import { getFileName } from '@/utils/get-file-name'
import { getImageUrlSyncNoCache } from '@/utils/image'
import { formatFileSize } from '@/utils/file'
import { SCALE_CONSTANTS, DRAG_CONSTANTS } from '@/constants'
import { useImageStore } from '@/store/imageStore'
import { usePreferenceStore } from '@/store/preferenceStore'
import Histogram from '@/components/Histogram.vue'
import ZoomViewer from '@/components/ZoomViewer.vue'

const props = defineProps({
  index: { type: Number, default: 0 },
  path: { type: String, default: '' },
  blinkPath: { type: String, default: '' },
  blinkActive: { type: Boolean, default: false },
  _width: { type: Number, default: 400 },
  _height: { type: Number, default: 300 },
  snapInfo: { type: Object, default: null },
  selectedId: { type: String, default: null }
})

const emit = defineEmits(['select', 'action'])

const imageStore = useImageStore()
const preferenceStore = usePreferenceStore()

const canvasRef = ref(null)
const ctx = ref(null)
const image = ref(null)
const blinkImage = ref(null)
const imagePosition = ref(null)
const imgScale = ref('N/A')
const imgNaturalSize = ref('')
const imgFileSize = ref('')
const isReady = ref(false)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const hasDragged = ref(false)
const zoomMouseX = ref(-1)
const zoomMouseY = ref(-1)
const DRAG_THRESHOLD = 3

const isSelected = computed(() => props.selectedId === props.path)
const showName = computed(() => imageStore.showCanvasName)
const showHistogram = computed(() => imageStore.showHistogram)
const showZoomViewer = computed(() => imageStore.showZoomViewer)

const canvasWrapperStyle = computed(() => ({
  width: props._width + 'px',
  height: props._height + 'px'
}))

/**************** Image Loading ****************/
const resolvePath = () => {
  if (props.snapInfo) {
    return props.path
  }
  return getImageUrlSyncNoCache(props.path)
}

const getImageInitPos = (canvas, img) => {
  const cw = canvas.width
  const ch = canvas.height
  const iw = img.width
  const ih = img.height
  const canvasRadio = cw / ch
  const imageRadio = iw / ih
  let x = 0, y = 0, height = ch, width = cw
  if (canvasRadio > imageRadio) {
    width = ch * imageRadio
    x = (cw - width) / 2
  } else {
    height = cw / imageRadio
    y = (ch - height) / 2
  }
  return { x, y, width, height }
}

const initImage = async () => {
  isReady.value = false
  imgFileSize.value = ''
  const src = resolvePath()

  // Load file size in parallel
  try {
    const stat = await window.megspotAPI.fs.stat(props.path)
    if (stat && stat.size) {
      imgFileSize.value = formatFileSize(stat.size)
    }
  } catch {
    // ignore
  }

  const img = new Image()
  img.onload = () => {
    image.value = img
    imgNaturalSize.value = `${img.naturalWidth} × ${img.naturalHeight}`
    imagePosition.value = getImageInitPos(canvasRef.value, img)
    drawImage()
    isReady.value = true
    doZoomEnd()
  }
  img.onerror = () => {
    isReady.value = false
    imgNaturalSize.value = ''
  }
  img.src = src
}

let rafId = null
const drawImage = () => {
  if (!ctx.value || !imagePosition.value) return
  const img = props.blinkActive && blinkImage.value ? blinkImage.value : image.value
  if (!img) return
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    const c = canvasRef.value
    ctx.value.clearRect(0, 0, c.width, c.height)
    ctx.value.drawImage(
      img,
      imagePosition.value.x,
      imagePosition.value.y,
      imagePosition.value.width,
      imagePosition.value.height
    )
  })
}

/**************** Interaction ****************/
const checkBorder = (transX, transY, _width, _height) => {
  const cw = props._width
  const ch = props._height
  const iw = _width ?? imagePosition.value.width
  const ih = _height ?? imagePosition.value.height
  // Tighten boundary: image cannot fully leave canvas
  const minVisible = 20 // at least 20px must stay inside
  const isFullyLeft = transX + iw < minVisible
  const isFullyRight = transX > cw - minVisible
  const isFullyTop = transY + ih < minVisible
  const isFullyBottom = transY > ch - minVisible
  return !(isFullyLeft || isFullyRight || isFullyTop || isFullyBottom)
}

const computeConstrainedOffset = (dx, dy) => {
  if (!imagePosition.value) return { x: 0, y: 0 }
  const cw = props._width
  const ch = props._height
  const iw = imagePosition.value.width
  const ih = imagePosition.value.height

  // No drag if image fits entirely within canvas
  if (iw <= cw && ih <= ch) return { x: 0, y: 0 }

  const allowX = iw > cw
  const allowY = ih > ch

  let nx = imagePosition.value.x + (allowX ? dx : 0)
  let ny = imagePosition.value.y + (allowY ? dy : 0)

  // Clamp X: image edges cannot go past canvas edges
  if (allowX) {
    const minX = cw - iw
    const maxX = 0
    nx = Math.max(minX, Math.min(maxX, nx))
  }

  // Clamp Y: image edges cannot go past canvas edges
  if (allowY) {
    const minY = ch - ih
    const maxY = 0
    ny = Math.max(minY, Math.min(maxY, ny))
  }

  return { x: nx - imagePosition.value.x, y: ny - imagePosition.value.y }
}

const checkSize = (transW, transH) => {
  const minW = props._width * SCALE_CONSTANTS
  const minH = props._height * SCALE_CONSTANTS
  return transW >= minW && transH >= minH
}

const doZoom = ({ rate, mousePos }) => {
  if (!imagePosition.value) return
  const pos = imagePosition.value
  let x = mousePos.x - (mousePos.x - pos.x) * rate
  let y = mousePos.y - (mousePos.y - pos.y) * rate
  let height = pos.height * rate
  let width = pos.width * rate
  if ((rate > 1 || checkSize(width, height)) && checkBorder(x, y, width, height)) {
    imagePosition.value = { x, y, width, height }
    ensureCenteredIfFits()
    drawImage()
    doZoomEnd()
  }
}

const doZoomEnd = () => {
  const img = props.blinkActive && blinkImage.value ? blinkImage.value : image.value
  if (img && imagePosition.value) {
    imgScale.value = Number(imagePosition.value.width / img.width).toFixed(2)
    imgNaturalSize.value = `${img.naturalWidth} × ${img.naturalHeight}`
  }
}

const ensureCenteredIfFits = () => {
  if (!imagePosition.value) return
  const cw = props._width
  const ch = props._height
  const iw = imagePosition.value.width
  const ih = imagePosition.value.height
  if (iw <= cw && ih <= ch) {
    imagePosition.value.x = (cw - iw) / 2
    imagePosition.value.y = (ch - ih) / 2
  }
}

const doDrag = ({ offset }) => {
  if (!imagePosition.value) return
  const constrained = computeConstrainedOffset(offset.x, offset.y)
  if (constrained.x !== 0 || constrained.y !== 0) {
    imagePosition.value.x += constrained.x
    imagePosition.value.y += constrained.y
    drawImage()
  }
}

const reset = () => {
  if (image.value) {
    imagePosition.value = getImageInitPos(canvasRef.value, image.value)
    drawImage()
    doZoomEnd()
  }
}

const rotate = (degree) => {
  // simplified: swap width/height and re-center
  if (!image.value) return
  const offscreen = new OffscreenCanvas(image.value.height, image.value.width)
  const offCtx = offscreen.getContext('2d')
  if (degree < 0) {
    offCtx.translate(0, image.value.width)
    offCtx.rotate((-90 * Math.PI) / 180)
  } else {
    offCtx.translate(image.value.height, 0)
    offCtx.rotate((90 * Math.PI) / 180)
  }
  offCtx.drawImage(image.value, 0, 0)
  offscreen.convertToBlob().then((blob) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      image.value = img
      imagePosition.value = getImageInitPos(canvasRef.value, img)
      drawImage()
      doZoomEnd()
    }
    img.src = url
  })
}

const reverse = (direction) => {
  if (!image.value) return
  const offscreen = new OffscreenCanvas(image.value.width, image.value.height)
  const offCtx = offscreen.getContext('2d')
  if (direction > 0) {
    offCtx.translate(image.value.width, 0)
    offCtx.scale(-1, 1)
  } else {
    offCtx.translate(0, image.value.height)
    offCtx.scale(1, -1)
  }
  offCtx.drawImage(image.value, 0, 0)
  offscreen.convertToBlob().then((blob) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      image.value = img
      drawImage()
    }
    img.src = url
  })
}

/**************** Events ****************/
let wheelRafId = null
const handleWheel = (e) => {
  if (wheelRafId) return
  wheelRafId = requestAnimationFrame(() => {
    wheelRafId = null
    const rect = canvasRef.value.getBoundingClientRect()
    const rate = e.deltaY < 0 ? 1.1 : 0.9
    const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    if (e.metaKey || e.ctrlKey) {
      // Solo zoom on this canvas only
      doZoom({ rate, mousePos })
    } else {
      // Global zoom on all canvases
      emit('action', { name: 'doZoom', data: { rate, mousePos, path: props.path } })
    }
  })
}

const handleCanvasMouseMove = (e) => {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  zoomMouseX.value = e.clientX - rect.left
  zoomMouseY.value = e.clientY - rect.top
}

const handleMouseDown = (e) => {
  isDragging.value = true
  hasDragged.value = false
  dragStart.value = { x: e.clientX, y: e.clientY }
  zoomMouseX.value = -1
  zoomMouseY.value = -1
  const isSolo = e.metaKey || e.ctrlKey

  const onMove = (ev) => {
    if (!isDragging.value) return
    const dx = ev.clientX - dragStart.value.x
    const dy = ev.clientY - dragStart.value.y
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      hasDragged.value = true
    }
    if (!hasDragged.value) return
    const offset = { x: dx, y: dy }
    dragStart.value = { x: ev.clientX, y: ev.clientY }
    if (isSolo) {
      doDrag({ offset })
    } else {
      emit('action', { name: 'doDrag', data: { offset, path: props.path } })
    }
  }
  const onUp = () => {
    isDragging.value = false
    if (!isSolo) {
      emit('action', { name: 'doZoomEnd', data: { path: props.path } })
    }
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const handleClick = () => {
  // Drag threshold prevents accidental click after drag
  if (hasDragged.value) {
    hasDragged.value = false
    return
  }
  emit('select', props.path)
}

const handleDblclick = () => {
  if (hasDragged.value) {
    hasDragged.value = false
  }
}

onMounted(() => {
  ctx.value = canvasRef.value.getContext('2d')
  initImage()
})

onActivated(() => {
  // Force reload image when kept-alive component is reactivated
  initImage()
})

const loadBlinkImage = () => {
  if (!props.blinkPath || props.blinkPath === props.path) {
    blinkImage.value = null
    return
  }
  const src = props.snapInfo ? props.blinkPath : getImageUrlSyncNoCache(props.blinkPath)
  const img = new Image()
  img.onload = () => {
    blinkImage.value = img
    if (props.blinkActive) {
      drawImage()
      doZoomEnd()
    }
  }
  img.src = src
}

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (wheelRafId) cancelAnimationFrame(wheelRafId)
  if (image.value && image.value.src && image.value.src.startsWith('blob:')) {
    URL.revokeObjectURL(image.value.src)
  }
  if (blinkImage.value && blinkImage.value.src && blinkImage.value.src.startsWith('blob:')) {
    URL.revokeObjectURL(blinkImage.value.src)
  }
})

watch(() => props.path, initImage)
watch(() => props.blinkPath, loadBlinkImage, { immediate: true })
watch(() => props.blinkActive, () => {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  drawImage()
  doZoomEnd()
})
watch(() => [props._width, props._height], () => {
  nextTick(() => {
    if (image.value && imagePosition.value) {
      drawImage()
    }
  })
})

const getPosition = () => imagePosition.value
const setPosition = (pos) => {
  if (!pos) return
  imagePosition.value = { ...pos }
  drawImage()
  doZoomEnd()
}
const syncPosition = (refPos) => {
  if (!refPos || !image.value) return
  // Sync scale ratio and relative offset, adjusted for this image's size
  const scaleRatio = refPos.width / (image.value.width || refPos.width)
  const xRatio = refPos.x / refPos.width
  const yRatio = refPos.y / refPos.height
  const newWidth = (image.value.width || refPos.width) * scaleRatio
  const newHeight = (image.value.height || refPos.height) * scaleRatio
  imagePosition.value = {
    x: xRatio * newWidth,
    y: yRatio * newHeight,
    width: newWidth,
    height: newHeight
  }
  drawImage()
  doZoomEnd()
}

// Expose methods for parent to call
defineExpose({
  doZoom,
  doDrag,
  doZoomEnd,
  reset,
  rotate,
  reverse,
  getPosition,
  setPosition,
  syncPosition
})
</script>

<style scoped>
.image-canvas {
  border: 1px solid #ddd;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  position: relative;
}
.image-canvas.selected {
  border-color: #409eff;
  outline: 2px solid rgba(64, 158, 255, 0.3);
  outline-offset: -2px;
}
.header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 10px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  backdrop-filter: blur(4px);
  white-space: normal;
  word-break: break-all;
  overflow: hidden;
  line-height: 1.4;
}
.title-text {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.selected-mark {
  color: #f56c6c;
  margin-right: 2px;
}
.blink-mark {
  color: #67c23a;
  margin-right: 4px;
  font-size: 10px;
}
.meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}
.file-size {
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  white-space: nowrap;
}
.size {
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
  white-space: nowrap;
}
.scale {
  color: rgba(255, 255, 255, 0.75);
  font-size: 11px;
  flex-shrink: 0;
  white-space: nowrap;
}
.canvas-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
canvas {
  display: block;
  cursor: grab;
}
canvas:active {
  cursor: grabbing;
}
.loading {
  position: absolute;
  color: #909399;
}
</style>
