import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin environment variables!");
  process.exit(1);
}

const app = initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  let uid;
  try {
    const userRecord = await auth.createUser({
      email: "admin@lingora.com",
      password: "Password123",
      displayName: "Admin",
    });
    uid = userRecord.uid;
    console.log("Created new user in Auth with UID:", uid);
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      const userRecord = await auth.getUserByEmail("admin@lingora.com");
      uid = userRecord.uid;
      console.log("User already exists in Auth with UID:", uid);
    } else {
      console.error("Error creating user:", error);
      process.exit(1);
    }
  }

  try {
    const userRef = db.collection("users").doc(uid);
    await userRef.set({
      email: "admin@lingora.com",
      displayName: "Admin",
      role: "admin",
    }, { merge: true });
    
    console.log("Successfully created and promoted admin@lingora.com to admin in Firestore!");
  } catch (error) {
    console.error("Error promoting user:", error);
    process.exit(1);
  }
}

run();
