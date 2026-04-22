<template>
  <div class="preview">
    <div class="toolbar">
      <el-input v-model="currentPath" placeholder="folder path" style="flex:1; margin-right:8px" />
      <el-button type="primary" @click="$emit('addFolder')">{{ $t('image.toolbar.addFolder') }}</el-button>
    </div>
    <div class="file-list">
      <div v-for="file in files" :key="file" class="file-item">
        <el-checkbox v-model="selected" :label="file">{{ file }}</el-checkbox>
      </div>
      <div v-if="!files.length" class="empty-tip">No videos in current folder</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useVideoStore } from '@/store/videoStore'
import { readDir, isFile, getExtname, joinPath } from '@/utils/file'

const emit = defineEmits(['addFolder'])

const videoStore = useVideoStore()
const files = ref([])
const selected = ref([])

const currentPath = computed({
  get: () => videoStore.currentPath,
  set: (v) => videoStore.setFolderPath(v)
})

const VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.mkv', '.rmvb', '.ts', '.webm']

const refreshFiles = async () => {
  const path = videoStore.currentPath
  if (!path) {
    files.value = []
    return
  }
  try {
    const list = await readDir(path)
    const videoFiles = []
    for (const name of list) {
      const full = joinPath(path, name)
      if (isFile(full) && VIDEO_EXTS.includes(getExtname(full))) {
        videoFiles.push(full)
      }
    }
    files.value = videoFiles
  } catch (e) {
    files.value = []
  }
}

watch(() => videoStore.currentPath, refreshFiles, { immediate: true })
watch(selected, (val) => {
  videoStore.setVideos(val)
})
</script>

<style scoped lang="scss">
.preview {
  height: 100%;
  background-color: #f0f3f6;
  padding: 10px;
  display: flex;
  flex-direction: column;

  .toolbar {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }

  .file-list {
    flex: 1;
    overflow: auto;
    background: #fff;
    border-radius: 4px;
    padding: 10px;

    .file-item {
      padding: 6px 0;
      border-bottom: 1px solid #eee;
    }
    .empty-tip {
      color: #909399;
      text-align: center;
      padding: 40px;
    }
  }
}
</style>
