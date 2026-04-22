<template>
  <el-dropdown class="selected-btn" @command="handleCommand">
    <el-button type="primary">
      {{ $t('general.selected') }} {{ selectedList.length }}
      <el-icon class="el-icon--right"><arrow-down /></el-icon>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="remove">{{ $t('general.removeSelected') }}</el-dropdown-item>
        <el-dropdown-item command="clear">{{ $t('general.clearAll') }}</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { ArrowDown } from '@element-plus/icons-vue'
const props = defineProps({
  selectedList: { type: Array, default: () => [] }
})
const emit = defineEmits(['update', 'remove', 'clearAll'])

const handleCommand = (cmd) => {
  if (cmd === 'remove') {
    emit('remove')
  } else if (cmd === 'clear') {
    emit('clearAll')
  }
}
</script>

<style scoped>
.selected-btn {
  margin-left: 10px;
}
</style>
