const DEFAULT_RETENTION_MONTHS = 18;

const pad2 = (value) => String(value).padStart(2, "0");

const parseMonth = (month) => {
  if (!/^\d{4}-\d{2}$/.test(month || "")) {
    throw new Error("month must use YYYY-MM format");
  }

  const [year, monthNumber] = month.split("-").map(Number);
  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error("month must be between 01 and 12");
  }

  return { year, monthNumber };
};

const formatDate = (date) =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;

const formatMonth = (date) =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;

const addMonths = (date, months) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));

const getMonthRange = (month) => {
  const { year, monthNumber } = parseMonth(month);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 0));

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
};

const getLatestEligibleMonth = (retentionMonths, referenceDate = new Date()) => {
  const currentMonthStart = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
  );
  const cutoffMonthStart = addMonths(currentMonthStart, -retentionMonths);
  return formatMonth(addMonths(cutoffMonthStart, -1));
};

const isEligibleMonth = (month, retentionMonths) =>
  month <= getLatestEligibleMonth(retentionMonths);

const listMonths = (startMonth, endMonth) => {
  const { year, monthNumber } = parseMonth(startMonth);
  const months = [];
  let cursor = new Date(Date.UTC(year, monthNumber - 1, 1));

  while (formatMonth(cursor) <= endMonth) {
    months.push(formatMonth(cursor));
    cursor = addMonths(cursor, 1);
  }

  return months;
};

module.exports = {
  DEFAULT_RETENTION_MONTHS,
  parseMonth,
  getMonthRange,
  getLatestEligibleMonth,
  isEligibleMonth,
  listMonths,
};

