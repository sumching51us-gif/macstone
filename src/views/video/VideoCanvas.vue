<template>
  <div class="video-canvas" :class="{ selected: isSelected }" :style="wrapperStyle">
    <div class="header">
      <span v-html="titleHtml"></span>
      <el-button type="primary" text size="small" @click="fullScreen">
        Fullscreen
      </el-button>
    </div>
    <div class="video-box">
      <video
        ref="videoRef"
        :src="videoSrc"
        :muted="muted"
        :playbackRate="speed"
        style="width: 100%; height: 100%; object-fit: contain"
        @loadedmetadata="onLoaded"
        @ended="onEnded"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { getFileName } from '@/utils/get-file-name'
import { getImageUrlSyncNoCache } from '@/utils/image'

const props = defineProps({
  index: { type: Number, default: 0 },
  path: { type: String, default: '' },
  _width: { type: Number, default: 400 },
  _height: { type: Number, default: 300 },
  selectedId: { type: String, default: null },
  masterTime: { type: Number, default: 0 },
  paused: { type: Boolean, default: true },
  speed: { type: Number, default: 1 },
  muted: { type: Boolean, default: true }
})

const emit = defineEmits(['select', 'update:duration', 'loaded'])

const videoRef = ref(null)
const duration = ref(0)
const isSeeking = ref(false)

const isSelected = computed(() => props.selectedId === props.path)

const wrapperStyle = computed(() => ({
  width: props._width + 'px',
  height: props._height + 'px'
}))

const titleHtml = computed(() => {
  const name = getFileName(props.path)
  return (isSelected.value ? `<span style='color:red'>(✔)</span>` : '') + name
})

const videoSrc = computed(() => {
  return getImageUrlSyncNoCache(props.path)
})

const onLoaded = () => {
  if (videoRef.value) {
    duration.value = videoRef.value.duration || 0
    emit('update:duration', duration.value)
    emit('loaded')
  }
}

const onEnded = () => {
  // keep paused
}

const fullScreen = () => {
  if (videoRef.value) {
    if (videoRef.value.requestFullscreen) {
      videoRef.value.requestFullscreen()
    }
  }
}

// Sync master time
watch(() => props.masterTime, (t) => {
  if (videoRef.value && !isSeeking.value && Math.abs(videoRef.value.currentTime - t) > 0.1) {
    videoRef.value.currentTime = t
  }
})

// Sync play/pause
watch(() => props.paused, (p) => {
  if (!videoRef.value) return
  if (p) {
    videoRef.value.pause()
  } else {
    videoRef.value.play().catch(() => {})
  }
})

// Sync speed
watch(() => props.speed, (s) => {
  if (videoRef.value) {
    videoRef.value.playbackRate = s
  }
})

onMounted(() => {
  if (videoRef.value) {
    videoRef.value.currentTime = props.masterTime
    if (!props.paused) {
      videoRef.value.play().catch(() => {})
    }
  }
})

onBeforeUnmount(() => {
  if (videoRef.value) {
    videoRef.value.pause()
    videoRef.value.src = ''
    videoRef.value.load()
  }
})

const takeScreenshot = async () => {
  if (!videoRef.value) return null
  const video = videoRef.value
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || video.clientWidth
  canvas.height = video.videoHeight || video.clientHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

defineExpose({
  getCurrentTime: () => videoRef.value ? videoRef.value.currentTime : 0,
  setCurrentTime: (t) => {
    if (videoRef.value) videoRef.value.currentTime = t
  },
  play: () => { if (videoRef.value) videoRef.value.play().catch(() => {}) },
  pause: () => { if (videoRef.value) videoRef.value.pause() },
  duration,
  takeScreenshot
})
</script>

<style scoped>
.video-canvas {
  border: 1px solid #ddd;
  background: #000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}
.video-canvas.selected {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  background: #1f1f1f;
  color: #fff;
  border-bottom: 1px solid #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.video-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
video {
  display: block;
  cursor: pointer;
}
</style>
