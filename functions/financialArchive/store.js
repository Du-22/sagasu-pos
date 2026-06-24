const { getFirestore } = require("firebase-admin/firestore");
const { getApp } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");

const STORE_ID = "default_store";
const db = getFirestore();

const collectionPath = (name) => `stores/${STORE_ID}/${name}`;
const docPath = (name, id) => `stores/${STORE_ID}/${name}/${id}`;
const normalizeRecord = (doc) => ({ id: doc.id, ...doc.data() });

const getProjectId = () => {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.GCP_PROJECT) return process.env.GCP_PROJECT;
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;

  try {
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || "{}");
    if (firebaseConfig.projectId) return firebaseConfig.projectId;
  } catch (error) {
    // Ignore malformed env config and fall back to the initialized app.
  }

  try {
    return getApp().options.projectId || null;
  } catch (error) {
    return null;
  }
};

const getArchiveBucketName = () => {
  if (process.env.FINANCIAL_ARCHIVE_BUCKET) {
    return process.env.FINANCIAL_ARCHIVE_BUCKET;
  }

  const projectId = getProjectId();
  return projectId ? `${projectId}-financial-archives` : null;
};

const getArchiveBucket = () => {
  const bucketName = getArchiveBucketName();
  return bucketName ? getStorage().bucket(bucketName) : getStorage().bucket();
};

const queryRecordsByDate = async (collectionName, startDate, endDate) => {
  const snapshot = await db
    .collection(collectionPath(collectionName))
    .where("date", ">=", startDate)
    .where("date", "<=", endDate)
    .get();

  return snapshot.docs
    .map(normalizeRecord)
    .sort((a, b) => {
      if ((a.date || "") !== (b.date || "")) {
        return (a.date || "").localeCompare(b.date || "");
      }
      const aSort = (a.timestamp || a.createdAt || "").toString();
      const bSort = (b.timestamp || b.createdAt || "").toString();
      if (aSort !== bSort) return aSort.localeCompare(bSort);
      return (a.id || "").localeCompare(b.id || "");
    });
};

const uploadFiles = async (files) => {
  const bucket = getArchiveBucket();

  await Promise.all(
    files.map((file) =>
      bucket.file(file.path).save(file.content, {
        resumable: false,
        metadata: {
          contentType: file.contentType,
          cacheControl: "private, max-age=0",
        },
      }),
    ),
  );

  return {
    bucket: bucket.name,
    files: files.map(({ key, path, size, sha256, contentType }) => ({
      key,
      path,
      size,
      sha256,
      contentType,
    })),
  };
};

const writeArchiveMetadata = async ({
  month,
  retentionMonths,
  deleteAfterArchive,
  dailySummaries,
  monthSummary,
  storageResult,
  validation,
  status,
}) => {
  const now = new Date().toISOString();
  const batch = db.batch();

  dailySummaries.forEach((summary) => {
    batch.set(
      db.doc(docPath("dailyFinancialSummaries", summary.date)),
      {
        ...summary,
        archivedAt: now,
        sourceRange: { month, retentionMonths },
      },
      { merge: true },
    );
  });

  batch.set(
    db.doc(docPath("monthlyFinancialSummaries", month)),
    {
      ...monthSummary,
      archivedAt: now,
      archiveStatus: status,
      storageBucket: storageResult?.bucket || null,
      storageFiles: storageResult?.files || [],
    },
    { merge: true },
  );

  batch.set(
    db.doc(docPath("archiveJobs", month)),
    {
      month,
      retentionMonths,
      deleteAfterArchive,
      status,
      completedAt: now,
      salesRecordCount: monthSummary.salesRecordCount,
      expenseRecordCount: monthSummary.expenseRecordCount,
      incomeTotal: monthSummary.incomeTotal,
      expenseTotal: monthSummary.expenseTotal,
      netTotal: monthSummary.netTotal,
      storageBucket: storageResult?.bucket || null,
      storageFiles: storageResult?.files || [],
      checks: validation.checks,
      updatedAt: now,
    },
    { merge: true },
  );

  await batch.commit();
};

const markArchiveStarted = async ({ month, retentionMonths, deleteAfterArchive, dryRun }) => {
  await db.doc(docPath("archiveJobs", month)).set(
    {
      month,
      retentionMonths,
      deleteAfterArchive,
      dryRun,
      status: dryRun ? "dry-run-started" : "started",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
};

const markArchiveFailed = async ({ month, error }) => {
  await db.doc(docPath("archiveJobs", month)).set(
    {
      status: "failed",
      error: error.message,
      failedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
};

const markArchiveDeleted = async (month) => {
  await db.doc(docPath("archiveJobs", month)).set(
    {
      status: "deleted",
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
};

const deleteRecords = async (collectionName, records) => {
  for (let index = 0; index < records.length; index += 450) {
    const batch = db.batch();
    records.slice(index, index + 450).forEach((record) => {
      batch.delete(db.doc(docPath(collectionName, record.id)));
    });
    await batch.commit();
  }
};

const getOldestDate = async (collectionName, latestEligibleEndDate) => {
  const snapshot = await db
    .collection(collectionPath(collectionName))
    .where("date", "<=", latestEligibleEndDate)
    .orderBy("date", "asc")
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0].data().date || null;
};

const getArchiveJobStatus = async (month) => {
  const job = await db.doc(docPath("archiveJobs", month)).get();
  return job.exists ? job.data().status : null;
};

module.exports = {
  queryRecordsByDate,
  uploadFiles,
  writeArchiveMetadata,
  markArchiveStarted,
  markArchiveFailed,
  markArchiveDeleted,
  deleteRecords,
  getOldestDate,
  getArchiveJobStatus,
};
