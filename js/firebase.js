
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-storage.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAMDQ0aUA9_4U1LAhL6IN6Yo9oBPejizUo",
    authDomain: "luqta-59d2d.firebaseapp.com",
    projectId: "luqta-59d2d",
    storageBucket: "luqta-59d2d.firebasestorage.app",
    messagingSenderId: "304328628022",
    appId: "1:304328628022:web:976bed5eeb0bfee8bac597",
    measurementId: "G-GFK5XWL5C9"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);

export const storage = getStorage(app);

console.log("Luqta connected to Firebase successfully!");
