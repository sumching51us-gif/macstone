<template>
  <div class="dashboard-container">
    <div class="entry">
      <el-card v-for="item in tools" :key="item.title" class="entry-item" @click="$router.push(item.route)">
        <div class="card-content">
          <el-icon :size="40"><Picture v-if="item.icon === 'image'" /><VideoCamera v-else /></el-icon>
          <h3>{{ $t(item.title) }}</h3>
          <p>{{ $t('common.supportTypes') + item.supportTypes }}</p>
        </div>
      </el-card>
    </div>
    <div class="help">
      <h2>MegSpot Modern (Vue 3 + Vite + Electron 33)</h2>
      <p>重构进行中...</p>
    </div>
  </div>
</template>

<script setup>
import { Picture, VideoCamera } from '@element-plus/icons-vue'

const tools = [
  {
    title: 'dashboard.entries.image.title',
    supportTypes: ' jpg, jpeg, png, svg',
    icon: 'image',
    route: '/image/index'
  },
  {
    title: 'dashboard.entries.video.title',
    supportTypes: ' mp4, mov, rmvb, avi',
    icon: 'video',
    route: '/video/index'
  }
]
</script>

<style scoped>
.dashboard-container {
  width: 100%;
  height: 100%;
  padding: 30px 20px;
  box-sizing: border-box;
}
.entry {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
}
.entry-item {
  width: 300px;
  cursor: pointer;
  transition: transform 0.2s;
}
.entry-item:hover {
  transform: translateY(-4px);
}
.card-content {
  text-align: center;
}
.help {
  margin-top: 40px;
  text-align: center;
}
</style>
