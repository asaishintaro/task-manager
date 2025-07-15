import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyB8jRFRJxiUBdfhxa1ExaOKB8O00CNZgdQ",
  authDomain: "task-manager-6f0f4.firebaseapp.com",
  projectId: "task-manager-6f0f4",
  storageBucket: "task-manager-6f0f4.firebasestorage.app",
  messagingSenderId: "273205436721",
  appId: "1:273205436721:web:267924b80e90122559d010"
}

// Firebase初期化
const app = initializeApp(firebaseConfig)

// Firestore初期化
export const db = getFirestore(app)