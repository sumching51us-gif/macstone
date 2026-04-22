<template>
  <div class="toolbar">
    <el-button type="primary" @click="$router.push('/video/index')">{{ $t('general.back') }}</el-button>

    <el-radio-group v-model="layout" size="small">
      <el-radio-button label="1x1">1x1</el-radio-button>
      <el-radio-button label="1x2">1x2</el-radio-button>
      <el-radio-button label="2x2">2x2</el-radio-button>
    </el-radio-group>

    <el-button :type="isPaused ? 'success' : 'warning'" size="small" @click="emitToggle">
      {{ isPaused ? 'Play' : 'Pause' }}
    </el-button>
    <el-button type="default" size="small" @click="emitReset">Reset</el-button>

    <el-slider v-model="currentTime" :max="duration" :step="0.1" style="width: 300px" @change="emitSeek" />

    <div class="fps-control">
      <span class="fps-label">FPS</span>
      <el-input-number v-model="fpsValue" size="small" :min="1" :max="120" :step="1" style="width: 70px" @change="emitUpdateFps" />
    </div>

    <el-button-group size="small">
      <el-button @click="emitStepFrame(-1)">
        <el-icon><ArrowLeft /></el-icon> Prev
      </el-button>
      <el-button @click="emitStepFrame(1)">
        Next <el-icon><ArrowRight /></el-icon>
      </el-button>
    </el-button-group>

    <el-button type="info" size="small" @click="emitScreenshot">
      <el-icon><Camera /></el-icon> Screenshot
    </el-button>
    <el-button type="primary" size="small" @click="emitCompareScreenshot">
      <el-icon><Picture /></el-icon> Compare
    </el-button>

    <el-select v-model="speed" size="small" style="width: 80px">
      <el-option label="0.5x" :value="0.5" />
      <el-option label="1x" :value="1" />
      <el-option label="2x" :value="2" />
    </el-select>
    <el-checkbox v-model="muted">Muted</el-checkbox>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, Camera, Picture } from '@element-plus/icons-vue'
import { useVideoStore } from '@/store/videoStore'

const props = defineProps({
  duration: { type: Number, default: 0 },
  currentTime: { type: Number, default: 0 },
  isPaused: { type: Boolean, default: true },
  fps: { type: Number, default: 30 }
})

const emit = defineEmits(['toggle', 'reset', 'seek', 'stepFrame', 'screenshot', 'compareScreenshot', 'updateFps'])

const videoStore = useVideoStore()

const layout = computed({
  get: () => videoStore.videoConfig.layout,
  set: (v) => videoStore.setVideoConfig({ layout: v })
})

const speed = computed({
  get: () => videoStore.videoConfig.speed,
  set: (v) => videoStore.setVideoConfig({ speed: v })
})

const muted = computed({
  get: () => videoStore.videoConfig.muted,
  set: (v) => videoStore.setVideoConfig({ muted: v })
})

const currentTime = ref(props.currentTime)
const fpsValue = ref(props.fps)

watch(() => props.currentTime, (t) => {
  currentTime.value = t
})

watch(() => props.fps, (v) => {
  fpsValue.value = v
})

const emitToggle = () => emit('toggle')
const emitReset = () => emit('reset')
const emitSeek = (t) => emit('seek', t)
const emitStepFrame = (dir) => emit('stepFrame', dir)
const emitScreenshot = () => emit('screenshot')
const emitCompareScreenshot = () => emit('compareScreenshot')
const emitUpdateFps = (v) => emit('updateFps', v)
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid #333;
  background: #1a1a1a;
  color: #fff;
  flex-wrap: wrap;
}
.fps-control {
  display: flex;
  align-items: center;
  gap: 6px;
}
.fps-label {
  font-size: 11px;
  color: #909399;
}
</style>
