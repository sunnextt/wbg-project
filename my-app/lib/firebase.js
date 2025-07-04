// lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// Optional: Only import analytics if in the browser
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAiDum2z945w_HjDwo_EPx3yG9lQKrPtiA",
  authDomain: "webbg-project.firebaseapp.com",
  projectId: "webbg-project",
  storageBucket: "webbg-project.firebasestorage.app",
  messagingSenderId: "223316959858",
  appId: "1:223316959858:web:b8f125664cffb242fc18eb",
  measurementId: "G-FG0XYERNK8",
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Optional: enable analytics only in browser
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((yes) => {
    if (yes) analytics = getAnalytics(app);
  });
}

export { app, auth, analytics };
