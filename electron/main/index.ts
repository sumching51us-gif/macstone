import { app, BrowserWindow, shell, ipcMain, protocol, dialog, Menu, nativeImage } from 'electron'
import { autoUpdater } from 'electron-updater'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import chokidar from 'chokidar'

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
let folderWatcher: any = null
const preload = path.join(__dirname, '../preload/index.js')
const indexHtml = path.join(RENDERER_DIST, 'index.html')
const iconPath = path.join(process.env.VITE_PUBLIC, 'logo.svg')

const NO_CACHE_FILE_PROTOCOL = 'no-cache-file'
const THUMB_DIR = path.join(app.getPath('temp'), 'anystone-thumbs')
const SCREENSHOT_DIR = path.join(app.getPath('temp'), 'anystone-screenshots')

// Ensure thumbnail directory exists
if (!fs.existsSync(THUMB_DIR)) {
  fs.mkdirSync(THUMB_DIR, { recursive: true })
}
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: NO_CACHE_FILE_PROTOCOL,
    privileges: { bypassCSP: true }
  }
])

function createMainWindow() {
  win = new BrowserWindow({
    title: 'AnyStone',
    height: 800,
    width: 1700,
    useContentSize: true,
    show: true, // always show immediately to avoid blank-screen trap
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
            await shell.openExternal('https://github.com/sumching51us-gif/macstone')
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

  const targetUrl = VITE_DEV_SERVER_URL || indexHtml
  console.log('[Main] Loading renderer:', targetUrl)

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(indexHtml)
  }

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Main] did-fail-load', errorCode, errorDescription)
  })

  win.webContents.on('dom-ready', () => {
    console.log('[Main] dom-ready')
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.once('ready-to-show', () => {
    console.log('[Main] ready-to-show')
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
  setupAutoUpdater()
  // Check for updates on startup (delay slightly so window is ready)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 3000)

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

  // Skip loading window in development for faster debugging
  if (VITE_DEV_SERVER_URL) {
    createMainWindow()
  } else {
    createLoadingWindow()
  }
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
    if (VITE_DEV_SERVER_URL) {
      createMainWindow()
    } else {
      createLoadingWindow()
    }
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
ipcMain.on('renderer-log', (_event, msg) => {
  console.log('[Renderer]', msg)
})

ipcMain.on('renderer-error', (_event, msg) => {
  console.error('[Renderer]', msg)
})

ipcMain.on('renderer-ready', (_event, msg) => {
  console.log('[Renderer READY]', msg)
})

// FS IPC handlers for sandboxed preload
ipcMain.handle('fs:readDir', async (_event, dir) => {
  try {
    fs.accessSync(dir, fs.constants.R_OK)
    const files = await fs.promises.readdir(dir)
    return files || []
  } catch {
    return []
  }
})

ipcMain.handle('fs:stat', async (_event, filepath) => {
  const stats = await fs.promises.stat(filepath)
  return {
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    size: stats.size,
    mtime: stats.mtime.getTime()
  }
})

ipcMain.on('fs:statSync', (event, filepath) => {
  try {
    const stats = fs.statSync(filepath)
    event.returnValue = {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      mtime: stats.mtime.getTime()
    }
  } catch {
    event.returnValue = { isFile: false, isDirectory: false, size: 0, mtime: 0 }
  }
})

ipcMain.on('fs:existsSync', (event, filepath) => {
  event.returnValue = fs.existsSync(filepath)
})

ipcMain.handle('fs:readFile', async (_event, filepath, encoding) => {
  return fs.promises.readFile(filepath, encoding)
})

ipcMain.on('fs:readFileSync', (event, filepath, options) => {
  try {
    event.returnValue = { success: true, data: fs.readFileSync(filepath, options) }
  } catch (err: any) {
    event.returnValue = { success: false, error: err.message }
  }
})

ipcMain.on('fs:writeFileSync', (event, filepath, data) => {
  try {
    fs.writeFileSync(filepath, data, { encoding: 'utf-8' })
    event.returnValue = { success: true }
  } catch (err: any) {
    event.returnValue = { success: false, error: err.message }
  }
})

ipcMain.on('fs:mkdir', (event, dirpath, options) => {
  try {
    fs.mkdirSync(dirpath, options)
    event.returnValue = { success: true }
  } catch (err: any) {
    event.returnValue = { success: false, error: err.message }
  }
})

ipcMain.handle('thumbnail:generate', async (_event, imagePath: string) => {
  try {
    const crypto = await import('node:crypto')
    const hash = crypto.createHash('md5').update(imagePath).digest('hex')
    const thumbPath = path.join(THUMB_DIR, `${hash}.png`)

    // Return cached thumbnail only if it's newer than the original file
    if (fs.existsSync(thumbPath) && fs.existsSync(imagePath)) {
      const thumbStat = fs.statSync(thumbPath)
      const origStat = fs.statSync(imagePath)
      if (thumbStat.mtimeMs >= origStat.mtimeMs) {
        return thumbPath
      }
    }

    const nativeImg = nativeImage.createFromPath(imagePath)
    if (nativeImg.isEmpty()) {
      return imagePath // fallback to original
    }

    const size = nativeImg.getSize()
    const maxDim = 360
    const ratio = Math.min(maxDim / size.width, maxDim / size.height, 1)
    const newWidth = Math.round(size.width * ratio)
    const newHeight = Math.round(size.height * ratio)

    const resized = nativeImg.resize({ width: newWidth, height: newHeight, quality: 'good' })
    fs.writeFileSync(thumbPath, resized.toPNG())
    return thumbPath
  } catch {
    return imagePath // fallback to original on any error
  }
})

// Auto-updater integration
function setupAutoUpdater() {
  autoUpdater.logger = console as any
  autoUpdater.autoDownload = true

  autoUpdater.on('update-available', (info) => {
    win?.webContents.send('updater:available', info)
  })

  autoUpdater.on('download-progress', (info) => {
    win?.webContents.send('updater:progress', {
      percent: info.percent,
      transferred: info.transferred,
      total: info.total,
      bytesPerSecond: info.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    win?.webContents.send('updater:downloaded', info)
  })

  autoUpdater.on('error', (_err) => {
    // Silently fail — don't interrupt the user
  })
}

ipcMain.on('checkForUpdate', () => {
  autoUpdater.checkForUpdates().catch(() => {})
})

ipcMain.on('updateNow', () => {
  console.log('[Updater] updateNow called')
  try {
    autoUpdater.quitAndInstall()
    console.log('[Updater] quitAndInstall returned')
  } catch (e) {
    console.error('[Updater] quitAndInstall error:', e)
  }
  // Fallback: force exit after 1.5s if quitAndInstall didn't work
  // (common for unsigned macOS apps)
  setTimeout(() => {
    console.log('[Updater] Force exiting application')
    app.exit(0)
  }, 1500)
})

ipcMain.handle('screenshot:save', async (_event, dataURL: string) => {
  try {
    const nativeImg = nativeImage.createFromDataURL(dataURL)
    if (nativeImg.isEmpty()) {
      throw new Error('Empty image')
    }
    const filename = `screenshot-${Date.now()}-${Math.floor(Math.random() * 10000)}.png`
    const filePath = path.join(SCREENSHOT_DIR, filename)
    fs.writeFileSync(filePath, nativeImg.toPNG())
    return filePath
  } catch (err: any) {
    throw new Error(err.message || 'Screenshot save failed')
  }
})

// Folder watch IPC
ipcMain.handle('folder:watch', (_event, dirPath: string) => {
  if (folderWatcher) {
    folderWatcher.close().catch(() => {})
    folderWatcher = null
  }
  if (!dirPath || !fs.existsSync(dirPath)) return
  folderWatcher = chokidar.watch(dirPath, {
    ignored: /(^|[\/])\../,
    ignoreInitial: true,
    depth: 0,
  })
  folderWatcher.on('all', (event: string) => {
    if (['add', 'addDir', 'unlink', 'unlinkDir', 'change'].includes(event)) {
      win?.webContents.send('folder:changed', dirPath)
    }
  })
})

ipcMain.handle('folder:unwatch', () => {
  if (folderWatcher) {
    folderWatcher.close().catch(() => {})
    folderWatcher = null
  }
})

// Custom protocol client
const MEGSPOT = 'megspot'
if (process.env.NODE_ENV === 'development' && process.platform === 'win32') {
  app.setAsDefaultProtocolClient(MEGSPOT, process.execPath, [path.resolve(process.argv[1])])
} else {
  app.setAsDefaultProtocolClient(MEGSPOT)
}
