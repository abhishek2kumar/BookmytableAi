import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  try {
    const cred = await signInWithEmailAndPassword(auth, "teststaff@gmail.com", "password123");
    console.log("Logged in:", cred.user.uid);
    // Find the restaurant where this staff has access
    // For now we assume we know a restaurant id or we can query
    // Wait, I can't create an account if it fails...
  } catch(e) {
    console.error(e);
  }
}
run();
