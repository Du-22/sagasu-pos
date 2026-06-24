const crypto = require("crypto");
const { toNumber } = require("./summary");

const ARCHIVE_ROOT = "financial-archives";

const sha256 = (content) =>
  crypto.createHash("sha256").update(content, "utf8").digest("hex");

const normalizeForStableJson = (value) => {
  if (Array.isArray(value)) return value.map(normalizeForStableJson);
  if (!value || typeof value !== "object") return value;

  return Object.keys(value)
    .sort()
    .reduce((normalized, key) => {
      normalized[key] = normalizeForStableJson(value[key]);
      return normalized;
    }, {});
};

const stableStringify = (value) =>
  JSON.stringify(normalizeForStableJson(value));

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const normalized =
    typeof value === "object" ? stableStringify(value) : String(value);
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const recordsToJsonl = (records) =>
  records.length ? `${records.map((record) => stableStringify(record)).join("\n")}\n` : "";

const recordsToCsv = (records, columns) => {
  const header = columns.map((column) => csvEscape(column.label)).join(",");
  const rows = records.map((record) =>
    columns.map((column) => csvEscape(column.value(record))).join(","),
  );
  return `${[header, ...rows].join("\n")}\n`;
};

const withFileMeta = (file) => ({
  ...file,
  size: Buffer.byteLength(file.content, "utf8"),
  sha256: sha256(file.content),
});

const buildArchiveFiles = ({
  month,
  startDate,
  endDate,
  retentionMonths,
  salesRecords,
  expenseRecords,
  monthSummary,
}) => {
  const [year, monthNumber] = month.split("-");
  const basePath = `${ARCHIVE_ROOT}/${year}/${monthNumber}`;

  const files = [
    withFileMeta({
      key: "salesJsonl",
      path: `${basePath}/sales.jsonl`,
      content: recordsToJsonl(salesRecords),
      contentType: "application/x-ndjson; charset=utf-8",
    }),
    withFileMeta({
      key: "salesCsv",
      path: `${basePath}/sales.csv`,
      content: recordsToCsv(salesRecords, [
        { label: "id", value: (record) => record.id },
        { label: "date", value: (record) => record.date },
        { label: "time", value: (record) => record.time },
        { label: "table", value: (record) => record.table },
        { label: "type", value: (record) => record.type },
        { label: "paymentMethod", value: (record) => record.paymentMethod },
        { label: "total", value: (record) => record.total },
        { label: "itemCount", value: (record) => record.itemCount },
        { label: "isRefunded", value: (record) => Boolean(record.isRefunded) },
        { label: "refundDate", value: (record) => record.refundDate },
        { label: "refundTime", value: (record) => record.refundTime },
        { label: "itemsJson", value: (record) => record.items || [] },
      ]),
      contentType: "text/csv; charset=utf-8",
    }),
    withFileMeta({
      key: "expensesJsonl",
      path: `${basePath}/expenses.jsonl`,
      content: recordsToJsonl(expenseRecords),
      contentType: "application/x-ndjson; charset=utf-8",
    }),
    withFileMeta({
      key: "expensesCsv",
      path: `${basePath}/expenses.csv`,
      content: recordsToCsv(expenseRecords, [
        { label: "id", value: (record) => record.id },
        { label: "date", value: (record) => record.date },
        { label: "name", value: (record) => record.name },
        { label: "vendor", value: (record) => record.vendor },
        { label: "amount", value: (record) => record.amount },
        { label: "createdAt", value: (record) => record.createdAt },
        { label: "updatedAt", value: (record) => record.updatedAt },
      ]),
      contentType: "text/csv; charset=utf-8",
    }),
  ];

  const manifest = {
    month,
    startDate,
    endDate,
    retentionMonths,
    generatedAt: new Date().toISOString(),
    salesRecordCount: salesRecords.length,
    expenseRecordCount: expenseRecords.length,
    incomeTotal: monthSummary.incomeTotal,
    expenseTotal: monthSummary.expenseTotal,
    netTotal: monthSummary.netTotal,
    files: files.map(({ key, path, size, sha256 }) => ({
      key,
      path,
      size,
      sha256,
    })),
  };

  files.push(withFileMeta({
    key: "manifest",
    path: `${basePath}/manifest.json`,
    content: `${JSON.stringify(manifest, null, 2)}\n`,
    contentType: "application/json; charset=utf-8",
  }));

  return files;
};

const validateArchive = ({ salesRecords, expenseRecords, monthSummary, files }) => {
  const incomeTotal = salesRecords
    .filter((record) => !record.isRefunded)
    .reduce((sum, record) => sum + toNumber(record.total), 0);
  const expenseTotal = expenseRecords.reduce(
    (sum, record) => sum + toNumber(record.amount),
    0,
  );

  const checks = {
    salesCountMatches:
      files.some((file) => file.key === "salesJsonl") &&
      salesRecords.length === monthSummary.salesRecordCount,
    expenseCountMatches:
      files.some((file) => file.key === "expensesJsonl") &&
      expenseRecords.length === monthSummary.expenseRecordCount,
    incomeTotalMatches: incomeTotal === monthSummary.incomeTotal,
    expenseTotalMatches: expenseTotal === monthSummary.expenseTotal,
  };

  return {
    checks,
    ok: Object.values(checks).every(Boolean),
  };
};

module.exports = {
  buildArchiveFiles,
  validateArchive,
};
