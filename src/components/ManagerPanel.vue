<!-- ManagerPanel.vue -->
<script setup>
import { ref, onMounted, watch } from "vue";
import { auth, db } from "../firebase/config";
import Inquiries from "./Inquiries.vue"; 
import AdminAttendance from "./AdminAttendance.vue"

// Auth (use secondary app for creating hires so you don't log out)
import {
  onAuthStateChanged,
  signOut as signOutCurrent,
  createUserWithEmailAndPassword,
  getAuth as getAuthFromApp,
  signOut as signOutSecondary,
} from "firebase/auth";
import { getApp, initializeApp } from "firebase/app";

// Firestore
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  where,
  Timestamp,
} from "firebase/firestore";

const currentView = ref("home");

// Auth state + profile
const user = ref(null); // firebase auth user
const userData = ref(null); // Firestore { name, designation, ... }

// Data
const tasks = ref([]);
const attendance = ref([]);
const users = ref([]);

// Forms
const taskTitle = ref("");
const taskAssignedTo = ref(""); // will store selected user's UID

const hireEmail = ref("");
const hireDes = ref("employee"); // will be saved as "designation"
const hireName = ref("");
const hireRole = ref(""); // role for new hire
function logout() {
  signOutCurrent(auth);
}

function showView(view) {
  currentView.value = view;
}

/** ----- Assign Task ----- */
async function assignTask() {
  if (!taskTitle.value || !taskAssignedTo.value) return;

  const assignedUser = users.value.find((u) => u.id === taskAssignedTo.value);

  await addDoc(collection(db, "tasks"), {
    task: taskTitle.value,
    assignedTo: assignedUser?.name || "Unknown",
    assignedToId: taskAssignedTo.value, // keep UID reference
    assignedBy: `${userData.value.name} (${userData.value.designation})`,
    status: "pending",
    assignedAt: serverTimestamp(),
  });

  taskTitle.value = "";
  taskAssignedTo.value = "";
  alert("✅ Task Assigned Successfully!");
}

/** ----- Register Hire (create Auth user WITHOUT switching the current admin session) ----- */
function getSecondaryAuth() {
  // Reuse if already created
  try {
    const app = getApp("Secondary");
    return getAuthFromApp(app);
  } catch {
    // Create secondary app using the same config as the primary app
    const secApp = initializeApp(auth.app.options, "Secondary");
    return getAuthFromApp(secApp);
  }
}

async function registerHire() {
  if (!hireEmail.value || !hireName.value) return;

  if(hireDes.value === "employee")
  {
    hireRole.value = "employee";
  }
  else
  {
    hireRole.value = "admin"; // use admin as role for ceo,coo,cto etc
  }

  try {
    const secondaryAuth = getSecondaryAuth();

    // Use a temporary password you’ll ask the hire to reset
    const tempPassword = "123456";

    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      hireEmail.value,
      tempPassword
    );
    const newUid = cred.user.uid;

    // attendance filter
    const selectedDate = ref(new Date().toISOString().split("T")[0]);

    // Store profile under users/{uid}
    await setDoc(doc(db, "users", newUid), {
      name: hireName.value,
      email: hireEmail.value,
      designation: hireDes.value,
      createdAt: serverTimestamp(),
      role: hireRole.value,
    });

    // Sign out the secondary auth so it doesn't linger
    await signOutSecondary(secondaryAuth);

    // Reset form
    hireEmail.value = "";
    hireName.value = "";
    hireDes.value = "employee";
    hireRole.value = "";

    alert(
      "✅ New Hire Registered Successfully! (Ask them to reset their password.)"
    );
  } catch (err) {
    console.error("Error registering hire:", err);
    alert("❌ Error: " + err.message);
  }
}

/** ----- Attendance (date-filtered, defaults to today) ----- */
const selectedDate = ref(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD (UTC-based; adjust if needed)

// Load attendance for selected date
function loadAttendance() {
  const formatted = new Date(selectedDate.value).toLocaleDateString();
  const q = query(collection(db, "attendance"), where("date", "==", formatted));
  onSnapshot(q, (snap) => {
    attendance.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

function applyDateFilter() {
  loadAttendance();
}

/** ----- Lifecycle ----- */
onMounted(() => {
  // Auth listener -> sets user + loads their Firestore profile
  onAuthStateChanged(auth, async (u) => {
    user.value = u;
    userData.value = null;
    if (u) {
      const docRef = doc(db, "users", u.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        userData.value = snap.data();
      } else {
        console.warn("No user profile found in Firestore for uid:", u.uid);
      }
    }
  });

  // Tasks stream
  const qTasks = query(collection(db, "tasks"), orderBy("assignedAt", "desc"));
  onSnapshot(qTasks, (snap) => {
    tasks.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });

  // Users stream (no orderBy to avoid index issues if some docs lack createdAt)
  const qUsers = query(collection(db, "users"));
  onSnapshot(qUsers, (snap) => {
    users.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });

  loadAttendance();
});

// Reload attendance when date changes
watch(selectedDate, (newDate) => {
  if (newDate) loadAttendanceForDate(newDate);
});
</script>

<template>
  <div class="flex h-screen bg-gray-100 dark:bg-gray-900">
    <!-- Sidebar -->
    <aside class="w-1/4 bg-white dark:bg-gray-800 shadow-lg flex flex-col p-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">
        Admin Portal
      </h2>

      <nav class="flex flex-col gap-3">
        <button @click="showView('home')" class="btn-nav">🏠 Home</button>
        <button @click="showView('attendance')" class="btn-nav">
          📅 Attendance
        </button>
        <button @click="showView('tasks')" class="btn-nav">✅ All Tasks</button>
        <button @click="showView('assign')" class="btn-nav">
          📝 Assign Task
        </button>
        <button @click="showView('hire')" class="btn-nav">
          👤 Register Hire
        </button>
        <button @click="showView('inquiries')" class="btn-nav">
          📩 Website Inquiries
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
      <div v-if="currentView === 'inquiries'">
        <Inquiries />
      </div>

      <!-- Home -->
      <div
        v-if="currentView === 'home'"
        class="flex flex-col items-center justify-center h-full"
      >
        <img
          class="w-32 h-32 rounded-full shadow-lg mb-4"
          :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(
            userData?.name || 'User'
          )}&background=0D8ABC&color=fff`"
        />
        <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Email: {{ user?.email }}
        </h1>
        <p v-if="userData" class="text-gray-500 dark:text-gray-400">
          Welcome back, {{ userData.name }}
        </p>
        <p v-if="userData" class="text-gray-500 dark:text-gray-400">
          Designation: {{ userData.designation }}
        </p>
       
      </div>
      

      <!-- Attendance -->
      <div v-if="currentView === 'attendance'" class="card mt-6">
        <h2 class="section-title">Attendance</h2>

        <div class="flex gap-3 mb-4">
          <input type="date" v-model="selectedDate" class="input w-60" />
          <button @click="applyDateFilter" class="btn-primary">Apply</button>
        </div>

        <table class="styled-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in attendance" :key="a.id">
              <td>{{ a.name }}</td>
              <td>{{ a.checkIn || "-" }}</td>
              <td>{{ a.checkOut || "-" }}</td>
              <td>{{ a.date }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Tasks -->
      <div v-if="currentView === 'tasks'" class="card">
        <h2 class="section-title">All Tasks</h2>
        <table class="styled-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Assigned To</th>
              <th>Assigned By</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tasks" :key="t.id">
              <td>{{ t.task }}</td>
              <td>{{ t.assignedTo }}</td>
              <td>{{ t.assignedBy }}</td>
              <td>
                <span class="status-badge" :class="t.status">{{
                  t.status
                }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Assign Task -->
      <div v-if="currentView === 'assign'" class="card">
        <h2 class="section-title">Assign New Task</h2>
        <input
          v-model="taskTitle"
          placeholder="Please enter task"
          class="input"
        />
        <select v-model="taskAssignedTo" class="input mt-2">
          <option disabled value="">-- Select employee --</option>
          <option v-for="u in users" :key="u.id" :value="u.id">
            {{ u.name }} <span v-if="u.designation">({{ u.designation }})</span>
          </option>
        </select>
        <button @click="assignTask" class="btn-primary mt-3">
          Assign Task
        </button>
      </div>

      <!-- Register Hire -->
      <div v-if="currentView === 'hire'" class="card">
        <h2 class="section-title">Register New Hire</h2>
        <input v-model="hireName" placeholder="Full Name" class="input" />
        <input v-model="hireEmail" placeholder="Email" class="input mt-2" />
        <select v-model="hireDes" class="input mt-2">
          <option value="employee">Employee</option>
          <option value="E-commerce Manager">E-Commerce Manager</option>
          <option value="Supervisor">Supervisor</option>
          <option value="CEO & Co-Founder">CEO & Co-Founder</option>
          <option value="Social Media Expert & Co-Founder">Social Media Expert & Co-Founder</option>
          <option value="Senior Software Engineer & CTO">Senior Software Engineer & CTO</option>
        </select>
        <button @click="registerHire" class="btn-primary mt-3">Register</button>
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
  @apply px-3 py-1 rounded-full text-sm font-semibold;
}
.status-badge.pending {
  @apply bg-yellow-200 text-yellow-800;
}
.status-badge.completed {
  @apply bg-green-200 text-green-800;
}
.status-badge.problem {
  @apply bg-red-200 text-red-800;
}
</style>
