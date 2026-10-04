import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { getFunctions } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBBPmYjL_OSdBWsUkeS5ZS9-YnVPqyhdko',
  authDomain: 'sistem-16411.firebaseapp.com',
  projectId: 'sistem-16411',
  storageBucket: 'sistem-16411.firebasestorage.app',
  messagingSenderId: '1036642820709',
  appId: '1:1036642820709:web:dfa1cd766ff6956580dc8c'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export default app;
