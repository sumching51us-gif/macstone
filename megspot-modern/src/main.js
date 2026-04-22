import { createApp } from 'vue'
import App from './App.vue'
import store from './store'
import router from './router'
import i18n from './lang'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/index.css'

const app = createApp(App)

app.use(store)
app.use(router)
app.use(i18n)
app.use(ElementPlus, { size: 'small', zIndex: 3000 })

app.mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
