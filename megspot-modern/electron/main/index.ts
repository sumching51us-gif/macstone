import { app, BrowserWindow, shell, ipcMain, protocol, dialog, Menu } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
let loadWin: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')
const iconPath = path.join(process.env.VITE_PUBLIC, 'logo.svg')

const NO_CACHE_FILE_PROTOCOL = 'no-cache-file'

protocol.registerSchemesAsPrivileged([
  {
    scheme: NO_CACHE_FILE_PROTOCOL,
    privileges: { bypassCSP: true }
  }
])

function createMainWindow() {
  win = new BrowserWindow({
    title: 'MegSpot',
    height: 800,
    width: 1700,
    useContentSize: true,
    show: false,
    frame: process.platform === 'win32',
    titleBarStyle: process.platform === 'win32' ? 'default' : 'hidden',
    icon: iconPath,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      devTools: true,
      scrollBounce: process.platform === 'darwin'
    }
  })

  win.maximize()

  const menuTemplate: any = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/MegEngine/MegSpot')
          }
        }
      ]
    }
  ]

  if (process.platform === 'darwin') {
    menuTemplate.unshift({
      label: 'Application',
      submenu: [
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function () {
            win?.close()
          }
        }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(indexHtml)
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.once('ready-to-show', () => {
    win?.show()
    if (loadWin) {
      loadWin.destroy()
      loadWin = null
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools()
  }

  win.on('closed', () => {
    win = null
  })
}

function createLoadingWindow() {
  loadWin = new BrowserWindow({
    width: 400,
    height: 600,
    frame: false,
    show: true,
    backgroundColor: '#222',
    skipTaskbar: true,
    transparent: true,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  if (VITE_DEV_SERVER_URL) {
    loadWin.loadURL(`${VITE_DEV_SERVER_URL}#/loading`)
  } else {
    // For production, show a simple loading or skip it
    loadWin.loadFile(indexHtml, { hash: '/loading' })
  }

  loadWin.show()
  createMainWindow()

  loadWin.on('closed', () => {
    loadWin = null
  })
}

app.whenReady().then(() => {
  const registerSucceed = protocol.registerFileProtocol(NO_CACHE_FILE_PROTOCOL, (request, callback) => {
    const url = decodeURI(request.url).substring(`${NO_CACHE_FILE_PROTOCOL}://`.length)
    callback({
      path: url,
      headers: {
        'cache-control': 'no-store'
      }
    })
  })
  if (!registerSucceed) console.error('Failed to register protocol')

  protocol.interceptFileProtocol('file', (request, callback) => {
    callback(request)
  })

  createLoadingWindow()
})

app.on('window-all-closed', () => {
  win = null
  app.quit()
})

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createLoadingWindow()
  }
})

// IPC handlers
ipcMain.handle('windows-mini', () => {
  win?.minimize()
})

ipcMain.handle('window-max', async () => {
  if (win?.isMaximized()) {
    win.restore()
    return { status: false }
  } else {
    win?.maximize()
    return { status: true }
  }
})

ipcMain.handle('window-close', () => {
  win?.close()
})

ipcMain.handle('open-messagebox', async (event, arg) => {
  const res = await dialog.showMessageBox(win!, {
    type: arg.type || 'info',
    title: arg.title || '',
    buttons: arg.buttons || [],
    message: arg.message || '',
    noLink: arg.noLink ?? true
  })
  return res
})

ipcMain.handle('open-errorbox', (event, arg) => {
  dialog.showErrorBox(arg.title, arg.message)
})

ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
  const result = await dialog.showOpenDialog(win!, options)
  return result
})

ipcMain.handle('app:getPath', (event, name) => {
  return app.getPath(name)
})

ipcMain.handle('shell:openExternal', (event, url) => {
  if (typeof url === 'string' && url.startsWith('https:')) {
    shell.openExternal(url)
  }
})

// Auto update placeholder
ipcMain.on('checkForUpdate', () => {
  // TODO: integrate auto-updater
})

ipcMain.on('updateNow', () => {
  // TODO: integrate auto-updater
})

// Custom protocol client
const MEGSPOT = 'megspot'
if (process.env.NODE_ENV === 'development' && process.platform === 'win32') {
  app.setAsDefaultProtocolClient(MEGSPOT, process.execPath, [path.resolve(process.argv[1])])
} else {
  app.setAsDefaultProtocolClient(MEGSPOT)
}
