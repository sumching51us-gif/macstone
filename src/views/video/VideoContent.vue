<template>
  <div class="content-wrapper">
    <div class="canvas-container" :style="containerStyle">
      <VideoCanvas
        v-for="(videoPath, index) in displayList"
        :key="videoPath + index"
        ref="canvasRefs"
        :index="index"
        :path="videoPath"
        :_width="canvasWidth"
        :_height="canvasHeight"
        :selectedId="selectedId"
        :masterTime="masterTime"
        :paused="paused"
        :speed="videoStore.videoConfig.speed"
        :muted="videoStore.videoConfig.muted"
        @select="handleSelect"
        @update:duration="onDuration"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { useVideoStore } from '@/store/videoStore'
import VideoCanvas from './VideoCanvas.vue'

const videoStore = useVideoStore()
const canvasRefs = ref([])
const selectedId = ref(null)
const masterTime = ref(0)
const paused = ref(true)
const maxDuration = ref(0)

const layout = computed(() => videoStore.videoConfig.layout)

const displayList = computed(() => videoStore.videoList)

const containerStyle = computed(() => {
  const cols = layout.value.startsWith('2') ? 2 : layout.value.startsWith('1') ? 1 : 2
  const rows = layout.value.endsWith('2') ? 2 : layout.value.endsWith('3') ? 3 : layout.value.endsWith('4') ? 4 : 1
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

const canvasWidth = computed(() => {
  const el = document.querySelector('.content-wrapper')
  if (!el) return 400
  const rect = el.getBoundingClientRect()
  const cols = layout.value.startsWith('2') ? 2 : layout.value.startsWith('1') ? 1 : 2
  return Math.floor((rect.width - 20 - (cols - 1) * 10) / cols)
})

const canvasHeight = computed(() => {
  const el = document.querySelector('.content-wrapper')
  if (!el) return 300
  const rect = el.getBoundingClientRect()
  const rows = layout.value.endsWith('2') ? 2 : layout.value.endsWith('3') ? 3 : layout.value.endsWith('4') ? 4 : 1
  return Math.floor((rect.height - 20 - (rows - 1) * 10) / rows)
})

const handleSelect = (path) => {
  selectedId.value = path
}

const onDuration = (d) => {
  if (d > maxDuration.value) maxDuration.value = d
}

// Sync loop: if not paused, update masterTime from first video
let rafId = null
const syncLoop = () => {
  if (!paused.value && canvasRefs.value.length) {
    const first = canvasRefs.value.find((c) => c)
    if (first) {
      masterTime.value = first.getCurrentTime()
    }
  }
  rafId = requestAnimationFrame(syncLoop)
}

onMounted(() => {
  nextTick(() => {
    rafId = requestAnimationFrame(syncLoop)
  })
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
})

// Expose controls for toolbar
defineExpose({
  togglePlay: () => {
    paused.value = !paused.value
    videoStore.setVideoConfig({ allVideoPaused: paused.value })
  },
  pause: () => {
    paused.value = true
    videoStore.setVideoConfig({ allVideoPaused: true })
  },
  play: () => {
    paused.value = false
    videoStore.setVideoConfig({ allVideoPaused: false })
  },
  reset: () => {
    paused.value = true
    masterTime.value = 0
    videoStore.setVideoConfig({ allVideoPaused: true, currentTime: 0 })
    canvasRefs.value.forEach((c) => { if (c) c.setCurrentTime(0) })
  },
  seek: (t) => {
    masterTime.value = t
    videoStore.setVideoConfig({ currentTime: t })
    canvasRefs.value.forEach((c) => { if (c) c.setCurrentTime(t) })
  },
  stepFrame: (direction) => {
    const fps = videoStore.videoConfig.fps || 30
    const step = direction * (1 / fps)
    masterTime.value = Math.max(0, Math.min(maxDuration.value, masterTime.value + step))
    canvasRefs.value.forEach((c) => { if (c) c.setCurrentTime(masterTime.value) })
  },
  takeScreenshot: async () => {
    const first = canvasRefs.value.find((c) => c)
    if (!first) return null
    const dataURL = await first.takeScreenshot()
    if (!dataURL) return null
    return window.megspotAPI.invoke('screenshot:save', dataURL)
  },
  getDuration: () => maxDuration.value,
  getCurrentTime: () => masterTime.value,
  isPaused: () => paused.value
})
</script>

<style scoped>
.content-wrapper {
  height: calc(100vh - 160px);
  background: #111;
}
.canvas-container {
  box-sizing: border-box;
}
</style>
