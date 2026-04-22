export const useWorker = (id, type, imageData, params) => {
  return new Promise((resolve) => {
    // TODO: restore Web Worker for image filters after static asset path is configured
    console.log('useWorker placeholder', { id, type })
    resolve({ success: true })
  })
}
