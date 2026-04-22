<template>
  <div class="image-center">
    <Toolbar class="toolbar" @action="onToolbarAction" />
    <Content
      :key="gridKey"
      v-if="imageStore.compareMode === 'grid'"
      ref="contentRef"
      class="content-container"
      :snapshotMode="snapshotMode"
    />
    <SwipeCompare
      :key="swipeKey"
      v-else-if="imageStore.compareMode === 'swipe'"
      class="content-container"
      :images="swipeImages"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useImageStore } from '@/store/imageStore'
import Toolbar from './Toolbar.vue'
import Content from './Content.vue'
import SwipeCompare from './SwipeCompare.vue'
import { useWorker } from '@/utils/worker'

const route = useRoute()
const imageStore = useImageStore()
const contentRef = ref(null)

const snapshotMode = computed(() => {
  return Boolean(route.query.snapshotMode)
})

const gridKey = computed(() => 'grid-' + imageStore.imageList.join('|'))

const swipeImages = computed(() => {
  // Swipe compare needs exactly 2 images; fallback to first 2
  const list = imageStore.imageList
  if (list.length >= 2) return [list[0], list[1]]
  if (list.length === 1) return [list[0], list[0]]
  return []
})

const swipeKey = computed(() => 'swipe-' + swipeImages.value.join('|'))

const onToolbarAction = (name, data) => {
  if (contentRef.value && typeof contentRef.value[name] === 'function') {
    contentRef.value[name](data)
  }
}

useWorker('all', 'initFiltersMap')
</script>

<style lang="scss" scoped>
.image-center {
  height: 100%;
  display: flex;
  flex-direction: column;

  .toolbar {
    flex-shrink: 0;
  }

  .content-container {
    flex: 1;
    min-height: 0;
    background: #f4f4f5;
  }
}
</style>
