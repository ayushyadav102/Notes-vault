import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import fs from "fs";
import { getAuth, signInAnonymously } from "firebase/auth";

console.log("Checking syntax...");
