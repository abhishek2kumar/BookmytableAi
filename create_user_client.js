import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
const app = initializeApp(config);
const auth = getAuth(app);

async function run() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, "teststaff@gmail.com", "password123");
    console.log("Created user", cred.user.uid);
  } catch(e) {
    console.error("CREATE ERROR:", e.code, e.message);
  }
  process.exit();
}
run();
