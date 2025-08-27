import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, serverTimestamp } from 'firebase/firestore'

// Paste your Firebase Web App config here:
export const firebaseConfig = {
  apiKey: "AIzaSyB4Z6UvR4xcp96KkaJ0JE8lMN4ySY-pkGs",
  authDomain: "hrmanagement-32049.firebaseapp.com",
  projectId: "hrmanagement-32049",
  storageBucket: "hrmanagement-32049.firebasestorage.app",
  messagingSenderId: "191674465507",
  appId: "1:191674465507:web:bbd0e4c14290349905d9d6",
  measurementId: "G-C5HKD04SQH"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const ts = () => serverTimestamp()
