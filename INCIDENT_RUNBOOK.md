# Lingora Incident Runbook & Disaster Recovery Plan

This document serves as the operational guide for managing production incidents, disaster recovery, database backups, and rollback drills on the Lingora platform.

---

## 1. System Observability & Monitoring

### 1.1 Logs & Error Tracking
Lingora uses a structured JSON logger (`src/lib/logger.ts`) emitting logs to `stdout`/`stderr`.
*   **Production Log Parser:** Integrated with Google Cloud Logging / GCP Operations Suite.
*   **Severity Levels:** `INFO`, `WARNING`, `ERROR`, `DEBUG`.
*   **Search Queries for GCP Logs Explorer:**
    *   **Find all API errors:**
        ```query
        resource.type="cloud_run_revision"
        jsonPayload.level="ERROR"
        ```
    *   **Audit account deletion events:**
        ```query
        jsonPayload.message="Failed to delete user account" OR jsonPayload.path="/api/user/delete"
        ```
    *   **Trace user-specific journey:**
        ```query
        jsonPayload.userId="TARGET_USER_ID"
        ```

### 1.2 Budget Alerts
To avoid unexpected billing spikes on Firebase/GCP:
1.  Navigate to **GCP Console > Billing > Budgets & alerts**.
2.  Set alerts at **50%**, **70%**, **90%**, and **100%** of the monthly budget.
3.  Configure Pub/Sub integration to automatically notify the engineering Slack channel when budget limits are breached.

---

## 2. Firebase/Firestore Backups & Point-in-Time Recovery (PITR)

Firestore supports automated daily backups and Point-in-Time Recovery (PITR) for granular restorations.

### 2.1 Enabling PITR
PITR must be enabled on the database before you can perform point-in-time restores:
```bash
gcloud firestore databases update --database="(default)" --enable-point-in-time-recovery
```
*Note: PITR allows restoring to any timestamp within the last 7 days.*

### 2.2 Performing a Point-in-Time Restore (Restore Drill)
To restore the production database to a staging database at a specific timestamp:

1.  **Identify the Target Restore Timestamp:** Format must be ISO 8601 (e.g. `2026-08-19T10:00:00Z`).
2.  **Run the Restore Command:**
    ```bash
    gcloud firestore databases restore \
      --source-database="projects/lingora-prod/databases/(default)" \
      --destination-database="projects/lingora-staging/databases/restored-db" \
      --restore-time="2026-08-19T10:00:00Z"
    ```
3.  **Verify Data Integrity in Staging:**
    *   Confirm that the `users`, `attempts`, and `publishedLessonRevisions` collections exist and contain the correct snapshots at the target timestamp.

### 2.3 Scheduled Nightly Backups
To schedule automated daily database exports to a Google Cloud Storage bucket:

1.  **Create a Cloud Storage Bucket:**
    ```bash
    gsutil mb -p lingora-prod -c NEARLINE gs://lingora-firestore-backups/
    ```
2.  **Configure Service Account Permissions:**
    Give Firestore import/export permissions to the Firestore Service Agent.
3.  **Deploy Cloud Scheduler Job:**
    Set up a daily cron job that triggers the export API:
    ```bash
    gcloud scheduler jobs create http firestore-daily-backup \
      --schedule="0 2 * * *" \
      --uri="https://firestore.googleapis.com/v1/projects/lingora-prod/databases/(default):exportDocuments" \
      --message-body='{"outputUriPrefix": "gs://lingora-firestore-backups"}' \
      --oauth-service-account-email="backup-operator@lingora-prod.iam.gserviceaccount.com"
    ```

---

## 3. Rollback Procedures

### 3.1 App Engine / Frontend Rollback
If a buggy frontend deployment is pushed:
*   **Vercel / Next.js Hosting:**
    1.  Navigate to the project dashboard.
    2.  Select the last known stable deployment.
    3.  Click **Promote to Production** (instant rollback).
*   **Firebase Hosting:**
    ```bash
    firebase hosting:clone lingora-prod:stable-release-tag lingora-prod:live
    ```

### 3.2 Content Rollback
If a lesson release contains factual errors or broken assets, you can revert published revisions using the admin workflow API:
1.  **Determine the Stable Lesson Revision ID:** Search `publishedLessonRevisions` for the target lesson and identify the version number to revert to.
2.  **Submit Reversion Request via CLI/Admin Panel:**
    ```bash
    curl -X POST https://lingora.edu.vn/api/admin/content/workflow \
      -H "Authorization: Bearer ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"action": "revert", "lessonId": "LESSON_ID", "targetRevisionNumber": 12}'
    ```

---

## 4. Troubleshooting Production Outages

### 4.1 "429 Too Many Requests" / Rate Limit Spikes
If legitimate users complain about receiving 429 errors:
1.  **Identify if the Limit is Hit globally or per IP:** Check GCP Logs for `checkRateLimit` warnings.
2.  **Locate the offending client UID/IP:** If it is a DDoS attack, block the IP range at the CDN (Cloudflare) or Cloud Armor level.
3.  **Temporarily Adjust Rate Limit Thresholds:**
    Modify environment variables in `.env.local` or the GCP deployment configuration:
    ```env
    # Example adjustment to increase capacity
    MAX_ATTEMPTS_PER_MINUTE=20
    ```

### 4.2 Hot Documents & Contention
If Firestore write latency spikes:
*   **Cause:** Writing too frequently to a single document (e.g. updating a global statistics counter).
*   **Solution:**
    1.  Disable global sequential counters.
    2.  Implement distributed counters (sharding the write load across multiple documents) or batch counter updates in memory before writing to Firestore.

### 4.3 Database Security Rules Deployment Failures
If security rules block normal user traffic:
1.  **Verify Local Rules Syntactical Correctness:**
    ```bash
    npm run test:rules
    ```
2.  **Rollback Security Rules to Stable:**
    Keep your security rules version-controlled. If deployed rules break apps, immediately redeploy the previous commit:
    ```bash
    firebase deploy --only firestore:rules
    ```
