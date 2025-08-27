<script setup>
import { ref, onMounted } from "vue";
import { db } from "../firebase/config";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";

const inquiries = ref([]);
const selectedInquiry = ref(null);

// Fetch real-time inquiries
onMounted(() => {
  const q = query(
    collection(db, "website_inquiry"),
    orderBy("receivedAt", "desc")
  );
  onSnapshot(q, (snap) => {
    inquiries.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
});

function openInquiry(inquiry) {
  selectedInquiry.value = inquiry;
}
function closeInquiry() {
  selectedInquiry.value = null;
}
async function markResponded() {
  if (!selectedInquiry.value) return;
  const refDoc = doc(db, "website_inquiry", selectedInquiry.value.id);
  await updateDoc(refDoc, { status: "responded" });
  closeInquiry(); // modal closes, list auto-refreshes
}
</script>

<template>
  <div class="p-6">
    <h2 class="text-2xl font-bold mb-4">📩 Website Inquiries</h2>

    <ul class="divide-y divide-gray-200 dark:divide-gray-700">
      <li
        v-for="inq in inquiries"
        :key="inq.id"
        class="flex justify-between items-center py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        @click="openInquiry(inq)"
      >
        <div>
          <p class="font-semibold text-gray-800 dark:text-gray-200">
            {{ inq.name }} ({{ inq.email }})
          </p>
        </div>
        <span
          class="px-3 py-1 text-sm rounded-full font-medium"
          :class="
            inq.status === 'pending'
              ? 'bg-yellow-200 text-yellow-900'
              : 'bg-green-200 text-green-800'
          "
        >
          {{ inq.status }}
        </span>
      </li>
    </ul>

    <!-- Modal -->
    <div
      v-if="selectedInquiry"
      class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-3xl p-6 max-h-[80vh] overflow-y-auto"
      >
        <h3 class="text-xl font-bold mb-4">Inquiry Details</h3>

        <div class="space-y-3">
          <p><strong>Name:</strong> {{ selectedInquiry.name }}</p>
          <p><strong>Email:</strong> {{ selectedInquiry.email }}</p>
          <p><strong>Subject:</strong> {{ selectedInquiry.subject }}</p>

          <!-- Message box -->
          <div
            class="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 whitespace-pre-line break-words"
          >
            <strong>Message:</strong><br />
            {{ selectedInquiry.message }}
          </div>

          <p class="text-sm text-gray-500 mt-2">
            Received:
            {{
              new Date(
                selectedInquiry.receivedAt?.seconds * 1000
              ).toLocaleString()
            }}
          </p>
        </div>

        <div class="flex justify-end gap-4 mt-6">
          <button
            @click="closeInquiry"
            class="px-5 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            @click="markResponded"
            class="px-5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Mark Responded
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
