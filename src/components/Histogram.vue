<template>
  <div
    v-show="active"
    ref="overlayRef"
    class="histogram-overlay"
    :style="overlayStyle"
    @mousedown="startDrag"
  >
    <canvas ref="canvasRef" width="240" height="135" />
    <div v-if="errorMsg" class="hist-error">{{ errorMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { getImageUrlSyncNoCache } from '@/utils/image'

const props = defineProps({
  imagePath: { type: String, default: '' },
  active: { type: Boolean, default: false },
  modes: { type: Array, default: () => ['rgb'] }
})

const canvasRef = ref(null)
const overlayRef = ref(null)
const errorMsg = ref('')
const isDrawing = ref(false)

// Draggable position
const posX = ref(8)
const posY = ref(8)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })

const overlayStyle = computed(() => ({
  left: `${posX.value}px`,
  top: `${posY.value}px`
}))

const HIST_W = 240
const HIST_H = 135

const currentImg = ref(null)
const offscreenCanvas = ref(null)
const offCtx = ref(null)

function getOffscreenCtx() {
  if (!offscreenCanvas.value) {
    offscreenCanvas.value = document.createElement('canvas')
    offscreenCanvas.value.width = 256
    offscreenCanvas.value.height = 256
    offCtx.value = offscreenCanvas.value.getContext('2d', { willReadFrequently: true })
  }
  return offCtx.value
}

async function loadImage(src) {
  try {
    const res = await fetch(src)
    if (res.ok) {
      const blob = await res.blob()
      const bitmap = await createImageBitmap(blob)
      return bitmap
    }
  } catch {
    // fallback
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = src
  })
}

function computeHistogram(imageData) {
  const data = imageData.data
  const r = new Uint32Array(256)
  const g = new Uint32Array(256)
  const b = new Uint32Array(256)

  for (let i = 0; i < data.length; i += 4) {
    r[data[i]]++
    g[data[i + 1]]++
    b[data[i + 2]]++
  }

  return { r, g, b }
}

function drawChannelBars(ctx, data, color, yOffset, height) {
  // Per-channel normalization so each channel fills its band
  let max = 0
  for (let i = 0; i < 256; i++) {
    if (data[i] > max) max = data[i]
  }
  max = Math.max(1, max)

  ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},0.6)`
  const binW = HIST_W / 256
  for (let i = 0; i < 256; i++) {
    const h = (data[i] / max) * height
    ctx.fillRect(i * binW, yOffset + height - h, binW + 0.5, h)
  }
}

function isGrayscale(hist) {
  // Check if R/G/B histograms are nearly identical (raw counts)
  let diff = 0
  for (let i = 0; i < 256; i++) {
    diff += Math.abs(hist.r[i] - hist.g[i])
    diff += Math.abs(hist.g[i] - hist.b[i])
  }
  const total = hist.r.reduce((a, b) => a + b, 0)
  return diff / Math.max(1, total) < 0.02
}

async function draw() {
  if (isDrawing.value) return
  if (!props.active || !props.imagePath || !canvasRef.value) return
  isDrawing.value = true
  errorMsg.value = ''

  try {
    const c = canvasRef.value
    const ctx = c.getContext('2d')

    // Clear
    ctx.clearRect(0, 0, HIST_W, HIST_H)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(0, 0, HIST_W, HIST_H)

    // Load image
    let img = currentImg.value
    if (!img || img._src !== props.imagePath) {
      const src = getImageUrlSyncNoCache(props.imagePath)
      img = await loadImage(src)
      img._src = props.imagePath
      currentImg.value = img
    }

    // Clear offscreen and draw scaled image
    const ctxOff = getOffscreenCtx()
    ctxOff.clearRect(0, 0, 256, 256)
    ctxOff.drawImage(img, 0, 0, 256, 256)
    const imageData = ctxOff.getImageData(0, 0, 256, 256)
    const hist = computeHistogram(imageData)

    if (isGrayscale(hist)) {
      // Single gray channel fills entire height
      drawChannelBars(ctx, hist.r, [200, 200, 200], 0, HIST_H - 2)
    } else {
      // RGB stacked: R on top, G middle, B bottom
      const slotH = (HIST_H - 4) / 3
      drawChannelBars(ctx, hist.r, [255, 60, 60], 0, slotH)
      drawChannelBars(ctx, hist.g, [60, 255, 60], slotH + 1, slotH)
      drawChannelBars(ctx, hist.b, [60, 120, 255], slotH * 2 + 2, slotH)
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, HIST_W, HIST_H)
  } catch (err) {
    console.warn('Histogram draw error:', err)
    errorMsg.value = '!' + (err.message || 'err')
  } finally {
    isDrawing.value = false
  }
}

watch(() => [props.imagePath, props.active, props.modes], draw, { deep: true })

onMounted(() => {
  nextTick(() => {
    draw()
  })
})

onBeforeUnmount(() => {
  currentImg.value = null
})

// Draggable logic
function startDrag(e) {
  isDragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY }
  dragOffset.value = { x: posX.value, y: posY.value }

  const onMove = (ev) => {
    if (!isDragging.value) return
    const dx = ev.clientX - dragStart.value.x
    const dy = ev.clientY - dragStart.value.y
    posX.value = Math.max(0, dragOffset.value.x + dx)
    posY.value = Math.max(0, dragOffset.value.y + dy)
  }

  const onUp = () => {
    isDragging.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
</script>

<style scoped>
.histogram-overlay {
  position: absolute;
  z-index: 10;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  cursor: grab;
  user-select: none;
}
.histogram-overlay:active {
  cursor: grabbing;
}
.histogram-overlay canvas {
  display: block;
  width: 240px;
  height: 135px;
}
.hist-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #f56c6c;
  font-size: 10px;
  pointer-events: none;
}
</style>
