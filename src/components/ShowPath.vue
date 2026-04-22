<template>
  <el-button class="show-path" type="primary" text size="small" title="open folder" @click="handleOpen">
    {{ path }}
  </el-button>
</template>

<script setup>
const props = defineProps({
  path: { type: String, default: '' }
})

const handleOpen = async () => {
  await window.megspotAPI.showOpenDialog({
    defaultPath: props.path
  })
}
</script>

<style scoped>
.show-path {
  user-select: text;
}
</style>
