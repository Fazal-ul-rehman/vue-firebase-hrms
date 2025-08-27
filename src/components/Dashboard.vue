<script setup>
import { ref, onMounted } from 'vue'
import { auth, db } from '../firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import ManagerPanel from './ManagerPanel.vue'
import EmployeePanel from './EmployeePanel.vue'
import { onAuthStateChanged, signOut } from 'firebase/auth'

const user = ref(null)
const role = ref('')
const loading = ref(true)

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    if (u) {
      user.value = u
      const snap = await getDoc(doc(db, 'users', u.uid))
      if (snap.exists()) {
        role.value = snap.data().role
      }
    } else {
      user.value = null
      role.value = ''
    }
    loading.value = false
  })
})

function logout() {
  signOut(auth)
}
</script>

<template>
  <div v-if="loading" class="p-8 text-center">Loading...</div>

  <div v-else>

    <!-- Show Manager/CEO/COO/CFO as Admin Panel -->
    <ManagerPanel v-if="['admin'].includes(role)" />

    <!-- Show Employee Panel -->
    <EmployeePanel v-else-if="role === 'employee'" />

    <!-- If role is missing -->
    <div v-else class="p-8 text-red-500 text-center">
      No valid role assigned. Please contact admin.
    </div>
  </div>
</template>
