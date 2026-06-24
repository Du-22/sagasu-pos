const crypto = require("crypto");
const path = require("path");
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { getApp } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");

const STORE_ID = "default_store";
const SESSION_TTL_MS = 10 * 60 * 1000;
const db = getFirestore();

const docPath = (name, id) => `stores/${STORE_ID}/${name}/${id}`;

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

const getArchiveBucketName = (storedBucket) => {
  if (storedBucket) return storedBucket;
  if (process.env.FINANCIAL_ARCHIVE_BUCKET) {
    return process.env.FINANCIAL_ARCHIVE_BUCKET;
  }

  const projectId = getProjectId();
  return projectId ? `${projectId}-financial-archives` : null;
};

const hashValue = (value) => crypto.createHash("sha256").update(value).digest("hex");

const timingSafeEqual = (left, right) => {
  const leftBuffer = Buffer.from(left || "", "hex");
  const rightBuffer = Buffer.from(right || "", "hex");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyArchiveDownloadPassword = async (password) => {
  if (!password || typeof password !== "string") return false;

  const authSnap = await db.doc(docPath("settings", "auth")).get();
  if (!authSnap.exists) throw new Error("AUTH_NOT_CONFIGURED");

  const { hashedPassword, salt } = authSnap.data();
  const inputHash = hashValue(`${password}${salt || ""}`);
  return timingSafeEqual(inputHash, hashedPassword);
};

const validateMonth = (month) => {
  if (!/^\d{4}-\d{2}$/.test(month || "")) {
    throw new Error("INVALID_MONTH");
  }
};

const getDownloadBaseUrl = () => {
  const projectId = getProjectId();
  const region =
    process.env.FUNCTION_REGION ||
    process.env.X_GOOGLE_FUNCTION_REGION ||
    "us-central1";

  if (!projectId) throw new Error("PROJECT_ID_NOT_FOUND");
  return `https://${region}-${projectId}.cloudfunctions.net/downloadFinancialArchiveFile`;
};

const getDownloadFilename = (month, filePath) => {
  const originalName = path.posix.basename(filePath || "archive-file");
  return `sagasu-${month}-${originalName}`;
};

const createFinancialArchiveDownloadSession = onCall(async (request) => {
  const { month, password } = request.data || {};
  validateMonth(month);

  const passwordOk = await verifyArchiveDownloadPassword(password);
  if (!passwordOk) {
    return {
      success: false,
      errorCode: "INVALID_PASSWORD",
      error: "密碼錯誤，無法建立下載連結。",
    };
  }

  const summarySnap = await db.doc(docPath("monthlyFinancialSummaries", month)).get();
  if (!summarySnap.exists) {
    return {
      success: false,
      errorCode: "ARCHIVE_NOT_FOUND",
      error: "找不到這個月份的封存資料。",
    };
  }

  const summary = summarySnap.data();
  const storageFiles = Array.isArray(summary.storageFiles)
    ? summary.storageFiles.filter((file) => file?.key && file?.path)
    : [];

  if (storageFiles.length === 0) {
    return {
      success: false,
      errorCode: "ARCHIVE_FILES_NOT_FOUND",
      error: "這個月份沒有可下載的封存檔。",
    };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashValue(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const storageBucket = getArchiveBucketName(summary.storageBucket);
  const files = storageFiles.map(({ key, path: filePath, size, contentType }) => ({
    key,
    path: filePath,
    size: Number(size) || 0,
    contentType: contentType || "application/octet-stream",
    filename: getDownloadFilename(month, filePath),
  }));

  await db.doc(docPath("archiveDownloadSessions", tokenHash)).set({
    month,
    expiresAt,
    storageBucket,
    files,
    createdAt: new Date().toISOString(),
  });

  const baseUrl = getDownloadBaseUrl();
  return {
    success: true,
    month,
    expiresAt,
    files: files.map((file) => ({
      key: file.key,
      filename: file.filename,
      size: file.size,
      contentType: file.contentType,
      url: `${baseUrl}?token=${encodeURIComponent(token)}&key=${encodeURIComponent(file.key)}`,
    })),
  };
});

const downloadFinancialArchiveFile = onRequest(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const token = String(req.query.token || "");
    const fileKey = String(req.query.key || "");
    if (!token || !fileKey) {
      res.status(400).send("Missing download token or file key.");
      return;
    }

    const sessionSnap = await db
      .doc(docPath("archiveDownloadSessions", hashValue(token)))
      .get();

    if (!sessionSnap.exists) {
      res.status(403).send("Download session not found.");
      return;
    }

    const session = sessionSnap.data();
    if (Date.parse(session.expiresAt || "") <= Date.now()) {
      res.status(403).send("Download session expired.");
      return;
    }

    const fileMeta = (session.files || []).find((file) => file.key === fileKey);
    if (!fileMeta) {
      res.status(404).send("Archive file not found in this session.");
      return;
    }

    const bucketName = getArchiveBucketName(session.storageBucket);
    const file = getStorage().bucket(bucketName).file(fileMeta.path);
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).send("Archive file does not exist.");
      return;
    }

    res.set("Cache-Control", "private, no-store, max-age=0");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Content-Type", fileMeta.contentType || "application/octet-stream");
    res.set(
      "Content-Disposition",
      `attachment; filename="${fileMeta.filename || path.posix.basename(fileMeta.path)}"`,
    );

    file.createReadStream()
      .on("error", (error) => {
        console.error("封存檔下載失敗:", error);
        if (!res.headersSent) res.status(500).send("Archive download failed.");
        else res.destroy(error);
      })
      .pipe(res);
  } catch (error) {
    console.error("建立封存下載回應失敗:", error);
    if (!res.headersSent) res.status(500).send("Archive download failed.");
  }
});

module.exports = {
  createFinancialArchiveDownloadSession,
  downloadFinancialArchiveFile,
};
