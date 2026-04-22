<template>
  <div class="file-tree">
    <div class="tree-header">
      <el-input
        v-model="searchValue"
        size="small"
        :placeholder="$t('general.filterFileName') || 'Filter folders'"
        clearable
        class="search-input"
      />
    </div>
    <div class="tree-body">
      <el-tree
        ref="treeRef"
        node-key="path"
        highlight-current
        lazy
        :load="loadNode"
        :data="treeData"
        :props="defaultProps"
        :default-expanded-keys="expandedKeys"
        :expand-on-click-node="false"
        :auto-expand-parent="false"
        :current-node-key="currentNodeKey"
        :filter-node-method="filterNode"
        @node-click="handleNodeClick"
        @node-expand="handleNodeExpand"
        @node-collapse="handleNodeCollapse"
      >
        <template #default="{ node, data }">
          <span class="tree-node">
            <span class="node-label">
              <el-icon v-if="!data.isLeaf && node.expanded"><FolderOpened /></el-icon>
              <el-icon v-else-if="!data.isLeaf"><Folder /></el-icon>
              <el-icon v-else><Document /></el-icon>
              <span class="label-text" :title="data.path">{{ data.label }}</span>
            </span>
          </span>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { Folder, FolderOpened, Document } from '@element-plus/icons-vue'
import { listDir, generateFileInfo } from './lib'

const props = defineProps({
  currentPath: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select', 'expandChange'])

const treeRef = ref(null)
const treeData = ref([])
const expandedKeys = ref([])
const currentNodeKey = ref('')
const searchValue = ref('')

const defaultProps = {
  children: 'children',
  label: 'label',
  isLeaf: 'isLeaf'
}

onMounted(async () => {
  try {
    const homePath = await window.megspotAPI.getPath('home')
    if (homePath) {
      const root = generateFileInfo(homePath)
      root.label = 'Home'
      treeData.value = [root]
    }
  } catch (e) {
    console.error('Failed to get home path:', e)
  }
})

watch(() => props.currentPath, (val) => {
  currentNodeKey.value = val
  nextTick(() => {
    if (treeRef.value && val) {
      treeRef.value.setCurrentKey(val)
    }
  })
})

watch(searchValue, (val) => {
  if (treeRef.value) {
    treeRef.value.filter(val)
  }
})

async function loadNode(node, resolve) {
  if (!node.data || !node.data.path) {
    resolve([])
    return
  }
  try {
    const nodeData = await listDir(node.data.path, { onlyDir: true })
    const children = nodeData.children.map((child) => {
      const isLeaf = typeof child === 'string' ? false : child.isLeaf
      return generateFileInfo(typeof child === 'string' ? child : child.path, isLeaf)
    })
    resolve(children)
  } catch (e) {
    console.error('Failed to load node:', e)
    resolve([])
  }
}

function handleNodeClick(data, node) {
  emit('select', data)
}

function handleNodeExpand(data) {
  if (!expandedKeys.value.includes(data.path)) {
    expandedKeys.value = [...expandedKeys.value, data.path]
  }
  emit('expandChange', expandedKeys.value)
}

function handleNodeCollapse(data) {
  expandedKeys.value = expandedKeys.value.filter((k) => k !== data.path && !k.startsWith(data.path + '/'))
  emit('expandChange', expandedKeys.value)
}

function filterNode(value, data) {
  if (!value) return true
  return data.label.toLowerCase().includes(value.toLowerCase())
}
</script>

<style scoped lang="scss">
.file-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-size: 13px;

  .tree-header {
    padding: 8px 10px;
    border-bottom: 1px solid #eee;

    .search-input {
      width: 100%;
    }
  }

  .tree-body {
    flex: 1;
    overflow: auto;
    padding: 4px 0;

    :deep(.el-tree) {
      background: transparent;
    }

    :deep(.el-tree-node__content) {
      cursor: pointer;
    }

    .tree-node {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex: 1;
      overflow: hidden;
      padding-right: 4px;

      .node-label {
        display: flex;
        align-items: center;
        gap: 4px;
        overflow: hidden;

        .el-icon {
          flex-shrink: 0;
          color: #e6a23c;
        }

        .label-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }
}
</style>
