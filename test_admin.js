import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
initializeApp({
  projectId: config.projectId,
});
async function run() {
  try {
    const user = await getAuth().getUserByEmail("teststaff@gmail.com");
    console.log("User:", user.uid);
  } catch(e) {
    console.error(e);
  }
}
run();
