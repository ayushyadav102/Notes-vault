import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

import { getAuth, signInWithCustomToken, signInAnonymously } from "firebase/auth";

// we can't easily sign in with google in node, but we can try to find what the error is
// I will just print what keys I have.

const newNote = {
    title: "Math Notes",
    subject: "Math",
    department: 'general',
    grade: 10,
    pages: 10,
    sizeMB: 2.5,
    rating: 5.0,
    reviews: 0,
    author: {
      name: "Student",
      initials: "ST",
      badge: "Contributor",
      badgeStyle: "bg-tertiary-fixed text-on-tertiary-fixed"
    },
    thumbnailUrl: 'https://images.unsplash.com/photo',
    isPdf: true,
    ownerId: "some-uid",
    createdAt: "mock-timestamp"
};

console.log("Keys size:", Object.keys(newNote).length);
console.log("Keys:", Object.keys(newNote));

process.exit();
