<script setup>
import { ref } from 'vue'
import { auth } from '../firebase/config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const router = useRouter()

function setMode(mode){
  roleMode.value = mode
  email.value = ''
  password.value = ''
  error.value=''
}

async function doLogin(){
  try{
    loading.value = true; error.value=''
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/dashboard')
  }catch(e){
    error.value = e.message || 'Login failed'
  }finally{
    loading.value = false
  }
}
</script>

<template>
  <main class="max-w-md mx-auto px-4 py-12">
    <div class="card space-y-4">
      <h2 class="text-xl font-semibold">Login</h2>
      <p class="text-sm text-slate-500">Please enter your email and password to sign in.</p>
      <input class="input" placeholder="Email" v-model="email" />
      <input class="input" placeholder="Password" type="password" v-model="password" />

      <button class="btn w-full" :disabled="loading" @click="doLogin">
        {{ loading ? 'Signing in...' : 'Sign In' }}
      </button>

      <p v-if="error" class="text-red-600 mt-2 text-sm">{{ error }}</p>
      <p class="text-xs text-slate-500 mt-2">Note: In case of forget password, Please contact Manager.</p>
    </div>
  </main>
</template>
