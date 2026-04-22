import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { trimSep } from '@/utils/file'
import { DEFAULT_IMAGE_COLLECTION_NAME, LAYOUT_1x2 } from '@/constants'

export const useImageStore = defineStore('image', () => {
  const imageFolders = ref([])
  const collections = ref([
    {
      name: DEFAULT_IMAGE_COLLECTION_NAME,
      type: 'file',
      list: []
    }
  ])
  const collectionName = ref(DEFAULT_IMAGE_COLLECTION_NAME)
  const imageConfig = ref({
    smooth: true,
    layout: LAYOUT_1x2,
    defaultSort: {
      order: 'asc',
      field: 'name'
    }
  })
  const browserMode = ref('grid')
  const showCanvasName = ref(true)
  const showHistogram = ref(false)
  const showZoomViewer = ref(false)
  const singlePaths = ref([])
  const singleIndex = ref(0)
  const compareMode = ref('grid') // 'grid' | 'swipe'
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

  const imageList = computed(() => {
    const c = collections.value.find((c) => c.name === collectionName.value)
    return c ? c.list : []
  })

  function setImageConfig(config) {
    imageConfig.value = { ...imageConfig.value, ...config }
  }
  function setImageFolders(folders) {
    imageFolders.value = folders.map(trimSep)
  }
  function addImageFolder(folder) {
    if (!imageFolders.value.includes(trimSep(folder))) {
      imageFolders.value = [...imageFolders.value, folder]
    }
  }
  function removeImageFolder(folder) {
    const idx = imageFolders.value.indexOf(trimSep(folder))
    if (idx > -1) {
      const tmp = [...imageFolders.value]
      tmp.splice(idx, 1)
      imageFolders.value = tmp
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
  function addImage(image) {
    if (image) {
      updateCurrentList((list) => list.includes(image) ? list : [...list, image])
    }
  }
  function addImages(images) {
    if (images && images.length) {
      updateCurrentList((list) => [...new Set(list.concat(images))])
    }
  }
  function removeImages(images) {
    const set = new Set(Array.isArray(images) ? images : [images])
    updateCurrentList((list) => list.filter((i) => !set.has(i)))
  }
  function setImages(newList) {
    updateCurrentList(newList)
  }
  function emptyImages() {
    updateCurrentList([])
  }
  function addCollection(newCollection) {
    if (!collections.value.find((c) => c.name === newCollection.name)) {
      collections.value = [...collections.value, newCollection]
    }
  }
  function removeCollection(name) {
    if (name === DEFAULT_IMAGE_COLLECTION_NAME) return
    collections.value = collections.value.filter((c) => c.name !== name)
  }
  function removeTmpCollection() {
    const c = collections.value.find((c) => c.name === collectionName.value)
    if (c && c.isTmp) {
      collectionName.value = DEFAULT_IMAGE_COLLECTION_NAME
    }
    collections.value = collections.value.filter((c) => !c.isTmp)
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

  function setCompareMode(mode) {
    compareMode.value = mode
  }
  function setBrowserMode(mode) {
    browserMode.value = mode
  }
  function setShowCanvasName(show) {
    showCanvasName.value = show
  }
  function setShowHistogram(show) {
    showHistogram.value = show
  }
  function setShowZoomViewer(show) {
    showZoomViewer.value = show
  }
  function setSinglePaths(paths) {
    singlePaths.value = paths
    singleIndex.value = 0
  }
  function setSingleIndex(index) {
    singleIndex.value = index
  }

  return {
    imageFolders,
    collections,
    collectionName,
    imageConfig,
    currentPath,
    expandData,
    imageList,
    currentCollection,
    compareMode,
    browserMode,
    showCanvasName,
    showHistogram,
    showZoomViewer,
    singlePaths,
    singleIndex,
    setImageConfig,
    setBrowserMode,
    setShowCanvasName,
    setShowHistogram,
    setShowZoomViewer,
    setSinglePaths,
    setSingleIndex,
    setImageFolders,
    addImageFolder,
    removeImageFolder,
    addImage,
    addImages,
    removeImages,
    setImages,
    emptyImages,
    addCollection,
    removeCollection,
    removeTmpCollection,
    setCollectionName,
    setFolderPath,
    addExpandData,
    removeExpandData,
    setCompareMode
  }
})
