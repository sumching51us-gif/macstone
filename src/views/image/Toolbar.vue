<template>
  <div class="toolbar">
    <el-button type="primary" @click="$router.push('/image/index')">{{ $t('general.back') }}</el-button>

    <el-radio-group v-model="compareMode" size="small">
      <el-radio-button label="grid">Grid</el-radio-button>
      <el-radio-button label="swipe">Swipe</el-radio-button>
    </el-radio-group>

    <el-radio-group v-model="layout" size="small" v-if="compareMode === 'grid'">
      <el-radio-button label="1x1">1x1</el-radio-button>
      <el-radio-button label="2x1">2x1</el-radio-button>
      <el-radio-button label="3x1">3x1</el-radio-button>
      <el-radio-button label="1x2">1x2</el-radio-button>
      <el-radio-button label="1x3">1x3</el-radio-button>
      <el-radio-button label="2x2">2x2</el-radio-button>
      <el-radio-button label="2x3">2x3</el-radio-button>
    </el-radio-group>

    <el-checkbox v-model="showCanvasName" size="small">Show name</el-checkbox>
    <el-checkbox v-model="showHistogram" size="small">Histogram</el-checkbox>
    <el-checkbox v-model="showZoomViewer" size="small">Pick</el-checkbox>
    <el-divider direction="vertical" />
    <el-button type="default" size="small" @click="goSingle">Single</el-button>
    <el-divider direction="vertical" />
    <el-button type="default" size="small" @click="emitAction('sync')">Sync</el-button>
    <el-button type="default" size="small" @click="emitAction('reset')">Reset</el-button>
    <el-button type="default" size="small" @click="emitAction('rotate', 90)">Rotate ↻</el-button>
    <el-button type="default" size="small" @click="emitAction('reverse', 1)">Flip H</el-button>
    <el-button type="default" size="small" @click="emitAction('reverse', -1)">Flip V</el-button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useImageStore } from '@/store/imageStore'

const emit = defineEmits(['action'])
const router = useRouter()
const imageStore = useImageStore()

const layout = computed({
  get: () => imageStore.imageConfig.layout,
  set: (v) => imageStore.setImageConfig({ layout: v })
})

const compareMode = computed({
  get: () => imageStore.compareMode,
  set: (v) => imageStore.setCompareMode(v)
})

const showCanvasName = computed({
  get: () => imageStore.showCanvasName,
  set: (v) => imageStore.setShowCanvasName(v)
})

const showHistogram = computed({
  get: () => imageStore.showHistogram,
  set: (v) => imageStore.setShowHistogram(v)
})

const showZoomViewer = computed({
  get: () => imageStore.showZoomViewer,
  set: (v) => imageStore.setShowZoomViewer(v)
})

const emitAction = (name, data) => {
  emit('action', name, data)
}

const goSingle = () => {
  const list = imageStore.imageList
  if (!list.length) return
  imageStore.setSinglePaths(list)
  router.push('/image/single')
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid #eee;
  background: #fff;
  flex-wrap: wrap;
}
</style>
