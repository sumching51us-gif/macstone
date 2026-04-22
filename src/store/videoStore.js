import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { trimSep } from '@/utils/file'
import { DEFAULT_VIDEO_COLLECTION_NAME, LAYOUT_1x2 } from '@/constants'

export const useVideoStore = defineStore('video', () => {
  const videoFolders = ref([])
  const collections = ref([
    {
      name: DEFAULT_VIDEO_COLLECTION_NAME,
      type: 'file',
      list: []
    }
  ])
  const collectionName = ref(DEFAULT_VIDEO_COLLECTION_NAME)
  const videoConfig = ref({
    smooth: true,
    speed: 1.0,
    currentTime: 0,
    layout: LAYOUT_1x2,
    allVideoPaused: true,
    enableSyncTime: true,
    muted: true,
    fps: 30,
    defaultSort: {
      order: 'asc',
      field: 'name'
    }
  })
  const currentPath = ref('')
  const expandData = ref([])

  const currentCollection = computed(() => {
    let c = collections.value.find((c) => c.name === collectionName.value)
    if (!c) {
      c = { name: collectionName.value, type: 'file', list: [] }
      collections.value.push(c)
    }
    return c
  })

  const videoList = computed(() => {
    const c = collections.value.find((c) => c.name === collectionName.value)
    return c ? c.list : []
  })

  function setVideoConfig(config) {
    videoConfig.value = { ...videoConfig.value, ...config }
  }
  function setVideoFolders(folders) {
    videoFolders.value = folders.map(trimSep)
  }
  function addVideoFolder(folder) {
    if (!videoFolders.value.includes(trimSep(folder))) {
      videoFolders.value = [...videoFolders.value, folder]
    }
  }
  function removeVideoFolder(folder) {
    const idx = videoFolders.value.indexOf(trimSep(folder))
    if (idx > -1) {
      const tmp = [...videoFolders.value]
      tmp.splice(idx, 1)
      videoFolders.value = tmp
    }
  }
  function updateCurrentList(updater) {
    const idx = collections.value.findIndex((c) => c.name === collectionName.value)
    if (idx >= 0) {
      const c = collections.value[idx]
      const newList = typeof updater === 'function' ? updater(c.list) : updater
      collections.value[idx] = { ...c, list: newList }
    }
  }
  function addVideo(video) {
    if (video) {
      updateCurrentList((list) => list.includes(video) ? list : [...list, video])
    }
  }
  function addVideos(videos) {
    if (videos && videos.length) {
      updateCurrentList((list) => [...new Set(list.concat(videos))])
    }
  }
  function removeVideos(videos) {
    const set = new Set(Array.isArray(videos) ? videos : [videos])
    updateCurrentList((list) => list.filter((i) => !set.has(i)))
  }
  function setVideos(newList) {
    updateCurrentList(newList)
  }
  function emptyVideos() {
    updateCurrentList([])
  }
  function addCollection(newCollection) {
    if (!collections.value.find((c) => c.name === newCollection.name)) {
      collections.value = [...collections.value, newCollection]
    }
  }
  function removeCollection(name) {
    if (name === DEFAULT_VIDEO_COLLECTION_NAME) return
    collections.value = collections.value.filter((c) => c.name !== name)
  }
  function setCollectionName(name) {
    collectionName.value = name
  }
  function setFolderPath(path) {
    currentPath.value = path
  }
  function addExpandData(folder) {
    expandData.value.push(folder)
  }
  function removeExpandData(folder) {
    expandData.value = expandData.value.filter((item) => !item.startsWith(folder))
  }

  return {
    videoFolders,
    collections,
    collectionName,
    videoConfig,
    currentPath,
    expandData,
    videoList,
    currentCollection,
    setVideoConfig,
    setVideoFolders,
    addVideoFolder,
    removeVideoFolder,
    addVideo,
    addVideos,
    removeVideos,
    setVideos,
    emptyVideos,
    addCollection,
    removeCollection,
    setCollectionName,
    setFolderPath,
    addExpandData,
    removeExpandData
  }
})
