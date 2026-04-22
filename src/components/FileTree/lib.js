import { readDir, getFileStat, getExtname } from '@/utils/file'
import path from 'path-browserify'

export const TYPE_DIRECTORY = 0
export const TYPE_FILE = 1

const folderBlackList = ['node_modules']

let idCounter = 0
const getId = () => {
  idCounter++
  return idCounter
}

export const generateFileInfo = (dirPath, isLeaf = false) => {
  return {
    id: getId(),
    label: path.basename(dirPath),
    path: path.resolve(dirPath),
    type: TYPE_DIRECTORY,
    hovering: false,
    isLeaf
  }
}

export const listDir = async (dirPath, options = {}) => {
  const dirStat = await getFileStat(dirPath).catch(() => null)
  if (!dirStat?.isDirectory) {
    throw new Error(`Invalid directory: ${dirPath}`)
  }

  const include = Array.isArray(options.include) && options.include.length > 0 ? options.include : null
  const hiddenFiles = typeof options.hiddenFiles === 'boolean' ? options.hiddenFiles : true
  const onlyDir = typeof options.onlyDir === 'boolean' ? options.onlyDir : true

  const dirData = {
    id: getId(),
    label: options.name || path.basename(dirPath),
    path: path.resolve(dirPath),
    type: TYPE_DIRECTORY,
    hovering: false,
    children: []
  }

  let files = await readDir(dirPath).catch(() => [])
  if (hiddenFiles) {
    files = files.filter((item) => !item.startsWith('.'))
  }

  // Batch async stat to avoid blocking renderer with sync IPC calls
  const stats = await Promise.all(
    files.map(async (filename) => {
      const filePath = path.resolve(dirPath, filename)
      try {
        const stat = await getFileStat(filePath)
        return { filename, filePath, stat }
      } catch {
        return null
      }
    })
  )

  for (const item of stats) {
    if (!item) continue
    const { filename, filePath, stat } = item
    if (stat.isDirectory) {
      if (!folderBlackList.includes(filename)) {
        dirData.children.push(filePath)
      }
    } else if (!onlyDir && stat.isFile) {
      if (include && !include.includes(getExtname(filePath))) continue
      dirData.children.push({
        id: getId(),
        label: filename,
        path: filePath,
        type: TYPE_FILE
      })
    }
  }

  if (!dirData.children.length) {
    dirData.isLeaf = true
  }

  dirData.children.sort((a, b) => {
    const typeA = typeof a === 'string' ? TYPE_DIRECTORY : a.type
    const typeB = typeof b === 'string' ? TYPE_DIRECTORY : b.type
    return typeA - typeB
  })

  return dirData
}
