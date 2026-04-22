export const getFileName = (path) => {
  if (!path) return ''
  return path.replace(/\\/g, '/').split('/').pop() || ''
}
