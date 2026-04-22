<template>
  <div class="file-input">
    <el-tooltip :content="filePath" placement="top" effect="light" :open-delay="300">
      <span class="viewer-name">{{ getFileName(filePath) }}</span>
    </el-tooltip>
    <el-button size="small" type="primary" text @click="getFile">Select</el-button>
  </div>
</template>

<script setup>
import { getFileName } from '@/utils/get-file-name'

const props = defineProps({
  filePath: { type: String, default: '' },
  fileHistory: { type: Array, default: () => [] },
  ext: { type: Array, default: () => [] }
})

const emit = defineEmits(['update', 'addHistory'])

const getFile = async () => {
  const filters = props.ext.length ? [{ name: 'filter', extensions: props.ext }] : []
  const { canceled, filePaths } = await window.megspotAPI.showOpenDialog({
    title: 'add file',
    properties: ['openFile'],
    filters
  })
  if (canceled || !filePaths?.length) return
  const path = filePaths[0]
  emit('update', path)
  emit('addHistory', path)
}
</script>

<style scoped>
.file-input {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.viewer-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
