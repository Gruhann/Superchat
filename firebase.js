import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCZPwVMXH71oOevMX-ei0iz1IAhMPme0NU",
  authDomain: "superchat-dc51b.firebaseapp.com",
  projectId: "superchat-dc51b",
  storageBucket: "superchat-dc51b.appspot.com",
  messagingSenderId: "752606694250",
  appId: "1:752606694250:web:ab002640e5b1d16800f313",
  measurementId: "G-J6H1DQ7JWB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };