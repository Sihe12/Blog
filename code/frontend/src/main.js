import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router.js'
import Toast from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'


const app = createApp(App)
app.use(router)
app.use(Toast)
app.mount('#app')