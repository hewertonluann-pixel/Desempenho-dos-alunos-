// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdMROcKph5I-ClMiOmPiBXgGpDxoF2dZc",
  authDomain: "asafenotas-5cf3f.firebaseapp.com",
  projectId: "asafenotas-5cf3f",
  storageBucket: "asafenotas-5cf3f.firebasestorage.app",
  messagingSenderId: "312062581585",
  appId: "1:312062581585:web:432ff63a527dd86fc1170",
  measurementId: "G-Z6G6D4RKZQ"
};

const app = initializeApp(firebaseConfig);

// 👇 ESSENCIAL
export const db = getFirestore(app);
