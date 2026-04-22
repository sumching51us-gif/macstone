<template>
  <div class="entry-card" style="cursor: pointer" @click="toDetail">
    <el-card>
      <template #header>
        <div class="header">
          <el-icon :size="20" v-if="iconType"><component :is="iconType" /></el-icon>
          <strong>{{ $t(title) }}</strong>
        </div>
      </template>
      <div class="body">
        <article>{{ desc }}</article>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { Picture, VideoCamera } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  title: { type: String, default: 'title' },
  desc: { type: String, default: 'desc' },
  icon: { type: String, default: 'el-icon-picture-outline' },
  route: { type: String, default: '/image/index' }
})

const router = useRouter()

const iconType = computed(() => {
  if (props.icon === 'el-icon-picture-outline') return Picture
  if (props.icon === 'el-icon-video-camera') return VideoCamera
  return null
})

const toDetail = () => {
  router.push(props.route)
}
</script>

<style scoped>
.entry-card {
  height: 100%;
  margin-left: 30px;
  margin-right: 30px;
}
.entry-card:hover .header {
  transition: color 0.4s;
  color: #409eff;
}
.header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.body article {
  margin-left: 20px;
  color: #606266;
}
</style>
