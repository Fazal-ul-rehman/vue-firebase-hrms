<script setup>
import { ref, onMounted } from "vue"
import { auth, db } from "../firebase/config"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"

const user = ref(null)
const userData = ref({})
const isCheckedIn = ref(false)
const checkInTime = ref("")
const checkOutTime = ref("")

// ✅ Same logic as EmployeePanel.vue
onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    if (u) {
      user.value = u

      // fetch manager profile (name, designation)
      const snap = await getDoc(doc(db, "users", u.uid))
      if (snap.exists()) {
        userData.value = snap.data()
      }

      // check today's attendance
      const todayKey = new Date().toLocaleDateString()
      const ref = doc(db, "attendance", `${u.uid}_${todayKey}`)
      const docSnap = await getDoc(ref)
      if (docSnap.exists()) {
        const data = docSnap.data()
        if (data.checkIn) {
          isCheckedIn.value = !data.checkOut
          checkInTime.value = data.checkIn
          checkOutTime.value = data.checkOut || ""
        }
      }
    }
  })
})

async function checkIn() {
  if (!user.value) return
  const todayKey = new Date().toLocaleDateString()
  const ref = doc(db, "attendance", `${user.value.uid}_${todayKey}`)
  const time = new Date().toLocaleTimeString()

  await setDoc(ref, {
    userId: user.value.uid,
    name: userData.value.name || user.value.email,
    designation: userData.value.designation || "Manager",
    checkIn: time,
    status: "present",
    date: todayKey,
    createdAt: serverTimestamp(),
  })

  isCheckedIn.value = true
  checkInTime.value = time
}

async function checkOut() {
  if (!user.value) return
  const todayKey = new Date().toLocaleDateString()
  const ref = doc(db, "attendance", `${user.value.uid}_${todayKey}`)
  const time = new Date().toLocaleTimeString()

  await updateDoc(ref, {
    checkOut: time,
    updatedAt: serverTimestamp(),
  })

  isCheckedIn.value = false
  checkOutTime.value = time
}
</script>

<template>
  <div class="flex flex-col items-center mt-3">
    <div class="flex gap-3">
      <button
        @click="checkIn"
        :disabled="isCheckedIn"
        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
      >
        Check In
      </button>
      <button
        @click="checkOut"
        :disabled="!isCheckedIn"
        class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
      >
        Check Out
      </button>
    </div>

    <p v-if="checkInTime" class="mt-2 text-sm text-gray-600">
      ✅ Checked in at: {{ checkInTime }}
    </p>
    <p v-if="checkOutTime" class="text-sm text-gray-600">
      ⏰ Checked out at: {{ checkOutTime }}
    </p>
  </div>
</template>
