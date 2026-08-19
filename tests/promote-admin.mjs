import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const app = initializeApp({ projectId: "demo-lingora" });
const db = getFirestore(app);
const auth = getAuth(app);

try {
  const userRecord = await auth.getUserByEmail("admin@lingora.com");
  console.log("Found user in Auth with UID:", userRecord.uid);
  
  const userRef = db.collection("users").doc(userRecord.uid);
  await userRef.set({
    email: "admin@lingora.com",
    displayName: "Admin",
    role: "admin"
  }, { merge: true });
  
  console.log("Successfully promoted admin@lingora.com to admin in Firestore!");
} catch (error) {
  console.error("Error promoting user:", error);
}
