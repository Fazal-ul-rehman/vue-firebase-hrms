<script setup>
import { ref, onMounted } from 'vue'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase/config'
import { useRouter } from 'vue-router'
import autoseedRunner from './sample/autoseed'

const router = useRouter()
const user = ref(null)
const dark = ref(false)

onMounted(async () => {
  const saved = localStorage.getItem('darkMode')
  dark.value = saved ? JSON.parse(saved) : false
  document.documentElement.classList.toggle('dark', dark.value)

  // Run autoseed runner which will create auth users + firestore docs on first run
  try {
    await autoseedRunner(auth, db)
  } catch(e){
    console.error('Auto-seed error', e)
  }

  onAuthStateChanged(auth, (u) => {
    user.value = u
    if(u){
      if(window.location.pathname === '/') router.push('/dashboard')
    }
  })
})

function toggleDark(){
  dark.value = !dark.value
  document.documentElement.classList.toggle('dark', dark.value)
  localStorage.setItem('darkMode', JSON.stringify(dark.value))
}

async function logout(){
  await signOut(auth)
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 dark:bg-slate-900">
    <header class="sticky top-0 z-10 backdrop-blur bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
      <div class="max-w-8xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="inline-flex h-10 w-44 items-center justify-center">
            <img src="/src/assets/logo/logoDark.png" alt="Logo" class="w-40 h-auto hidden dark:block" />
          <img src="/src/assets/logo/logoLight1.png" alt="Logo" class="w-40 h-auto block dark:hidden" />
        </span>
    
        </div>
        <div class="flex items-center px-10 gap-2">
          <button class="btn-secondary" @click="toggleDark">{{ dark ? '☀️ Light' : '🌙 Dark' }}</button>
          <button v-if="user" class="btn-secondary" @click="logout">Logout</button>
        </div>
      </div>
    </header>
    <router-view />
  </div>
</template>
