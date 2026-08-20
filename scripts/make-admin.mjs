import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? (emulator ? "demo-lingora" : "lingora-303ad");

const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

const config = {
  projectId,
  ...(clientEmail && privateKey ? { credential: cert({ projectId, clientEmail, privateKey }) } : {})
};

const app = initializeApp(config);
const db = getFirestore(app);

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Please provide an email. Usage: node scripts/make-admin.mjs <email>");
    process.exit(1);
  }

  console.log(`Searching for user with email: ${email}...`);
  const usersRef = db.collection("users");
  const snap = await usersRef.where("email", "==", email).get();

  if (snap.empty) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const doc = snap.docs[0];
  await doc.ref.update({ role: "admin" });
  console.log(`Successfully elevated user ${email} (UID: ${doc.id}) to admin role!`);
}

main()
  .catch(console.error)
  .finally(() => deleteApp(app));
