const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  DEFAULT_RETENTION_MONTHS,
  parseMonth,
  getMonthRange,
  getLatestEligibleMonth,
  isEligibleMonth,
  listMonths,
} = require("./dateUtils");
const { buildSummaries } = require("./summary");
const { buildArchiveFiles, validateArchive } = require("./serializers");
const {
  queryRecordsByDate,
  uploadFiles,
  writeArchiveMetadata,
  markArchiveStarted,
  markArchiveFailed,
  markArchiveDeleted,
  deleteRecords,
  getOldestDate,
  getArchiveJobStatus,
} = require("./store");

const archiveFinancialMonthCore = async ({
  month,
  retentionMonths = DEFAULT_RETENTION_MONTHS,
  dryRun = true,
  deleteAfterArchive = false,
  force = false,
} = {}) => {
  if (!month) throw new Error("month is required");
  parseMonth(month);

  const safeRetentionMonths = Math.max(1, Number(retentionMonths) || DEFAULT_RETENTION_MONTHS);
  if (!force && !isEligibleMonth(month, safeRetentionMonths)) {
    throw new Error(`${month} is still inside the ${safeRetentionMonths}-month retention window`);
  }

  const { startDate, endDate } = getMonthRange(month);
  if (!dryRun) {
    await markArchiveStarted({ month, retentionMonths: safeRetentionMonths, deleteAfterArchive, dryRun });
  }

  try {
    const [salesRecords, expenseRecords] = await Promise.all([
      queryRecordsByDate("sales", startDate, endDate),
      queryRecordsByDate("expenseRecords", startDate, endDate),
    ]);
    const { dailySummaries, monthSummary } = buildSummaries({
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
      retentionMonths: safeRetentionMonths,
      salesRecords,
      expenseRecords,
      monthSummary,
    });
    const validation = validateArchive({ salesRecords, expenseRecords, monthSummary, files });
    if (!validation.ok) throw new Error(`archive validation failed for ${month}`);

    let storageResult = null;
    let status = dryRun ? "dry-run" : "archived";
    if (!dryRun) {
      storageResult = await uploadFiles(files);
      await writeArchiveMetadata({
        month,
        retentionMonths: safeRetentionMonths,
        deleteAfterArchive,
        dailySummaries,
        monthSummary,
        storageResult,
        validation,
        status,
      });

      if (deleteAfterArchive) {
        await deleteRecords("sales", salesRecords);
        await deleteRecords("expenseRecords", expenseRecords);
        status = "deleted";
        await markArchiveDeleted(month);
      }
    }

    return {
      success: true,
      month,
      startDate,
      endDate,
      retentionMonths: safeRetentionMonths,
      dryRun,
      deleteAfterArchive,
      status,
      salesRecordCount: salesRecords.length,
      expenseRecordCount: expenseRecords.length,
      incomeTotal: monthSummary.incomeTotal,
      expenseTotal: monthSummary.expenseTotal,
      netTotal: monthSummary.netTotal,
      storageBucket: storageResult?.bucket || null,
      storageFiles: storageResult?.files || files.map(({ key, path, size, sha256 }) => ({
        key,
        path,
        size,
        sha256,
      })),
      checks: validation.checks,
    };
  } catch (error) {
    if (!dryRun) await markArchiveFailed({ month, error });
    throw error;
  }
};

const findOldestUnarchivedMonth = async (retentionMonths) => {
  const latestEligibleMonth = getLatestEligibleMonth(retentionMonths);
  const { endDate } = getMonthRange(latestEligibleMonth);
  const [oldestSalesDate, oldestExpenseDate] = await Promise.all([
    getOldestDate("sales", endDate),
    getOldestDate("expenseRecords", endDate),
  ]);
  const oldestDate = [oldestSalesDate, oldestExpenseDate].filter(Boolean).sort()[0];
  if (!oldestDate) return null;

  for (const candidateMonth of listMonths(oldestDate.slice(0, 7), latestEligibleMonth)) {
    const status = await getArchiveJobStatus(candidateMonth);
    if (!["archived", "deleted"].includes(status)) return candidateMonth;
  }

  return null;
};

const archiveOldestEligibleMonthCore = async ({
  retentionMonths = DEFAULT_RETENTION_MONTHS,
  dryRun = false,
  deleteAfterArchive = false,
} = {}) => {
  const safeRetentionMonths = Math.max(1, Number(retentionMonths) || DEFAULT_RETENTION_MONTHS);
  const month = await findOldestUnarchivedMonth(safeRetentionMonths);

  if (!month) {
    return {
      success: true,
      skipped: true,
      reason: "No eligible month found",
      retentionMonths: safeRetentionMonths,
    };
  }

  return archiveFinancialMonthCore({
    month,
    retentionMonths: safeRetentionMonths,
    dryRun,
    deleteAfterArchive,
  });
};

const archiveFinancialMonth = onCall(async (request) => {
  const data = request.data || {};
  return archiveFinancialMonthCore({
    month: data.month,
    retentionMonths: data.retentionMonths,
    dryRun: data.dryRun !== false,
    deleteAfterArchive: data.deleteAfterArchive === true,
    force: data.force === true,
  });
});

const monthlyFinancialArchive = onSchedule(
  {
    schedule: "0 3 3 * *",
    timeZone: "Asia/Taipei",
  },
  async () =>
    archiveOldestEligibleMonthCore({
      retentionMonths: DEFAULT_RETENTION_MONTHS,
      dryRun: false,
      deleteAfterArchive: false,
    }),
);

module.exports = {
  archiveFinancialMonth,
  monthlyFinancialArchive,
  archiveFinancialMonthCore,
  archiveOldestEligibleMonthCore,
};
