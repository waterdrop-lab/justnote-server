// Import the functions you need from the SDKs you need
const { initializeApp } = require("firebase/app");
const { getAnalytics } = require("firebase/analytics");
const { getAuth } = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC7pwa4Tf2RCCkfj4TUFyC7zDcj1TI0fWc",
  authDomain: "pure-note-firebase.firebaseapp.com",
  projectId: "pure-note-firebase",
  storageBucket: "pure-note-firebase.appspot.com",
  messagingSenderId: "1076271707947",
  appId: "1:1076271707947:web:e5e534a3017104003c776e",
  measurementId: "G-D2DB1062E0",
};

// Initialize Firebase
const firebase = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebase);
const auth = getAuth(firebase);
module.exports.firebase = getFirestore(firebase);

module.exports.analytics = analytics;
module.exports.auth = auth;
module.exports.firestore = firestore;
