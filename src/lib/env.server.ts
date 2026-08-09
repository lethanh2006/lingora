import "server-only";

import { z } from "zod";

const firebaseAdminEnvSchema = z.object({
  projectId: z.string().min(1),
  clientEmail: z.email(),
  privateKey: z.string().min(1),
});

export function getFirebaseAdminEnv() {
  const env = firebaseAdminEnvSchema.parse({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  });

  return {
    ...env,
    privateKey: env.privateKey.replace(/\\n/g, "\n"),
  };
}
