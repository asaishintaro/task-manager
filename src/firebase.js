import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'

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

// Firebase Messaging動的初期化
export const getMessagingInstance = async () => {
  try {
    if (await isSupported()) {
      return getMessaging(app)
    }
    return null
  } catch (error) {
    console.warn('Firebase Messaging初期化エラー:', error)
    return null
  }
}

// VAPID公開鍵（実際の値は後で設定）
export const VAPID_KEY = 'BKxqiQQ3vP3X_PBXKj8GyzNJJxVYHfB1jK2LJY8mH9PzY5h4H3w7C2tLVkKjWxGmR8vF2gF9sA3pJqY2zB4vKlE'