import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-lingora";

process.on("unhandledRejection", (reason) => {
  const msg = reason?.message || "";
  if (msg.includes("Could not load the default credentials")) {
    console.warn(`\n[WARNING] Không thể tải thông tin đăng nhập Google Cloud default (ADC).`);
    console.warn(`Để chạy công cụ chẩn đoán này, vui lòng dùng Emulator hoặc thiết lập biến môi trường.`);
    console.warn(`Ví dụ chạy bằng Emulator:`);
    console.warn(`  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run profile:queries\n`);
    process.exit(0);
  } else {
    console.error("Unhandled Rejection:", reason);
    process.exit(1);
  }
});

console.log(`=== LINGORA FIRESTORE QUERY PROFILER ===`);
console.log(`Connecting to Project ID: ${projectId}`);

// Initialize Firebase Admin
if (getApps().length === 0) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Fallback to application default or emulator environment
    initializeApp({ projectId });
  }
}

const db = getFirestore();

// Define user journeys to profile
const journeys = [
  {
    name: "1. Learn Journey: Fetch published lesson revisions",
    query: db
      .collection("publishedLessonRevisions")
      .where("programId", "==", "general-english-cefr")
      .orderBy("versionNumber", "desc")
      .limit(1),
  },
  {
    name: "2. Review Journey: Fetch due review items for user",
    query: db
      .collection("users")
      .doc("sample-user-id")
      .collection("reviewItems")
      .where("nextReviewDate", "<=", new Date())
      .orderBy("nextReviewDate")
      .limit(50),
  },
  {
    name: "3. Exam Journey: Match candidates for blueprint slots",
    query: db
      .collection("questionVersions")
      .where("programId", "==", "general-english-cefr")
      .where("frameworkVersion", "==", "2020")
      .where("levelId", "==", "a1")
      .where("skill", "==", "reading")
      .where("status", "==", "approved"),
  },
  {
    name: "4. Admin Journey: Search audit logs chronologically",
    query: db.collection("auditLogs").orderBy("timestamp", "desc").limit(10),
  },
];

async function profileQueries() {
  try {
    for (const journey of journeys) {
      console.log(`\n--------------------------------------------------`);
      console.log(`Running Profile: ${journey.name}`);
      try {
        // Use explain() API if supported by the client SDK and Firestore service
        if (typeof journey.query.explain === "function") {
          console.log(`Executing Firestore Query Explain...`);
          const explainResult = await journey.query.explain({ analyze: true });
          
          console.log(`- Plan Summary:`, JSON.stringify(explainResult.planSummary, null, 2));
          console.log(`- Execution Stats:`, JSON.stringify(explainResult.stats, null, 2));
        } else {
          // Fallback to mock analysis / dry-run document counts
          console.log(`[Note] Explain API not supported in local mock/stub or old SDK. Running dry-run count...`);
          const countSnap = await journey.query.count().get();
          console.log(`- Estimated matching documents size: ${countSnap.data().count}`);
          console.log(`- Index Recommendation: Verify appropriate composite indexes are in firestore.indexes.json`);
        }
      } catch (error) {
        console.warn(`Could not complete profiling for: ${journey.name}`);
        console.warn(`Reason:`, error.message);
      }
    }
  } catch (globalError) {
    if (globalError.message.includes("Could not load the default credentials")) {
      console.warn(`\n[WARNING] Không thể tải thông tin đăng nhập Google Cloud default (ADC).`);
      console.warn(`Để chạy công cụ chẩn đoán này, vui lòng dùng Emulator hoặc thiết lập biến môi trường.`);
      console.warn(`Ví dụ chạy bằng Emulator:`);
      console.warn(`  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run profile:queries`);
    } else {
      console.error(`Error during query profiling:`, globalError.message);
    }
  }
  console.log(`\n==================================================`);
  console.log(`Query profiling run completed.`);
}

profileQueries().catch((err) => {
  console.error("Failed to run query diagnostics:", err);
});
