const toNumber = (value) => Number(value) || 0;

const createEmptyDailySummary = (date) => ({
  date,
  incomeTotal: 0,
  expenseTotal: 0,
  netTotal: 0,
  orderCount: 0,
  itemCount: 0,
  paymentTotals: {},
  refundTotal: 0,
  refundCount: 0,
  expenseVendorTotals: {},
  expenseMaterialTotals: {},
  salesRecordCount: 0,
  expenseRecordCount: 0,
});

const addAmount = (target, key, amount) => {
  const safeKey = key || "unknown";
  target[safeKey] = toNumber(target[safeKey]) + amount;
};

const buildSummaries = ({ month, startDate, endDate, salesRecords, expenseRecords }) => {
  const dailyMap = {};
  const monthSummary = {
    month,
    startDate,
    endDate,
    incomeTotal: 0,
    expenseTotal: 0,
    netTotal: 0,
    orderCount: 0,
    itemCount: 0,
    paymentTotals: {},
    refundTotal: 0,
    refundCount: 0,
    expenseVendorTotals: {},
    expenseMaterialTotals: {},
    salesRecordCount: salesRecords.length,
    expenseRecordCount: expenseRecords.length,
  };

  const getDaily = (date) => {
    if (!dailyMap[date]) {
      dailyMap[date] = createEmptyDailySummary(date);
    }
    return dailyMap[date];
  };

  salesRecords.forEach((record) => {
    const daily = getDaily(record.date || startDate);
    const total = toNumber(record.total);

    daily.salesRecordCount += 1;

    if (record.isRefunded) {
      daily.refundCount += 1;
      daily.refundTotal += total;
      monthSummary.refundCount += 1;
      monthSummary.refundTotal += total;
      return;
    }

    const itemCount = toNumber(record.itemCount);
    const paymentMethod = record.paymentMethod || "unknown";

    daily.incomeTotal += total;
    daily.orderCount += 1;
    daily.itemCount += itemCount;
    addAmount(daily.paymentTotals, paymentMethod, total);

    monthSummary.incomeTotal += total;
    monthSummary.orderCount += 1;
    monthSummary.itemCount += itemCount;
    addAmount(monthSummary.paymentTotals, paymentMethod, total);
  });

  expenseRecords.forEach((record) => {
    const daily = getDaily(record.date || startDate);
    const amount = toNumber(record.amount);

    daily.expenseRecordCount += 1;
    daily.expenseTotal += amount;
    addAmount(daily.expenseVendorTotals, record.vendor, amount);
    addAmount(daily.expenseMaterialTotals, record.name, amount);

    monthSummary.expenseTotal += amount;
    addAmount(monthSummary.expenseVendorTotals, record.vendor, amount);
    addAmount(monthSummary.expenseMaterialTotals, record.name, amount);
  });

  Object.values(dailyMap).forEach((summary) => {
    summary.netTotal = summary.incomeTotal - summary.expenseTotal;
  });
  monthSummary.netTotal = monthSummary.incomeTotal - monthSummary.expenseTotal;

  return {
    dailySummaries: Object.values(dailyMap).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    monthSummary,
  };
};

module.exports = {
  toNumber,
  buildSummaries,
};

