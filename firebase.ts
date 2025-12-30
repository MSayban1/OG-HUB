
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getDatabase, Database } from "firebase/database";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAa0UfhYRDKnn9XE5wmsqF_jmhn6N0IlRA",
  authDomain: "og-hub-4112b.firebaseapp.com",
  projectId: "og-hub-4112b",
  storageBucket: "og-hub-4112b.firebasestorage.app",
  messagingSenderId: "61980217114",
  appId: "1:61980217114:web:ffd92df654d65f422be6a3"
};

// Singleton pattern for Firebase initialization
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
export const db: Database = getDatabase(app);
export const db_fs: Firestore = getFirestore(app);

export default app;
