// js/firebase-config.js
// Firebase configuration for employee storage

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Your Firebase configuration
// REPLACE WITH YOUR ACTUAL FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyBhG1W9XMma0OTCF-JNaHpz5KEU7glSvhk",
    authDomain: "philtech-payroll.firebaseapp.com",
    projectId: "philtech-payroll",
    storageBucket: "philtech-payroll.firebasestorage.app",
    messagingSenderId: "988193021445",
    appId: "1:988193021445:web:20553630a83c8db5e8066c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export Firebase functions
export { 
    db, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where,
    getDoc
};