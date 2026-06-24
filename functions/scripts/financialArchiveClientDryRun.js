const { initializeApp, getApps } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} = require("firebase/firestore");
const {
  DEFAULT_RETENTION_MONTHS,
  parseMonth,
  getMonthRange,
  getLatestEligibleMonth,
  isEligibleMonth,
  listMonths,
} = require("../financialArchive/dateUtils");
const { buildSummaries } = require("../financialArchive/summary");
const { buildArchiveFiles, validateArchive } = require("../financialArchive/serializers");

const STORE_ID = "default_store";

const WEB_CONFIGS = {
  "sagasu-pos-system-dev": {
    apiKey: "AIzaSyAbuVw7G5Aiu7I27KLETVVKSOlaUuL1rAI",
    authDomain: "sagasu-pos-system-dev.firebaseapp.com",
    projectId: "sagasu-pos-system-dev",
    storageBucket: "sagasu-pos-system-dev.firebasestorage.app",
    messagingSenderId: "487308381018",
    appId: "1:487308381018:web:9429ec23acfb8298e58163",
  },
  "sagasu-pos-system": {
    apiKey: "AIzaSyChkGM347PKI5yNPgLQeUOX9fTmf7gQlbA",
    authDomain: "sagasu-pos-system.firebaseapp.com",
    projectId: "sagasu-pos-system",
    storageBucket: "sagasu-pos-system.firebasestorage.app",
    messagingSenderId: "226107846688",
    appId: "1:226107846688:web:9c98bd8379ec0c66e28c45",
  },
};

const compareArchiveRecords = (a, b) => {
  if ((a.date || "") !== (b.date || "")) return (a.date || "").localeCompare(b.date || "");
  const aSort = (a.timestamp || a.createdAt || "").toString();
  const bSort = (b.timestamp || b.createdAt || "").toString();
  if (aSort !== bSort) return aSort.localeCompare(bSort);
  return (a.id || "").localeCompare(b.id || "");
};

const initClientDb = (projectId) => {
  const existingApp = getApps()[0];
  if (existingApp) return getFirestore(existingApp);

  const config = WEB_CONFIGS[projectId];
  if (!config) throw new Error(`No web Firebase config for project: ${projectId}`);
  return getFirestore(initializeApp(config));
};

const queryRecordsByDate = async (db, collectionName, startDate, endDate) => {
  const recordsQuery = query(
    collection(db, "stores", STORE_ID, collectionName),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
  );
  const snapshot = await getDocs(recordsQuery);
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .sort(compareArchiveRecords);
};

const getOldestDate = async (db, collectionName, latestEligibleEndDate) => {
  const oldestQuery = query(
    collection(db, "stores", STORE_ID, collectionName),
    where("date", "<=", latestEligibleEndDate),
    orderBy("date", "asc"),
    limit(1),
  );
  const snapshot = await getDocs(oldestQuery);
  return snapshot.empty ? null : snapshot.docs[0].data().date || null;
};

const getArchiveJobStatus = async (db, month) => {
  const jobQuery = query(
    collection(db, "stores", STORE_ID, "archiveJobs"),
    where("month", "==", month),
    limit(1),
  );
  const snapshot = await getDocs(jobQuery);
  return snapshot.empty ? null : snapshot.docs[0].data().status || null;
};

const findOldestUnarchivedMonth = async (db, retentionMonths) => {
  const latestEligibleMonth = getLatestEligibleMonth(retentionMonths);
  const { endDate } = getMonthRange(latestEligibleMonth);
  const [oldestSalesDate, oldestExpenseDate] = await Promise.all([
    getOldestDate(db, "sales", endDate),
    getOldestDate(db, "expenseRecords", endDate),
  ]);
  const oldestDate = [oldestSalesDate, oldestExpenseDate].filter(Boolean).sort()[0];
  if (!oldestDate) return null;

  for (const candidateMonth of listMonths(oldestDate.slice(0, 7), latestEligibleMonth)) {
    const status = await getArchiveJobStatus(db, candidateMonth);
    if (!["archived", "deleted"].includes(status)) return candidateMonth;
  }
  return null;
};

const runClientDryRun = async (options) => {
  const db = initClientDb(options.projectId);
  const retentionMonths =
    Math.max(1, Number(options.retentionMonths) || DEFAULT_RETENTION_MONTHS);
  const month = options.oldest
    ? await findOldestUnarchivedMonth(db, retentionMonths)
    : options.month;

  if (!month) {
    return {
      success: true,
      skipped: true,
      mode: "client-dry-run",
      reason: "No eligible month found",
      retentionMonths,
    };
  }

  parseMonth(month);
  if (!options.force && !isEligibleMonth(month, retentionMonths)) {
    throw new Error(`${month} is still inside the ${retentionMonths}-month retention window`);
  }

  const { startDate, endDate } = getMonthRange(month);
  const [salesRecords, expenseRecords] = await Promise.all([
    queryRecordsByDate(db, "sales", startDate, endDate),
    queryRecordsByDate(db, "expenseRecords", startDate, endDate),
  ]);
  const { monthSummary } = buildSummaries({
    month,
    startDate,
    endDate,
    salesRecords,
    expenseRecords,
  });
  const files = buildArchiveFiles({
    month,
    startDate,
    endDate,
    retentionMonths,
    salesRecords,
    expenseRecords,
    monthSummary,
  });
  const validation = validateArchive({ salesRecords, expenseRecords, monthSummary, files });

  return {
    success: validation.ok,
    mode: "client-dry-run",
    month,
    startDate,
    endDate,
    retentionMonths,
    dryRun: true,
    deleteAfterArchive: false,
    status: "dry-run",
    salesRecordCount: salesRecords.length,
    expenseRecordCount: expenseRecords.length,
    incomeTotal: monthSummary.incomeTotal,
    expenseTotal: monthSummary.expenseTotal,
    netTotal: monthSummary.netTotal,
    storageFiles: files.map(({ key, path, size, sha256 }) => ({
      key,
      path,
      size,
      sha256,
    })),
    checks: validation.checks,
  };
};

module.exports = {
  WEB_CONFIGS,
  runClientDryRun,
};

