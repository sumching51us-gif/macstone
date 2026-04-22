import sizeof from 'image-size'
import path from 'path-browserify'
import { SHARE_ZIP_EXT } from '@/tools/compress'

const getFs = () => {
  if (typeof window !== 'undefined' && window.megspotAPI && window.megspotAPI.fs) {
    return window.megspotAPI.fs
  }
  throw new Error('anystoneAPI.fs is not available. Are you running inside Electron?')
}

export const joinPath = (...args) => {
  return path.join(...args)
}

export const trimSep = (pathStr) => {
  let trimPath = pathStr
  if (pathStr.endsWith(path.sep)) {
    trimPath = pathStr.substring(0, pathStr.length - path.sep.length)
  }
  return trimPath
}

export const formatFileSize = (fileSize) => {
  if (fileSize < 1024) {
    return fileSize + 'B'
  } else if (fileSize < 1024 * 1024) {
    return (fileSize / 1024).toFixed(2) + 'KB'
  } else if (fileSize < 1024 * 1024 * 1024) {
    return (fileSize / (1024 * 1024)).toFixed(2) + 'MB'
  } else {
    return (fileSize / (1024 * 1024 * 1024)).toFixed(2) + 'GB'
  }
}

export const getFileSize = (filepath) => {
  try {
    return sizeof(filepath)
  } catch (e) {
    console.error(e.message)
    return {
      width: 'N/A',
      height: 'N/A'
    }
  }
}

export const getFormatFileSize = (filepath) => {
  return formatFileSize(getFileSize(filepath))
}

export const getFileStat = async (filepath) => {
  return getFs().stat(filepath)
}

export const getFileStatSync = (filepath) => {
  return getFs().statSync(filepath)
}

export const readFileSync = (filepath, arg = { encoding: 'utf-8' }) => {
  return getFs().readFileSync(filepath, arg)
}

export const writeFileSync = (filepath, data) => {
  return getFs().writeFileSync(filepath, data)
}

export const readFile = async (filepath) => {
  return getFs().readFile(filepath)
}

export const readDir = async (dir) => {
  return getFs().readDir(dir)
}

export const isFile = (file) => {
  if (!isExist(file)) return false
  const stat = getFs().statSync(path.resolve(file))
  return stat.isFile
}

export const isDirectory = (dir) => {
  if (!isExist(dir)) return false
  const stat = getFs().statSync(path.resolve(dir))
  return stat.isDirectory
}

export const isExist = (filePath) => {
  return getFs().existsSync(path.resolve(filePath.toString()))
}

export const getExtname = (filepath, filterDot = false) => {
  const ext = path.extname(filepath).toLocaleLowerCase()
  if (filterDot && ext.length >= 2 && ext[0] === '.') {
    return ext.slice(1)
  }
  return ext
}

export const watchFile = (filePath) => {
  return getFs().watch(filePath)
}

const showOpenDialog = (options) => {
  if (typeof window !== 'undefined' && window.megspotAPI && window.megspotAPI.showOpenDialog) {
    return window.megspotAPI.showOpenDialog(options)
  }
  return Promise.resolve({ canceled: true, filePaths: [] })
}

export const getFilePath = async () => {
  const { canceled, filePaths } = await showOpenDialog({
    title: 'select a file path',
    properties: ['openFile'],
    filters: [
      { name: 'AnyStone Project', extensions: [SHARE_ZIP_EXT] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return !canceled && filePaths.length > 0 ? filePaths[0] : false
}

export const getDirectoryPath = async () => {
  const { canceled, filePaths } = await showOpenDialog({
    title: 'select a directory path',
    properties: ['openDirectory']
  })
  return !canceled && filePaths.length > 0 ? filePaths[0] : false
}

const useCollator = (locale = 'zh') => {
  const collator = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: 'base'
  })
  return {
    collator: collator,
    collatorIsNumeric: collator.resolvedOptions().numeric
  }
}

const FileNameMatch = /^(.*?)(\.([^.]*))?$/

function extractNameAndExtension(str, dotFilesAsNames) {
  const match = str ? FileNameMatch.exec(str) : []

  let result = [(match && match[1]) || '', (match && match[3]) || '']

  if (dotFilesAsNames && ((!result[0] && result[1]) || (result[0] && result[0].charAt(0) === '.'))) {
    result = [result[0] + '.' + result[1], '']
  }

  return result
}

const { collator, collatorIsNumeric } = useCollator('en')

export const arraySortByName = (a, b) => {
  const [nameA, extensionA] = extractNameAndExtension(a)
  const [nameB, extensionB] = extractNameAndExtension(b)

  let result = collator.compare(nameA, nameB)

  if (collatorIsNumeric && result === 0 && nameA !== nameB) {
    return nameA < nameB ? -1 : 1
  } else if (result === 0 && nameA === nameB) {
    result = collator.compare(extensionA, extensionB)
    if (collatorIsNumeric && result === 0 && extensionA !== extensionB) {
      return extensionA < extensionB ? -1 : 1
    }
  }

  return result
}
