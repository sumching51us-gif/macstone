const fs = require('fs')
const path = require('path')

const buildDir = path.join(__dirname, '..', 'build')
const ymlPath = path.join(buildDir, 'latest-mac.yml')

if (!fs.existsSync(ymlPath)) {
  console.log('latest-mac.yml not found, skipping')
  process.exit(0)
}

let content = fs.readFileSync(ymlPath, 'utf8')
let patched = false

// Parse each file entry and patch blockMapSize for zip files
const lines = content.split('\n')
const result = []
let currentFile = null
let currentIndent = ''

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  const match = line.match(/^(\s*)- url: (.+)$/)
  if (match) {
    currentFile = match[2].trim()
    currentIndent = match[1] + '  '
  }
  
  result.push(line)
  
  if (currentFile && currentFile.endsWith('.zip')) {
    // Check if next lines already have blockMapSize
    const nextLines = lines.slice(i + 1, i + 5)
    const hasBlockMap = nextLines.some(l => l.includes('blockMapSize:'))
    
    if (!hasBlockMap) {
      const blockmapName = currentFile + '.blockmap'
      const blockmapPath = path.join(buildDir, blockmapName)
      if (fs.existsSync(blockmapPath)) {
        const stat = fs.statSync(blockmapPath)
        result.push(`${currentIndent}blockMapSize: ${stat.size}`)
        patched = true
        console.log(`Patched blockMapSize for ${currentFile}: ${stat.size}`)
      }
    }
    currentFile = null
  }
}

if (patched) {
  fs.writeFileSync(ymlPath, result.join('\n'))
  console.log('latest-mac.yml patched successfully')
} else {
  console.log('No blockmap patches needed')
}
