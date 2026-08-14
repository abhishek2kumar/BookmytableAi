import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
initializeApp({
  projectId: config.projectId,
  credential: applicationDefault()
});
async function run() {
  try {
    const user = await getAuth().createUser({
      email: "teststaff@gmail.com",
      password: "password123",
      emailVerified: true
    });
    console.log("Created user", user.uid);
  } catch(e) {
    console.error(e);
  }
}
run();
