<template>
  <div
    ref="containerRef"
    class="swipe-compare"
    tabindex="-1"
    @keydown="handleKeydown"
    @keyup="handleKeyup"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <!-- 底层图：右边的图 -->
    <img class="base-img" :src="getImageUrl(images[1])" draggable="false" />

    <!-- 顶层图：左边的图，通过 clip-path 控制显示范围 -->
    <img
      class="top-img"
      :src="getImageUrl(images[0])"
      draggable="false"
      :style="{ clipPath: `inset(0 ${100 - split}% 0 0)` }"
    />

    <!-- 分割线 -->
    <div class="divider" :style="{ left: split + '%' }">
      <div class="divider-handle">
        <el-icon><ArrowLeft /></el-icon>
        <el-icon><ArrowRight /></el-icon>
      </div>
    </div>

    <!-- 标签 -->
    <div class="label left-label">{{ getFileName(images[0]) }}</div>
    <div class="label right-label">{{ getFileName(images[1]) }}</div>

    <!-- 闪烁按钮：按住显示左图，松开恢复右图 -->
    <div class="blink-bar">
      <button
        class="blink-btn"
        @mousedown.stop="startBlink"
        @mouseup.stop="endBlink"
        @mouseleave.stop="endBlink"
        @touchstart.prevent.stop="startBlink"
        @touchend.prevent.stop="endBlink"
      >
        <el-icon><VideoPlay /></el-icon>
        <span>Hold for Left Image</span>
        <span class="hint">(Space)</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ArrowLeft, ArrowRight, VideoPlay } from '@element-plus/icons-vue'
import { getImageUrlSyncNoCache } from '@/utils/image'
import { getFileName } from '@/utils/get-file-name'

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  }
})

const containerRef = ref(null)
const split = ref(50)
const isDragging = ref(false)
const isBlinking = ref(false)
const preBlinkSplit = ref(50)
const STEP = 2 // keyboard step in percent

const getImageUrl = (path) => getImageUrlSyncNoCache(path)

const updateSplitFromEvent = (e) => {
  const rect = containerRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
  split.value = percent
}

const handleMouseDown = (e) => {
  if (isBlinking.value) return
  isDragging.value = true
  updateSplitFromEvent(e)
}

const handleMouseMove = (e) => {
  if (!isDragging.value || isBlinking.value) return
  e.preventDefault()
  updateSplitFromEvent(e)
}

const handleMouseUp = () => {
  isDragging.value = false
}

const startBlink = () => {
  if (isBlinking.value) return
  isBlinking.value = true
  preBlinkSplit.value = split.value
  split.value = 100
}

const endBlink = () => {
  if (!isBlinking.value) return
  isBlinking.value = false
  split.value = preBlinkSplit.value
}

const handleKeydown = (e) => {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    startBlink()
    return
  }
  if (isBlinking.value) return
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    split.value = Math.max(0, split.value - STEP)
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    split.value = Math.min(100, split.value + STEP)
  } else if (e.key === 'Home') {
    e.preventDefault()
    split.value = 0
  } else if (e.key === 'End') {
    e.preventDefault()
    split.value = 100
  }
}

const handleKeyup = (e) => {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    endBlink()
  }
}

onMounted(() => {
  nextTick(() => {
    containerRef.value?.focus()
  })
})
</script>

<style scoped lang="scss">
.swipe-compare {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  outline: none;
  cursor: ew-resize;
  background: #1a1a1a;

  .base-img,
  .top-img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    pointer-events: none;
  }

  .divider {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #fff;
    transform: translateX(-50%);
    z-index: 10;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
    pointer-events: none;

    .divider-handle {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      color: #333;
      font-size: 12px;
    }
  }

  .label {
    position: absolute;
    bottom: 56px;
    padding: 4px 10px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 12px;
    border-radius: 4px;
    max-width: 40%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    z-index: 5;
    pointer-events: none;
  }

  .left-label {
    left: 12px;
  }

  .right-label {
    right: 12px;
  }

  .blink-bar {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;

    .blink-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 20px;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(6px);
      color: #fff;
      font-size: 13px;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s;
      outline: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

      &:hover {
        background: rgba(0, 0, 0, 0.7);
        border-color: rgba(255, 255, 255, 0.55);
      }

      &:active {
        background: rgba(64, 158, 255, 0.85);
        border-color: rgba(64, 158, 255, 0.9);
      }

      .hint {
        opacity: 0.65;
        font-size: 11px;
      }
    }
  }
}
</style>
