/**
 * historyUtils.js
 *
 * 原始程式碼：定義在 HistoryPage.js 的純計算函數
 * 功能效果：日期範圍計算、銷售資料統計分析
 * 用途：供 useHistoryData hook 與 HistoryPage 子元件使用
 */

// 計算某日期所在週的週一到週日範圍
export const getWeekRange = (dateStr) => {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(date);
  monday.setDate(date.getDate() - daysFromMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  const end = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;

  return { start, end };
};

// 計算某日期所在月的第一天到最後一天範圍
export const getMonthRange = (dateStr) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { start, end };
};

// 根據檢視模式產生日期範圍顯示文字
export const getDateRangeText = (viewMode, selectedDate) => {
  if (viewMode === "daily") return selectedDate;
  if (viewMode === "weekly") {
    const { start, end } = getWeekRange(selectedDate);
    return `${start} ~ ${end}`;
  }
  if (viewMode === "monthly") {
    const date = new Date(selectedDate);
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  }
  return selectedDate;
};

// 將銷售記錄按日期分組統計（週/月檢視用）
export const getDailyBreakdown = (records) => {
  const dailyStats = {};

  records
    .filter((record) => !record.isRefunded)
    .forEach((record) => {
      const date = record.date;
      if (!dailyStats[date]) {
        dailyStats[date] = { date, orderCount: 0, itemCount: 0, revenue: 0, records: [] };
      }
      dailyStats[date].orderCount += 1;
      dailyStats[date].itemCount += record.itemCount;
      dailyStats[date].revenue += record.total;
      dailyStats[date].records.push(record);
    });

  return Object.values(dailyStats).sort((a, b) => b.date.localeCompare(a.date));
};

// 將訂單記錄按 groupId 分組（同桌分開結帳歸為一組）
export const groupRecordsByTable = (records) => {
  const groups = {};

  records.forEach((record) => {
    const groupKey = record.groupId || record.id;

    if (!groups[groupKey]) {
      groups[groupKey] = {
        groupId: groupKey,
        table: record.table,
        type: record.type,
        records: [],
        totalAmount: 0,
        totalItems: 0,
        paymentMethods: {},
        isGrouped: false,
        hasRefunded: false,
      };
    }

    groups[groupKey].records.push(record);

    if (!record.isRefunded) {
      groups[groupKey].totalAmount += record.total;
      groups[groupKey].totalItems += record.itemCount;
      const method = record.paymentMethod;
      groups[groupKey].paymentMethods[method] =
        (groups[groupKey].paymentMethods[method] || 0) + record.total;
    } else {
      groups[groupKey].hasRefunded = true;
    }
  });

  Object.values(groups).forEach((group) => {
    if (group.records.length > 1) group.isGrouped = true;
  });

  return Object.values(groups).sort((a, b) => {
    const latestA = Math.max(...a.records.map((r) => r.timestamp));
    const latestB = Math.max(...b.records.map((r) => r.timestamp));
    return latestB - latestA;
  });
};

// 計算一組訂單的用餐時段（最早到最晚）
export const calculateDiningTime = (records) => {
  if (records.length === 0) return "未知";
  const times = records.map((r) => r.time).sort();
  const earliest = times[0];
  const latest = times[times.length - 1];
  return earliest === latest ? earliest : `${earliest} - ${latest}`;
};

// 統計熱門商品 TOP 5
export const getPopularItems = (records) => {
  const itemStats = {};

  records
    .filter((record) => !record.isRefunded)
    .forEach((record) => {
      record.items.forEach((item) => {
        if (itemStats[item.name]) {
          itemStats[item.name].quantity += item.quantity;
          itemStats[item.name].revenue += item.subtotal;
        } else {
          itemStats[item.name] = {
            name: item.name,
            quantity: item.quantity,
            revenue: item.subtotal,
            price: item.price,
          };
        }
      });
    });

  return Object.values(itemStats)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
};
