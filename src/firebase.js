
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDoFbaX3hHHtsKPvlhVfC4j0sy2WMGBeDo",
  authDomain: "credit-app-05.firebaseapp.com",
  projectId: "credit-app-05",
  storageBucket: "credit-app-05.firebasestorage.app",
  messagingSenderId: "935173086975",
  appId: "1:935173086975:web:da96d00d8ac00acb0f36ca",
  measurementId: "G-908ZN6S5VZ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);