import Store from 'electron-store'

const electronStore = new Store()

export function createPersistPlugin(options = {}) {
  return ({ store }) => {
    const storeName = store.$id
    const key = options.key || `pinia-${storeName}`

    const savedState = electronStore.get(key)
    if (savedState) {
      store.$patch(savedState)
    }

    store.$subscribe((mutation, state) => {
      electronStore.set(key, state)
    })
  }
}
