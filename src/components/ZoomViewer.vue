<template>
  <div
    v-show="enabled && mouseX >= 0 && mouseY >= 0"
    class="zoom-viewer"
    :style="viewerStyle"
  >
    <div v-if="showPos" class="pos-info">{{ displayPos }}</div>
    <canvas ref="zoomCanvas" :width="size" :height="size" />
    <div class="color-tip" @click="copyColor">
      <div class="color-box" :style="boxStyle" />
      <span class="color-text">{{ colorText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  sourceCanvas: { type: Object, default: null },
  enabled: { type: Boolean, default: false },
  pixelNum: { type: Number, default: 9 },
  size: { type: Number, default: 90 },
  mouseX: { type: Number, default: -1 },
  mouseY: { type: Number, default: -1 },
  showPos: { type: Boolean, default: true },
  colorMode: { type: String, default: 'rgb' }
})

const zoomCanvas = ref(null)
const r = ref(0)
const g = ref(0)
const b = ref(0)

const viewerStyle = computed(() => ({
  left: `${props.mouseX + 16}px`,
  top: `${props.mouseY + 16}px`
}))

const displayPos = computed(() =>
  `${Math.round(props.mouseX)},${Math.round(props.mouseY)}`
)

const colorText = computed(() => {
  if (props.colorMode === 'hex') {
    const hex = ((1 << 24) + (r.value << 16) + (g.value << 8) + b.value)
      .toString(16)
      .slice(1)
      .toUpperCase()
    return hex
  }
  return `${r.value},${g.value},${b.value}`
})

const boxStyle = computed(() => ({
  backgroundColor: `rgb(${r.value},${g.value},${b.value})`
}))

function draw() {
  if (!props.enabled || !props.sourceCanvas || !zoomCanvas.value) return
  if (props.mouseX < 0 || props.mouseY < 0) return

  const c = props.sourceCanvas
  const mouseX = Math.min(Math.max(0, props.mouseX), c.width)
  const mouseY = Math.min(Math.max(0, props.mouseY), c.height)

  const pixelNum = props.pixelNum
  const half = Math.floor(pixelNum / 2)
  const sx = Math.max(0, Math.min(c.width - pixelNum, Math.floor(mouseX - half)))
  const sy = Math.max(0, Math.min(c.height - pixelNum, Math.floor(mouseY - half)))

  const ctx = zoomCanvas.value.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, props.size, props.size)
  ctx.drawImage(c, sx, sy, pixelNum, pixelNum, 0, 0, props.size, props.size)

  // Read center pixel
  const cx = Math.floor(props.size / 2)
  const cy = Math.floor(props.size / 2)
  const pixel = ctx.getImageData(cx, cy, 1, 1)
  r.value = pixel.data[0]
  g.value = pixel.data[1]
  b.value = pixel.data[2]

  // Draw center cell border with inverted color
  const cellSize = props.size / pixelNum
  const centerIdx = half
  const brightness = (0.299 * r.value + 0.587 * g.value + 0.114 * b.value) / 255
  ctx.strokeStyle = brightness >= 0.8 ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(centerIdx * cellSize + 0.5, centerIdx * cellSize + 0.5, cellSize - 1, cellSize - 1)
}

watch(() => [props.mouseX, props.mouseY, props.enabled, props.sourceCanvas], draw, { flush: 'post' })

function copyColor() {
  navigator.clipboard?.writeText(colorText.value)?.catch(() => {})
}
</script>

<style scoped>
.zoom-viewer {
  position: absolute;
  z-index: 20;
  pointer-events: none;
}
.zoom-viewer canvas {
  display: block;
  border: 1px solid rgba(254, 254, 254, 0.7);
  background: #000;
}
.pos-info {
  height: 18px;
  line-height: 18px;
  text-align: center;
  font-size: 10px;
  color: #fefefe;
  background: #22272e;
  border-radius: 3px 3px 0 0;
  margin-bottom: 1px;
}
.color-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  pointer-events: auto;
  cursor: pointer;
}
.color-box {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  outline: 1px solid rgba(254, 254, 254, 0.5);
  flex-shrink: 0;
}
.color-text {
  flex: 1;
  height: 18px;
  line-height: 18px;
  text-align: center;
  font-size: 10px;
  font-family: monospace;
  color: #fefefe;
  background: #22272e;
  border-radius: 3px;
  padding: 0 4px;
  white-space: nowrap;
}
</style>
