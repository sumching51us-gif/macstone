<template>
  <div class="app-wrapper">
    <div class="main-container">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.app-wrapper {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
.main-container {
  width: 100%;
  height: 100%;
}
</style>
