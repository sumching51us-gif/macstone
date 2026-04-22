import { ipcRenderer, contextBridge } from 'electron'
import path from 'path-browserify'

// Capture renderer logs and forward to main
const originalLog = console.log
const originalError = console.error
console.log = (...args: any[]) => {
  originalLog(...args)
  try { ipcRenderer.send('renderer-log', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')) } catch {}
}
console.error = (...args: any[]) => {
  originalError(...args)
  try { ipcRenderer.send('renderer-error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')) } catch {}
}

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('megspotAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('windows-mini'),
  maximize: () => ipcRenderer.invoke('window-max'),
  close: () => ipcRenderer.invoke('window-close'),

  // Dialog
  showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  showMessageBox: (options: any) => ipcRenderer.invoke('open-messagebox', options),
  showErrorBox: (title: string, message: string) => ipcRenderer.invoke('open-errorbox', { title, message }),

  // App / Shell
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // Thumbnail generation
  generateThumbnail: (imagePath: string) => ipcRenderer.invoke('thumbnail:generate', imagePath),

  // Generic IPC
  on: (channel: string, listener: (...args: any[]) => void) => {
    const wrapped = (event: Electron.IpcRendererEvent, ...args: any[]) => listener(...args)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.off(channel, wrapped)
  },
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

  // Path utils (Node built-in exposed safely)
  path: {
    join: (...args: string[]) => path.join(...args),
    sep: path.sep,
    extname: (p: string) => path.extname(p),
    resolve: (...args: string[]) => path.resolve(...args),
    basename: (p: string, ext?: string) => path.basename(p, ext),
    dirname: (p: string) => path.dirname(p),
  },

  // Node fs utils via IPC (preload sandbox cannot require('fs') in Electron 30)
  fs: {
    readDir: (dir: string) => ipcRenderer.invoke('fs:readDir', dir),
    stat: (filepath: string) => ipcRenderer.invoke('fs:stat', filepath),
    statSync: (filepath: string) => {
      const res = ipcRenderer.sendSync('fs:statSync', filepath)
      return res
    },
    existsSync: (filepath: string) => ipcRenderer.sendSync('fs:existsSync', filepath),
    readFile: (filepath: string, encoding?: BufferEncoding) => ipcRenderer.invoke('fs:readFile', filepath, encoding),
    readFileSync: (filepath: string, options?: any) => {
      const res = ipcRenderer.sendSync('fs:readFileSync', filepath, options)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    writeFileSync: (filepath: string, data: any) => {
      const res = ipcRenderer.sendSync('fs:writeFileSync', filepath, data)
      if (!res.success) throw new Error(res.error)
    },
    mkdir: (dirpath: string, options?: any) => {
      const res = ipcRenderer.sendSync('fs:mkdir', dirpath, options)
      if (!res.success) throw new Error(res.error)
    },
    watch: (_filepath: string) => {
      // TODO: implement via main process if needed
      return null as any
    },
  },
})

// --------- Preload scripts loading ---------
function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) {
      return parent.removeChild(child)
    }
  },
}

function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)
