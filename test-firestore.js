import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, setDoc, doc, serverTimestamp } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    await getDocs(q);
    console.log("Read success");
  } catch(e) {
    console.error("Read Error:", e.message);
  }
  process.exit();
}
test();
