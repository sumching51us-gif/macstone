<template>
  <div ref="wrapperRef" class="content-wrapper" tabindex="-1" @keydown="handleKeydown" @keyup="handleKeyup">
    <div class="canvas-container" :style="containerStyle">
      <div
        v-for="(imgPath, index) in displayList"
        :key="imgPath + index"
        class="canvas-wrapper"
      >
        <ImageCanvas
          ref="canvasRefs"
          :index="index"
          :path="imgPath"
          :blinkPath="getBlinkPath(index)"
          :blinkActive="swapIndex === index"
          :_width="canvasWidth"
          :_height="canvasHeight"
          :selectedId="selectedId"
          @select="handleSelect"
          @action="handleAction"
        />
      </div>
    </div>

    <!-- Blink buttons: select a canvas, then hold Left/Right to swap neighbor image into it -->
    <div v-if="displayList.length > 1" class="blink-bar">
      <div class="blink-hint">
        {{ selectedIndex >= 0 ? 'Selected: ' + selectedName : 'Click an image to select' }}
      </div>
      <div class="blink-buttons">
        <button
          v-for="(label, i) in blinkLabels"
          :key="label"
          class="blink-btn"
          :class="{ active: swapIndex >= 0 && activeBlinkDirection === i }"
          :disabled="selectedIndex < 0"
          :title="`Show ${getNeighborName(i)} here`"
          @mousedown.prevent="startBlink(i)"
          @mouseup.prevent="endBlink"
          @mouseleave.prevent="endBlink"
          @touchstart.prevent="startBlink(i)"
          @touchend.prevent="endBlink"
        >
          {{ label }}
        </button>
      </div>
      <div class="blink-hint keyboard">Keys: 1–{{ Math.min(displayList.length, 9) }} select</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, onActivated, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useImageStore } from '@/store/imageStore'
import { useImageSnapshotStore } from '@/store/imageSnapshotStore'
import ImageCanvas from './ImageCanvas.vue'
import { getFileName } from '@/utils/get-file-name'

const props = defineProps({
  snapshotMode: { type: Boolean, default: false }
})

const route = useRoute()
const imageStore = useImageStore()
const snapshotStore = useImageSnapshotStore()

const wrapperRef = ref(null)
const canvasRefs = ref([])
const canvasWidth = ref(400)
const canvasHeight = ref(300)
const selectedId = ref('')
const swapIndex = ref(-1)
const swapSource = ref(-1)
const activeBlinkDirection = ref(-1)

const layout = computed(() => imageStore.imageConfig.layout)

const displayList = computed(() => {
  if (props.snapshotMode && snapshotStore.files.length) {
    return snapshotStore.files.map((f) => f.path)
  }
  return imageStore.imageList
})

const selectedIndex = computed(() => displayList.value.indexOf(selectedId.value))
const selectedName = computed(() => {
  if (selectedIndex.value < 0) return ''
  return getFileName(displayList.value[selectedIndex.value])
})

const isVerticalLayout = computed(() => {
  const rows = parseInt(layout.value.charAt(2), 10) || 1
  return rows >= 2
})

const blinkLabels = computed(() => {
  return isVerticalLayout.value ? ['Top', 'Bottom'] : ['Left', 'Right']
})

const getNeighborName = (direction) => {
  const si = selectedIndex.value
  if (si < 0) return ''
  const len = displayList.value.length
  const source = direction === 0 ? (si + 1) % len : (si - 1 + len) % len
  return getFileName(displayList.value[source])
}

const getBlinkPath = (index) => {
  if (swapIndex.value === index && swapSource.value >= 0) {
    return displayList.value[swapSource.value]
  }
  return ''
}

const containerStyle = computed(() => {
  const first = parseInt(layout.value.charAt(0), 10)
  const last = parseInt(layout.value.charAt(2), 10)
  const cols = isNaN(first) ? 2 : first
  const rows = isNaN(last) ? 1 : last
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gap: '10px',
    padding: '10px',
    height: '100%',
    boxSizing: 'border-box'
  }
})

const updateCanvasSize = () => {
  const el = wrapperRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const first = parseInt(layout.value.charAt(0), 10)
  const last = parseInt(layout.value.charAt(2), 10)
  const cols = isNaN(first) ? 2 : first
  const rows = isNaN(last) ? 1 : last
  canvasWidth.value = Math.max(100, Math.floor((rect.width - 20 - (cols - 1) * 10) / cols))
  canvasHeight.value = Math.max(100, Math.floor((rect.height - 20 - (rows - 1) * 10) / rows))
}

let resizeObserver = null

onMounted(() => {
  nextTick(() => {
    updateCanvasSize()
    if (wrapperRef.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateCanvasSize())
      resizeObserver.observe(wrapperRef.value)
    }
    window.addEventListener('resize', updateCanvasSize)
    wrapperRef.value?.focus()
  })
})

onBeforeUnmount(() => {
  if (resizeObserver && wrapperRef.value) {
    resizeObserver.unobserve(wrapperRef.value)
    resizeObserver.disconnect()
  }
  window.removeEventListener('resize', updateCanvasSize)
})

onActivated(() => {
  nextTick(() => {
    updateCanvasSize()
    wrapperRef.value?.focus()
    // Reset selection if current selection is no longer in the list
    if (selectedIndex.value < 0 && displayList.value.length > 0) {
      selectedId.value = displayList.value[0]
    }
  })
})

watch(layout, updateCanvasSize)

// Auto-select first image when list changes
watch(displayList, (list) => {
  if (list.length > 0 && selectedIndex.value < 0) {
    selectedId.value = list[0]
  }
}, { immediate: true })

const handleSelect = (path) => {
  selectedId.value = path
}

const startBlink = (direction) => {
  const si = selectedIndex.value
  if (si < 0) return
  const len = displayList.value.length
  // direction 0 = Left/Top -> show next index (right/below neighbor)
  // direction 1 = Right/Bottom -> show prev index (left/above neighbor)
  const source = direction === 0 ? (si + 1) % len : (si - 1 + len) % len
  swapIndex.value = si
  swapSource.value = source
  activeBlinkDirection.value = direction
}

const endBlink = () => {
  swapIndex.value = -1
  swapSource.value = -1
  activeBlinkDirection.value = -1
}

const handleAction = ({ name, data }) => {
  canvasRefs.value.forEach((c) => {
    if (c && typeof c[name] === 'function') {
      c[name](data)
    }
  })
}

const callAll = (methodName, data = {}) => {
  canvasRefs.value.forEach((c) => {
    if (c && typeof c[methodName] === 'function') {
      c[methodName](data)
    }
  })
}

const syncAll = () => {
  const first = canvasRefs.value[0]
  if (!first || typeof first.getPosition !== 'function') return
  const refPos = first.getPosition()
  if (!refPos) return
  canvasRefs.value.forEach((c) => {
    if (c && c !== first && typeof c.syncPosition === 'function') {
      c.syncPosition(refPos)
    }
  })
}

const handleKeydown = (e) => {
  // Number keys to select canvas
  const num = parseInt(e.key, 10)
  if (!isNaN(num) && num >= 1 && num <= displayList.value.length && num <= 9) {
    selectedId.value = displayList.value[num - 1]
    return
  }
  if (e.key === 'r' || e.key === 'R') {
    callAll('rotate', 90)
  } else if (e.key === 'f' || e.key === 'F') {
    callAll('reverse', 1)
  } else if (e.key === 'Escape') {
    endBlink()
  }
}

const handleKeyup = (e) => {
  // No-op: blink is now button-based only
}

// Expose for parent (Toolbar)
defineExpose({
  reset: () => callAll('reset'),
  rotate: (deg) => callAll('rotate', deg),
  reverse: (dir) => callAll('reverse', dir),
  sync: syncAll
})
</script>

<style scoped>
.content-wrapper {
  height: 100%;
  background: #f4f4f5;
  outline: none;
  display: flex;
  flex-direction: column;
}
.canvas-container {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}
.canvas-wrapper {
  min-height: 0;
  overflow: hidden;
}

/* Blink bar */
.blink-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.9);
  border-top: 1px solid #ddd;
  backdrop-filter: blur(4px);
  user-select: none;
}
.blink-hint {
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
}
.blink-hint.keyboard {
  font-family: monospace;
}
.blink-buttons {
  display: flex;
  gap: 8px;
}
.blink-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  padding: 5px 12px;
  border: 1px solid #c0c4cc;
  border-radius: 16px;
  background: #fff;
  color: #606266;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;
  outline: none;
}
.blink-btn:hover:not(:disabled) {
  border-color: #409eff;
  color: #409eff;
  background: #ecf5ff;
}
.blink-btn:active,
.blink-btn.active {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}
.blink-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
