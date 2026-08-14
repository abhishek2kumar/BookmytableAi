import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, getDocs, query, collection, where, serverTimestamp } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  try {
    const cred = await signInWithEmailAndPassword(auth, "teststaff@gmail.com", "password123");
    console.log("Logged in:", cred.user.uid);
    // Find restaurant directly by ID to ensure we test update
    // Let's first query without auth using admin and add them to partnerEmails
  } catch(e) {
    console.error(e);
  }
}
run();
