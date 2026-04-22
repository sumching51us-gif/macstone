import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getArrStr } from '@/tools/hotkey'
import { getType } from '@/utils'
import { DEFAULT_LAYOUTS } from '@/constants'

export const usePreferenceStore = defineStore('preference', () => {
  const preference = ref({
    appLanguage: 'en',
    neverCheckLanguage: false,
    showTitle: true,
    background: {
      mode: 'default',
      style:
        'background: #e3e7e9; background-image: linear-gradient(45deg, #f6fafc 25%, transparent 0), linear-gradient(45deg, transparent 75%, #f6fafc 0), linear-gradient(45deg, #f6fafc 25%, transparent 0), linear-gradient(45deg, transparent 75%, #f6fafc 0); background-position: 0 0, 10px 10px, 10px 10px, 20px 20px; background-size: 20px 20px;'
    },
    scaleOptions: [4, 2, 1, 0.5, 0.25],
    defaultShowHist: false,
    defaultFileListShowType: 'list',
    colorPickerMode: 'rgb',
    colorPickerShowPos: true,
    showRGBText: false,
    moveDistance: 100,
    videoProcessBarStyle: 'fixed',
    showScale: true,
    showMousePos: true,
    hotkeys: [],
    layouts: DEFAULT_LAYOUTS
  })

  const gamma = ref(1)
  const colorLevelSetting = ref({
    inputMidtones: 1,
    inputs: [0, 255],
    outputs: [0, 255]
  })
  const histConfig = ref({
    histTypes: ['rgb'],
    scale: 1.0,
    lineWidth: 1,
    drawType: 'rect',
    backgroundColor: [0, 0, 0, 255],
    colors: {
      gray: [0, 0, 0],
      red: [255, 0, 0],
      green: [0, 255, 0],
      blue: [0, 0, 255],
      rgb: [0, 0, 0]
    },
    accumulate: true,
    histSize: [256],
    ranges: [0, 256],
    multi: false
  })
  const uuid = ref(null)
  const lastRouterPath = ref('/dashboard')
  const hotkeysMap = ref(null)

  const setPreference = (newPreOb) => {
    preference.value = { ...preference.value, ...newPreOb }
    if (newPreOb.hotkeys?.length) {
      hotkeysMap.value = new Map(
        newPreOb.hotkeys.map(({ name, keysArr }) => keysArr.map((keys) => [getArrStr(keys), name])).flat()
      )
    }
  }

  const setHistConfig = (newHistConfig) => {
    histConfig.value = { ...histConfig.value, ...newHistConfig }
  }

  const setUuid = (newUuid) => {
    uuid.value = newUuid
  }

  const setGamma = (newGamma) => {
    gamma.value = newGamma
  }

  const setColorLevel = (newPreOb) => {
    colorLevelSetting.value = { ...colorLevelSetting.value, ...newPreOb }
  }

  const setLastRouterPath = (routerPath) => {
    lastRouterPath.value = routerPath
  }

  const ensureHotkeysMap = () => {
    if (getType(hotkeysMap.value) !== 'Map' || hotkeysMap.value.size === 0) {
      hotkeysMap.value = new Map(
        preference.value.hotkeys.map(({ name, keysArr }) => keysArr.map((keys) => [getArrStr(keys), name])).flat()
      )
    }
  }

  return {
    preference,
    gamma,
    colorLevelSetting,
    histConfig,
    uuid,
    lastRouterPath,
    hotkeysMap,
    setPreference,
    setHistConfig,
    setUuid,
    setGamma,
    setColorLevel,
    setLastRouterPath,
    ensureHotkeysMap
  }
})
