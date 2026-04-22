<template>
  <div class="video-center">
    <VideoToolbar
      :duration="duration"
      :currentTime="currentTime"
      :isPaused="isPaused"
      :fps="videoStore.videoConfig.fps"
      @toggle="onToggle"
      @reset="onReset"
      @seek="onSeek"
      @stepFrame="onStepFrame"
      @screenshot="onScreenshot"
      @compareScreenshot="onCompareScreenshot"
      @updateFps="(v) => videoStore.setVideoConfig({ fps: v })"
    />
    <VideoContent ref="contentRef" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useVideoStore } from '@/store/videoStore'
import { useImageStore } from '@/store/imageStore'
import VideoToolbar from './VideoToolbar.vue'
import VideoContent from './VideoContent.vue'

const router = useRouter()
const videoStore = useVideoStore()
const imageStore = useImageStore()
const contentRef = ref(null)

const duration = ref(0)
const currentTime = ref(0)
const isPaused = ref(true)

let timer = null

const updateToolbarState = () => {
  if (contentRef.value) {
    duration.value = contentRef.value.getDuration()
    currentTime.value = contentRef.value.getCurrentTime()
    isPaused.value = contentRef.value.isPaused()
  }
}

onMounted(() => {
  timer = setInterval(updateToolbarState, 200)
})

onBeforeUnmount(() => {
  clearInterval(timer)
})

const onToggle = () => {
  contentRef.value?.togglePlay()
}

const onReset = () => {
  contentRef.value?.reset()
}

const onSeek = (t) => {
  contentRef.value?.seek(t)
}

const onStepFrame = (direction) => {
  contentRef.value?.stepFrame(direction)
}

const onScreenshot = async () => {
  try {
    const path = await contentRef.value?.takeScreenshot()
    if (path) {
      imageStore.addImage(path)
      ElMessage.success('Screenshot saved, added to image list')
    }
  } catch (err) {
    ElMessage.error('Screenshot failed: ' + (err.message || 'unknown'))
  }
}

const onCompareScreenshot = async () => {
  try {
    const path = await contentRef.value?.takeScreenshot()
    if (path) {
      imageStore.setImages([path])
      router.push('/image/compare')
    }
  } catch (err) {
    ElMessage.error('Screenshot failed: ' + (err.message || 'unknown'))
  }
}
</script>

<style scoped>
.video-center {
  height: 100%;
  background: #111;
}
</style>
