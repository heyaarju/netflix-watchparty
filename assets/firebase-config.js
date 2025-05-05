// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCVO0s3ki2g9z1bwG4AqplC_x3C5gqyFEE",
  authDomain: "netflix-watch-party.firebaseapp.com",
  databaseURL: "https://netflix-watch-party-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "netflix-watch-party",
  storageBucket: "netflix-watch-party.firebasestorage.app",
  messagingSenderId: "506431590630",
  appId: "1:506431590630:web:3955be0d0776307d4b6b27",
  measurementId: "G-GS5F9HYXY6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);