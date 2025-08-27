<!-- EmployeePanel.vue -->
<script setup>
import { ref, onMounted } from "vue";
import { auth, db } from "../firebase/config";
import { signOut, updatePassword, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

// State
const currentView = ref("home");
const user = ref(null);
const userName = ref("");
const designation = ref("");
const tasks = ref([]);
const newPassword = ref("");

// Attendance state
const isCheckedIn = ref(false);
const checkInTime = ref("");
const checkOutTime = ref("");
const attendanceDocId = ref(null); // track today's attendance doc

// 🔹 Logout
function logout() {
  signOut(auth);
}

// 🔹 Change view
function showView(view) {
  currentView.value = view;
}

// 🔹 Change password
async function changePassword() {
  if (!newPassword.value) return;
  await updatePassword(user.value, newPassword.value);
  newPassword.value = "";
  alert("✅ Password changed successfully!");
}

// 🔹 Restore tasks
function subscribeMyTasks(id) {
  const q = query(collection(db, "tasks"), where("assignedToId", "==", id));
  onSnapshot(q, (snap) => {
    tasks.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

// 🔹 Restore today's attendance state
async function refreshAttendanceState() {
  if (!user.value) return;
  const today = new Date().toLocaleDateString();
  const q = query(
    collection(db, "attendance"),
    where("userId", "==", user.value.uid),
    where("date", "==", today)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const docSnap = snap.docs[0];
    attendanceDocId.value = docSnap.id;
    const data = docSnap.data();
    if (data.checkIn) {
      isCheckedIn.value = !data.checkOut; // still checked in if no checkout
      checkInTime.value = data.checkIn.toDate
        ? data.checkIn.toDate().toLocaleTimeString()
        : data.checkIn;
    }
    if (data.checkOut) {
      checkOutTime.value = data.checkOut.toDate
        ? data.checkOut.toDate().toLocaleTimeString()
        : data.checkOut;
    }
  }
}

// 🔹 Check In
async function checkIn() {
  if (isCheckedIn.value) return;
  const today = new Date().toLocaleDateString();

  // check if today's doc already exists
  const q = query(
    collection(db, "attendance"),
    where("userId", "==", user.value.uid),
    where("date", "==", today)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    alert("⚠️ Already checked in today!");
    return;
  }

  // create new attendance doc
  const docRef = await addDoc(collection(db, "attendance"), {
    userId: user.value.uid,
    name: userName.value || user.value.email,
    // Store just the time as string "HH:MM AM/PM"
    checkIn: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),

    status: "present",
    date: today,
  });

  attendanceDocId.value = docRef.id;
  isCheckedIn.value = true;
  checkInTime.value = new Date().toLocaleTimeString();
}

// 🔹 Check Out
async function checkOut() {
  if (!isCheckedIn.value || !attendanceDocId.value) return;

  const refDoc = doc(db, "attendance", attendanceDocId.value);
  await updateDoc(refDoc, {
    checkOut: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),

  });

  isCheckedIn.value = false;
  checkOutTime.value = new Date().toLocaleTimeString();
}

async function updateTaskStatus(taskId, status) {
  try {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, { status });
    alert(`✅ Task marked as ${status}`);
  } catch (err) {
    console.error("Error updating task:", err);
    alert("❌ Failed to update task");
  }
}

// 🔹 Auth listener
onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    user.value = u;
    if (u) {
      // get today's attendance
      await refreshAttendanceState();

      // subscribe to tasks
      subscribeMyTasks(u.uid);

      // get user profile (name & designation)
      const userDoc = await getDoc(doc(db, "users", u.uid));
      if (userDoc.exists()) {
        userName.value = userDoc.data().name || "";
        designation.value = userDoc.data().designation || "";
      }
    }
  });
});
</script>

<template>
  <div class="flex h-screen bg-gray-100 dark:bg-gray-900">
    <!-- Sidebar -->
    <aside class="w-1/4 bg-white dark:bg-gray-800 shadow-lg flex flex-col p-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">
        Employee Portal
      </h2>

      <nav class="flex flex-col gap-3">
        <button @click="showView('home')" class="btn-nav">🏠 Home</button>
        <button @click="showView('tasks')" class="btn-nav">📋 My Tasks</button>
        <button @click="showView('password')" class="btn-nav">
          🔑 Change Password
        </button>
      </nav>

      <div class="mt-auto">
        <button
          @click="logout"
          class="w-full py-2 px-4 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="w-3/4 p-8 overflow-y-auto">
      <!-- Home -->
      <div
        v-if="currentView === 'home'"
        class="flex flex-col items-center justify-center h-full"
      >
        <img
          class="w-32 h-32 rounded-full shadow-lg mb-4"
          src="https://ui-avatars.com/api/?name=Employee&background=0D8ABC&color=fff"
        />
        <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Welcome, {{ userName }}
        </h1>
        <p v-if="userName" class="text-lg text-gray-600 dark:text-gray-300">
         Email: {{ user?.email }} 
        </p>
        <p v-if="designation" class="text-sm text-gray-500 dark:text-gray-400">
         Role: {{ designation }} 
        </p>

        <!-- Attendance buttons -->
        <div class="mt-6 flex gap-4">
          <button
            v-if="!isCheckedIn && !checkOutTime"
            @click="checkIn"
            class="btn-primary"
          >
            Check In
          </button>

          <button
            v-else-if="isCheckedIn"
            @click="checkOut"
            class="btn-primary bg-green-500 hover:bg-green-600"
          >
            Check Out
          </button>
        </div>

        <p v-if="checkInTime" class="mt-3 text-gray-600">
          Checked in at: {{ checkInTime }}
        </p>
        <p v-if="checkOutTime" class="text-gray-600">
          Checked out at: {{ checkOutTime }}
        </p>
      </div>

      <!-- My Tasks -->
      <div v-if="currentView === 'tasks'" class="card">
        <h2 class="section-title">My Tasks</h2>
        <table class="styled-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Assigned By</th>
              <th>Status</th>
              <th class="w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tasks" :key="t.id">
              <td>{{ t.task }}</td>
              <td>{{ t.assignedBy }}</td>
              <td>
                <span
                  class="status-badge"
                  :class="{
                    pending: t.status?.toLowerCase() === 'pending',
                    completed: t.status?.toLowerCase() === 'completed',
                    problem: t.status?.toLowerCase() === 'problem',
                  }"
                >
                  {{ t.status || "Pending" }}
                </span>
              </td>
              <td>
                <div class="flex gap-2 justify-center">
                  <button
                    class="btn-action complete"
                    @click="updateTaskStatus(t.id, 'completed')"
                    title="Mark as Completed"
                  >
                    ✅ Complete
                  </button>
                  <button
                    class="btn-action problem"
                    @click="updateTaskStatus(t.id, 'problem')"
                    title="Report Problem"
                  >
                    ⚠️ Problem
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Change Password -->
      <div v-if="currentView === 'password'" class="card">
        <h2 class="section-title">Change Password</h2>
        <input
          v-model="newPassword"
          type="password"
          placeholder="New Password"
          class="input"
        />
        <button @click="changePassword" class="btn-primary mt-3">
          Update Password
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.btn-nav {
  @apply py-2 px-4 text-left rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-blue-500 hover:text-white transition;
}
.card {
  @apply bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6;
}
.section-title {
  @apply text-xl font-bold text-gray-800 dark:text-gray-100 mb-4;
}
.input {
  @apply w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none;
}
.btn-primary {
  @apply px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition;
}
.styled-table {
  @apply w-full border-collapse;
}
.styled-table th {
  @apply bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 sticky top-0;
}
.styled-table td {
  @apply py-2 px-4 border-b border-gray-200 dark:border-gray-700;
}
.status-badge {
  @apply px-3 py-1 rounded-full text-sm font-semibold capitalize;
}
.status-badge.pending {
  @apply bg-yellow-200 text-yellow-900;
}
.status-badge.completed {
  @apply bg-green-200 text-green-800;
}
.status-badge.problem {
  @apply bg-red-200 text-red-800;
}

.btn-action {
  @apply px-3 py-2 rounded-lg text-sm font-semibold transition;
}
.btn-action.complete {
  @apply bg-green-600 text-white hover:bg-green-700;
}
.btn-action.problem {
  @apply bg-red-600 text-white hover:bg-red-700;
}
</style>
