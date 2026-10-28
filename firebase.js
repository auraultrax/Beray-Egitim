/* Aura X Eğitim — Firebase Auth + Cloud Firestore + callable Cloud Functions.
 * Firebase Auth persists its session using Firebase's IndexedDB persistence; student
 * profile, follow, notification and points data are not kept in localStorage.
 */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword, signInWithCustomToken, updateProfile,
  sendPasswordResetEmail, signOut, deleteUser
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  deleteDoc, runTransaction, query, where, orderBy, limit, serverTimestamp,
  Timestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import { firebaseConfig } from "./firebase-config.js";

const hasConfig = Boolean(firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_")
  && firebaseConfig.projectId && !firebaseConfig.projectId.startsWith("YOUR_")
  && firebaseConfig.appId && !firebaseConfig.appId.startsWith("YOUR_"));
if (!hasConfig) {
  console.warn("Firebase kurulumu gerekli: firebase-config.js içindeki YOUR_ değerlerini Firebase projenin gerçek ayarlarıyla değiştir.");
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");
export const firebaseReady = hasConfig;

// Firebase Auth helpers are exported directly so app.js can keep its existing API.
export {
  onAuthStateChanged, signInWithEmailAndPassword, signInWithCustomToken,
  updateProfile, sendPasswordResetEmail, signOut, deleteUser,
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  runTransaction, query, where, orderBy, limit, Timestamp, writeBatch
};

// The fourth argument was used by the former compatibility layer; Firebase Auth itself
// only creates the identity. The secure callable createUserProfile reserves the username.
export async function createUserWithEmailAndPasswordCompat(_auth, email, password, profile = {}) {
  const credential = await firebaseCreateUserWithEmailAndPassword(_auth, email, password);
  if (profile?.displayName) await updateProfile(credential.user, { displayName: String(profile.displayName).trim().slice(0, 80) });
  return credential;
}
export { createUserWithEmailAndPasswordCompat as createUserWithEmailAndPassword };
export { serverTimestamp, httpsCallable };

// Keep a compact callable wrapper shape { data } used throughout app.js.
export function callFirebaseFunction(name, payload = {}) {
  return httpsCallable(functions, String(name))(payload);
}
