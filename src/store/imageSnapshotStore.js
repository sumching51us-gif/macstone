import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useImageSnapshotStore = defineStore('imageSnapshot', () => {
  const snapshotConfig = ref({})
  const files = ref([])

  function setSnapshotConfig(config) {
    snapshotConfig.value = config
  }
  function setFiles(newFiles) {
    files.value = newFiles
  }

  return {
    snapshotConfig,
    files,
    setSnapshotConfig,
    setFiles
  }
})
