<template>
  <div class="dashboard-container">
    <div class="brand">
      <h1 class="brand-title">AnyStone</h1>
      <p class="brand-sub">Image & Video Comparison Tool</p>
    </div>
    <div class="entry">
      <div
        v-for="item in tools"
        :key="item.title"
        class="entry-card"
        @click="toRoute(item.route)"
      >
        <div class="card-icon">
          <el-icon :size="32"><component :is="item.icon" /></el-icon>
        </div>
        <div class="card-title">{{ $t(item.title) }}</div>
        <div class="card-desc">{{ $t('common.supportTypes') + item.supportTypes }}</div>
      </div>
    </div>
    <div class="footer">
      <p>AnyStone v{{ appVersion }} · Vue 3 + Vite + Electron 30</p>
    </div>
  </div>
</template>

<script setup>
import { Picture, VideoCamera } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import pkg from '../../../package.json'

const router = useRouter()
const appVersion = pkg.version

const tools = [
  {
    title: 'dashboard.entries.image.title',
    supportTypes: ' jpg, jpeg, png, svg, webp, bmp, tiff',
    icon: Picture,
    route: '/image/index'
  },
  {
    title: 'dashboard.entries.video.title',
    supportTypes: ' mp4, mov, rmvb, avi, mkv',
    icon: VideoCamera,
    route: '/video/index'
  }
]

const toRoute = (route) => {
  router.push(route)
}
</script>

<style scoped lang="scss">
.dashboard-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  box-sizing: border-box;
  padding: 40px 20px;
}

.brand {
  text-align: center;
  margin-bottom: 48px;
}
.brand-title {
  font-size: 48px;
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: 2px;
  margin: 0;
  background: linear-gradient(90deg, #1a1a2e, #4a4a6a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.brand-sub {
  font-size: 15px;
  color: #909399;
  margin-top: 8px;
  letter-spacing: 1px;
}

.entry {
  display: flex;
  justify-content: center;
  gap: 32px;
  flex-wrap: wrap;
}
.entry-card {
  width: 280px;
  padding: 36px 28px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  text-align: center;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}
.entry-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
}
.card-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #409eff, #67c23a);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}
.card-desc {
  font-size: 12px;
  color: #909399;
}

.footer {
  margin-top: 48px;
  text-align: center;
  color: #c0c4cc;
  font-size: 12px;
}
</style>
