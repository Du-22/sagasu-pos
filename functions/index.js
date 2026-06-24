const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const createCsvWriter = require("csv-writer").createArrayCsvWriter;

// 初始化 Firebase Admin
initializeApp();
const db = getFirestore();
const {
  archiveFinancialMonth,
  monthlyFinancialArchive,
} = require("./financialArchive");

exports.archiveFinancialMonth = archiveFinancialMonth;
exports.monthlyFinancialArchive = monthlyFinancialArchive;

console.log("📧 SAGASU POS Functions 已載入");

// ==================== 統計分析函數 ====================

/**
 * 生成報表統計資料
 * @param {Array} salesData - 銷售資料陣列
 * @param {string} startDate - 開始日期 (YYYY-MM-DD)
 * @param {string} endDate - 結束日期 (YYYY-MM-DD)
 * @returns {Object} 統計資料物件
 */
function generateReportStatistics(salesData, startDate, endDate) {
  console.log(`開始生成統計資料，期間：${startDate} ~ ${endDate}`);

  // 過濾日期範圍內的資料，排除退款項目
  const filteredData = salesData.filter((record) => {
    const recordDate = record.date;
    return (
      recordDate >= startDate && recordDate <= endDate && !record.isRefunded
    );
  });

  // 過濾退款資料
  const refundedData = salesData.filter((record) => {
    const recordDate = record.date;
    return (
      recordDate >= startDate && recordDate <= endDate && record.isRefunded
    );
  });

  console.log(
    `篩選結果：有效訂單 ${filteredData.length} 筆，退款訂單 ${refundedData.length} 筆`
  );

  // 1. 營業摘要統計
  const summary = generateBasicSummary(filteredData);

  // 2. 退款統計
  const refundStats = generateRefundStatistics(refundedData);

  // 3. 熱門商品統計 TOP 5
  const popularItems = generatePopularItemsStats(filteredData);

  // 4. 付款方式統計
  const paymentStats = generatePaymentMethodStats(filteredData);

  // 5. 內用 vs 外帶統計
  const typeStats = generateOrderTypeStats(filteredData);

  // 計算退款率（現在有總訂單數了）
  const totalOrdersIncludingRefunds = filteredData.length + refundedData.length;
  if (totalOrdersIncludingRefunds > 0) {
    refundStats.refundRate =
      Math.round(
        (refundedData.length / totalOrdersIncludingRefunds) * 100 * 10
      ) / 10;
  }

  const result = {
    period: {
      startDate,
      endDate,
      totalDays: calculateDaysBetween(startDate, endDate),
    },
    summary,
    refund: refundStats,
    popularItems: popularItems,
    payment: paymentStats,
    orderType: typeStats,
    generatedAt: new Date().toISOString(),
    dataCount: filteredData.length,
    totalOrdersIncludingRefunds: totalOrdersIncludingRefunds,
  };

  console.log("統計資料生成完成:", {
    period: result.period,
    totalOrders: result.summary.totalOrders,
    totalRevenue: result.summary.totalRevenue,
    topItem: result.popularItems.topItems[0]?.name || "N/A",
    refundRate: result.refund.refundRate + "%",
  });

  return result;
}

/**
 * 生成熱門商品統計 TOP 5
 */
function generatePopularItemsStats(salesData) {
  const itemStats = {};

  // 統計每個商品的銷售數據
  salesData.forEach((record) => {
    if (record.items && Array.isArray(record.items)) {
      record.items.forEach((item) => {
        const itemName = item.name;
        if (!itemName) return;

        // 初始化商品統計
        if (!itemStats[itemName]) {
          itemStats[itemName] = {
            name: itemName,
            totalQuantity: 0,
            totalRevenue: 0,
            orderCount: 0,
            averagePrice: 0,
            percentageOfTotal: 0,
          };
        }

        // 累計數據
        itemStats[itemName].totalQuantity += item.quantity || 0;
        itemStats[itemName].totalRevenue += item.subtotal || 0;
        itemStats[itemName].orderCount += 1;
      });
    }
  });

  // 計算總銷售數據（用於百分比計算）
  const totalQuantity = Object.values(itemStats).reduce(
    (sum, item) => sum + item.totalQuantity,
    0
  );
  const totalRevenue = Object.values(itemStats).reduce(
    (sum, item) => sum + item.totalRevenue,
    0
  );

  // 計算平均價格和百分比
  Object.values(itemStats).forEach((item) => {
    if (item.totalQuantity > 0) {
      item.averagePrice = Math.round(item.totalRevenue / item.totalQuantity);
    }
    if (totalQuantity > 0) {
      item.percentageOfTotal =
        Math.round((item.totalQuantity / totalQuantity) * 100 * 10) / 10; // 保留一位小數
    }
  });

  // 排序並取 TOP 5（按銷售數量）
  const sortedItems = Object.values(itemStats)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 5);

  const result = {
    topItems: sortedItems,
    totalUniqueItems: Object.keys(itemStats).length,
    totalItemsSold: totalQuantity,
    totalItemRevenue: totalRevenue,
  };

  console.log("熱門商品統計:", {
    totalUniqueItems: result.totalUniqueItems,
    totalItemsSold: result.totalItemsSold,
    topItem: sortedItems[0]?.name || "N/A",
  });

  return result;
}

/**
 * 生成付款方式統計
 */
function generatePaymentMethodStats(salesData) {
  const paymentStats = {
    cash: { count: 0, amount: 0, percentage: 0 },
    linepay: { count: 0, amount: 0, percentage: 0 },
    total: { count: 0, amount: 0 },
  };

  // 統計付款方式數據
  salesData.forEach((record) => {
    const method = record.paymentMethod === "cash" ? "cash" : "linepay";
    const amount = record.total || 0;

    paymentStats[method].count += 1;
    paymentStats[method].amount += amount;
    paymentStats.total.count += 1;
    paymentStats.total.amount += amount;
  });

  // 計算百分比
  if (paymentStats.total.amount > 0) {
    paymentStats.cash.percentage =
      Math.round(
        (paymentStats.cash.amount / paymentStats.total.amount) * 100 * 10
      ) / 10;
    paymentStats.linepay.percentage =
      Math.round(
        (paymentStats.linepay.amount / paymentStats.total.amount) * 100 * 10
      ) / 10;
  }

  console.log("付款方式統計:", paymentStats);
  return paymentStats;
}

/**
 * 生成內用 vs 外帶統計
 */
function generateOrderTypeStats(salesData) {
  const typeStats = {
    dineIn: { count: 0, amount: 0, percentage: 0, items: 0 },
    takeout: { count: 0, amount: 0, percentage: 0, items: 0 },
    total: { count: 0, amount: 0, items: 0 },
  };

  // 統計訂單類型數據
  salesData.forEach((record) => {
    const isTableOrder =
      record.type === "table" || !record.table?.startsWith("T");
    const type = isTableOrder ? "dineIn" : "takeout";
    const amount = record.total || 0;
    const itemCount = record.itemCount || 0;

    typeStats[type].count += 1;
    typeStats[type].amount += amount;
    typeStats[type].items += itemCount;

    typeStats.total.count += 1;
    typeStats.total.amount += amount;
    typeStats.total.items += itemCount;
  });

  // 計算百分比
  if (typeStats.total.amount > 0) {
    typeStats.dineIn.percentage =
      Math.round(
        (typeStats.dineIn.amount / typeStats.total.amount) * 100 * 10
      ) / 10;
    typeStats.takeout.percentage =
      Math.round(
        (typeStats.takeout.amount / typeStats.total.amount) * 100 * 10
      ) / 10;
  }

  // 計算平均客單價
  if (typeStats.dineIn.count > 0) {
    typeStats.dineIn.averageOrderValue = Math.round(
      typeStats.dineIn.amount / typeStats.dineIn.count
    );
  }
  if (typeStats.takeout.count > 0) {
    typeStats.takeout.averageOrderValue = Math.round(
      typeStats.takeout.amount / typeStats.takeout.count
    );
  }

  console.log("訂單類型統計:", typeStats);
  return typeStats;
}

/**
 * 生成基礎營業摘要統計
 */
function generateBasicSummary(salesData) {
  const summary = {
    totalOrders: salesData.length,
    totalRevenue: 0,
    totalItems: 0,
    averageOrderValue: 0,
    averageItemsPerOrder: 0,
    dailyAverage: 0,
  };

  // 計算總營業額和總商品數
  salesData.forEach((record) => {
    summary.totalRevenue += record.total || 0;
    summary.totalItems += record.itemCount || 0;
  });

  // 計算平均值
  if (summary.totalOrders > 0) {
    summary.averageOrderValue = Math.round(
      summary.totalRevenue / summary.totalOrders
    );
    summary.averageItemsPerOrder =
      Math.round((summary.totalItems / summary.totalOrders) * 10) / 10; // 保留一位小數
  }

  console.log("營業摘要統計:", summary);
  return summary;
}

/**
 * 生成退款統計
 */
function generateRefundStatistics(refundedData) {
  const refundStats = {
    totalRefunds: refundedData.length,
    totalRefundAmount: 0,
    refundRate: 0, // 暫時設為0，需要總訂單數來計算
    refundsByDate: {},
    refundsByPaymentMethod: {
      cash: { count: 0, amount: 0 },
      linepay: { count: 0, amount: 0 },
    },
  };

  // 計算退款總額和分析
  refundedData.forEach((record) => {
    const amount = record.total || 0;
    refundStats.totalRefundAmount += amount;

    // 按日期統計
    const date = record.refundDate || record.date;
    if (!refundStats.refundsByDate[date]) {
      refundStats.refundsByDate[date] = { count: 0, amount: 0 };
    }
    refundStats.refundsByDate[date].count += 1;
    refundStats.refundsByDate[date].amount += amount;

    // 按付款方式統計
    const paymentMethod = record.paymentMethod || "cash";
    const method = paymentMethod === "cash" ? "cash" : "linepay";
    refundStats.refundsByPaymentMethod[method].count += 1;
    refundStats.refundsByPaymentMethod[method].amount += amount;
  });

  console.log("退款統計:", refundStats);
  return refundStats;
}

/**
 * 計算兩個日期之間的天數
 */
function calculateDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 包含結束日
  return diffDays;
}

// ==================== CSV 相關函數 ====================

// CSV 轉換函數
function convertSalesDataToCSV(salesData) {
  if (!salesData || salesData.length === 0) {
    return [];
  }

  // CSV 標題行
  const headers = [
    "日期",
    "時間",
    "桌號",
    "類型",
    "商品名稱",
    "數量",
    "單價",
    "小計",
    "付款方式",
    "客製選項",
  ];

  // 轉換數據
  const csvData = [headers]; // 第一行是標題

  salesData.forEach((record) => {
    // 基本訂單資訊
    const baseInfo = {
      date: record.date || "",
      time: record.time || "",
      table: record.type === "takeout" ? `外帶 ${record.table}` : record.table,
      type: record.type === "takeout" ? "外帶" : "內用",
      paymentMethod: record.paymentMethod === "cash" ? "現金" : "Line Pay",
    };

    // 處理每個商品
    if (record.items && record.items.length > 0) {
      record.items.forEach((item) => {
        // 處理客製選項
        let customOptions = "";
        if (item.selectedCustom) {
          const customs = Object.entries(item.selectedCustom)
            .map(([key, value]) => `${key}:${value}`)
            .join("; ");
          customOptions = customs;
        }

        // 加入這一行數據
        csvData.push([
          baseInfo.date,
          baseInfo.time,
          baseInfo.table,
          baseInfo.type,
          item.name || "",
          item.quantity || 0,
          item.price || 0,
          item.subtotal || 0,
          baseInfo.paymentMethod,
          customOptions,
        ]);
      });
    } else {
      // 如果沒有商品明細，至少記錄基本資訊
      csvData.push([
        baseInfo.date,
        baseInfo.time,
        baseInfo.table,
        baseInfo.type,
        "無商品明細",
        0,
        0,
        record.total || 0,
        baseInfo.paymentMethod,
        "",
      ]);
    }
  });

  return csvData;
}

// ==================== Email 相關函數 ====================

// Email 設定
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "du88215@gmail.com",
      pass: "fnyb cbrd thrj jnqm",
    },
  });
};

// ==================== Firebase Functions ====================

// 發送 CSV 報表的 Function
exports.sendCSVReport = onCall(async (request) => {
  try {
    const { reportType, recipientEmail, startDate, endDate } = request.data;

    console.log(`開始發送報表: ${reportType}`);
    console.log(`收件人: ${recipientEmail}`);
    console.log(`日期範圍: ${startDate} ~ ${endDate}`);

    // 1. 取得並篩選資料
    const salesRef = db.collection("stores/default_store/sales");
    const snapshot = await salesRef.orderBy("timestamp", "desc").get();

    let salesData = [];
    snapshot.forEach((doc) => {
      salesData.push({ id: doc.id, ...doc.data() });
    });

    // 日期篩選
    if (startDate && endDate) {
      salesData = salesData.filter((record) => {
        const recordDate = record.date;
        return recordDate >= startDate && recordDate <= endDate;
      });
    }

    // 2. 生成統計資料
    let statistics = null;
    if (salesData.length > 0) {
      const actualStartDate =
        startDate || salesData[salesData.length - 1]?.date;
      const actualEndDate = endDate || salesData[0]?.date;
      statistics = generateReportStatistics(
        salesData,
        actualStartDate,
        actualEndDate
      );
    }

    // 3. 轉換為 CSV
    const csvData = convertSalesDataToCSV(salesData);
    const csvContent = csvData.map((row) => row.join(",")).join("\n");

    // 4. 發送郵件
    const transporter = createEmailTransporter();
    const emailContent = generateEmailContent(
      reportType,
      salesData,
      statistics,
      startDate,
      endDate
    );

    const mailOptions = {
      from: "sagasucoffee@gmail.com",
      to: recipientEmail,
      subject: `SAGASU 咖啡廳 - ${reportType} (${startDate} ~ ${endDate})`,
      html: emailContent,
      attachments: [
        {
          filename: `SAGASU_${reportType.replace(
            /\s+/g,
            "_"
          )}_${startDate}_to_${endDate}.csv`,
          content: csvContent,
          contentType: "text/csv; charset=utf-8",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: `${reportType} 已成功寄送到 ${recipientEmail}`,
      messageId: info.messageId,
      period: { startDate, endDate },
      dataInfo: {
        totalRecords: salesData.length,
        csvRows: csvData.length,
      },
    };
  } catch (error) {
    console.error("發送郵件失敗:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * 生成郵件內容（包含統計資料）
 */
function generateEmailContent(
  reportType,
  salesData,
  statistics,
  startDate,
  endDate
) {
  const period = `${startDate} ~ ${endDate}`;

  // 統計資料 HTML（和之前一樣，這裡省略詳細內容）
  let statisticsHtml = "";
  if (statistics) {
    // 熱門商品 HTML
    const topItemsHtml = statistics.popularItems.topItems
      .slice(0, 5)
      .map(
        (item, index) =>
          `<tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${
          item.totalQuantity
        }</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${
          item.totalRevenue
        }</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${
          item.percentageOfTotal
        }%</td>
      </tr>`
      )
      .join("");
    statisticsHtml = `<div style="margin: 30px 0;">
      <h3 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">📊 營業統計分析</h3>
      
      <!-- 營業摘要 -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #1e40af;">💰 營業摘要</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
          <div>
            <p><strong>總訂單數：</strong> ${
              statistics.summary.totalOrders
            } 筆</p>
            <p><strong>總營業額：</strong> $${
              statistics.summary.totalRevenue
            }</p>
            <p><strong>總商品數：</strong> ${
              statistics.summary.totalItems
            } 件</p>
          </div>
          <div>
            <p><strong>平均客單價：</strong> $${
              statistics.summary.averageOrderValue
            }</p>
            <p><strong>平均每單商品數：</strong> ${
              statistics.summary.averageItemsPerOrder
            } 件</p>
            <p><strong>統計期間：</strong> ${statistics.period.totalDays} 天</p>
          </div>
        </div>
      </div>

      <!-- 熱門商品 -->
      <div style="margin: 20px 0;">
        <h4 style="color: #1e40af;">🏆 熱門商品 TOP 5</h4>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <thead>
            <tr style="background: #e5e7eb;">
              <th style="padding: 8px; border: 1px solid #ddd;">排名</th>
              <th style="padding: 8px; border: 1px solid #ddd;">商品名稱</th>
              <th style="padding: 8px; border: 1px solid #ddd;">銷售數量</th>
              <th style="padding: 8px; border: 1px solid #ddd;">營業額</th>
              <th style="padding: 8px; border: 1px solid #ddd;">佔比</th>
            </tr>
          </thead>
          <tbody>
            ${topItemsHtml}
          </tbody>
        </table>
      </div>

      <!-- 付款方式統計 -->
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #15803d;">💳 付款方式統計</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
          <div>
            <p><strong>現金：</strong> ${statistics.payment.cash.count} 筆 ($${
      statistics.payment.cash.amount
    }) - ${statistics.payment.cash.percentage}%</p>
          </div>
          <div>
            <p><strong>Line Pay：</strong> ${
              statistics.payment.linepay.count
            } 筆 ($${statistics.payment.linepay.amount}) - ${
      statistics.payment.linepay.percentage
    }%</p>
          </div>
        </div>
      </div>

      <!-- 內用外帶統計 -->
      <div style="background: #fef7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #7c2d12;">🏠 內用 vs 外帶統計</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
          <div>
            <p><strong>內用：</strong> ${
              statistics.orderType.dineIn.count
            } 筆</p>
            <p><strong>內用營業額：</strong> $${
              statistics.orderType.dineIn.amount
            } (${statistics.orderType.dineIn.percentage}%)</p>
          </div>
          <div>
            <p><strong>外帶：</strong> ${
              statistics.orderType.takeout.count
            } 筆</p>
            <p><strong>外帶營業額：</strong> $${
              statistics.orderType.takeout.amount
            } (${statistics.orderType.takeout.percentage}%)</p>
          </div>
        </div>
      </div>

      ${
        statistics.refund.totalRefunds > 0
          ? `
      <!-- 退款統計 -->
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <h4 style="margin-top: 0; color: #dc2626;">❌ 退款統計</h4>
        <p><strong>退款筆數：</strong> ${statistics.refund.totalRefunds} 筆</p>
        <p><strong>退款金額：</strong> $${statistics.refund.totalRefundAmount}</p>
        <p><strong>退款率：</strong> ${statistics.refund.refundRate}%</p>
      </div>
      `
          : ""
      }
    </div>`;
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">☕ SAGASU 咖啡廳</h1>
        <h2 style="margin: 10px 0 0 0; font-weight: normal; opacity: 0.9;">${reportType}</h2>
      </div>
      
      <div style="padding: 30px; background: white; border: 1px solid #e5e7eb;">
        <p style="font-size: 16px; margin-bottom: 20px;">親愛的店長您好，</p>
        <p>附件為您的 <strong>${reportType}</strong> (${period})，請查收。</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">📋 報表摘要</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>統計期間：</strong> ${period}</li>
            <li><strong>資料筆數：</strong> ${salesData.length} 筆訂單</li>
            <li><strong>生成時間：</strong> ${new Date().toLocaleString(
              "zh-TW",
              { timeZone: "Asia/Taipei" }
            )}</li>
          </ul>
        </div>

        ${statisticsHtml}
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p>如有任何問題，請聯繫系統管理員。</p>
          <p>祝營業順利！</p>
        </div>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px; color: #6b7280;">此郵件由 SAGASU POS 系統自動發送</p>
      </div>
    </div>
  `;
}

// ==================== 自動排程報表功能 ====================

/**
 * 每週日晚上 19:00 自動發送週報
 * Firebase Functions 使用 UTC 時間，台灣時間 19:00 = UTC 11:00
 */
exports.weeklyReport = onSchedule("0 11 * * 0", async () => {
  try {
    console.log("開始執行週報自動發送...");

    // 獲取當前時間
    const now = new Date();

    // 計算本週一（今天往前推 6 天）
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - 6);
    thisMonday.setHours(0, 0, 0, 0);

    // 計算本週日（今天）
    const thisSunday = new Date(now);
    thisSunday.setHours(23, 59, 59, 999);

    const startDate = thisMonday.toISOString().split("T")[0];
    const endDate = thisSunday.toISOString().split("T")[0];

    console.log(`週報期間: ${startDate} ~ ${endDate}`);
    console.log(
      `執行期間: ${now.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`
    );

    // 設定收件人清單（可以從環境變數或固定設定讀取）

    const recipients = ["sagasucoffee@gmail.com", "du88215@gmail.com"];

    // 對每個收件人發送週報
    const sendPromises = recipients.map((email) =>
      sendAutomaticReport("週報", email, startDate, endDate)
    );

    const results = await Promise.all(sendPromises);

    const successCount = results.filter((result) => result.success).length;
    const failCount = results.length - successCount;

    console.log(`週報發送完成: 成功 ${successCount} 筆, 失敗 ${failCount} 筆`);

    return {
      success: true,
      message: `週報自動發送完成 (${startDate} ~ ${endDate})`,
      sent: successCount,
      failed: failCount,
      executionTime: now.toISOString(),
      period: { startDate, endDate },
    };
  } catch (error) {
    console.error("週報自動發送失敗:", error);
    return { success: false, error: error.message };
  }
});

/**
 * 每月最後一天晚上 19:00 自動發送月報
 * 使用 cron 表達式：0 11 28-31 * * (UTC 11:00 = 台灣 19:00)
 */
exports.monthlyReport = onSchedule("0 11 28-31 * *", async () => {
  try {
    console.log("開始執行月報自動發送...");

    // 檢查是否為月底最後一天
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    // 如果明天是下個月的第一天，才執行月報發送
    if (now.getMonth() !== tomorrow.getMonth()) {
      console.log("確認今天是月底，執行月報發送");

      // 計算上個月的日期範圍
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1); // 本月第一天
      const thisMonthEnd = new Date(now); // 本月最後一天（今天）

      const startDate = thisMonthStart.toISOString().split("T")[0];
      const endDate = thisMonthEnd.toISOString().split("T")[0];

      console.log(`月報期間: ${startDate} ~ ${endDate}`);
      console.log(
        `執行期間: ${now.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`
      );

      // 設定收件人清單

      const recipients = ["sagasucoffee@gmail.com", "du88215@gmail.com"];

      // 對每個收件人發送月報
      const sendPromises = recipients.map((email) =>
        sendAutomaticReport("月報", email, startDate, endDate)
      );

      const results = await Promise.all(sendPromises);

      const successCount = results.filter((result) => result.success).length;
      const failCount = results.length - successCount;

      console.log(
        `月報發送完成: 成功 ${successCount} 筆, 失敗 ${failCount} 筆`
      );

      return {
        success: true,
        message: `月報自動發送完成 (${startDate} ~ ${endDate})`,
        sent: successCount,
        failed: failCount,
        executionTime: now.toISOString(),
        period: { startDate, endDate },
      };
    } else {
      console.log("今天不是月底最後一天，跳過月報發送");
      return { success: false, message: "不是月底最後一天，跳過執行" };
    }
  } catch (error) {
    console.error("月報自動發送失敗:", error);
    return { success: false, error: error.message };
  }
});

/**
 * 自動報表發送的核心函數
 */
async function sendAutomaticReport(
  reportType,
  recipientEmail,
  startDate,
  endDate
) {
  try {
    console.log(`發送自動${reportType}到 ${recipientEmail}`);

    // 取得並篩選資料
    const salesRef = db.collection("stores/default_store/sales");
    const snapshot = await salesRef.orderBy("timestamp", "desc").get();

    let salesData = [];
    snapshot.forEach((doc) => {
      salesData.push({ id: doc.id, ...doc.data() });
    });

    // 日期篩選
    salesData = salesData.filter((record) => {
      const recordDate = record.date;
      return recordDate >= startDate && recordDate <= endDate;
    });

    console.log(`${reportType}篩選後資料筆數: ${salesData.length}`);

    // 生成統計資料
    let statistics = null;
    if (salesData.length > 0) {
      statistics = generateReportStatistics(salesData, startDate, endDate);
    }

    // 轉換為 CSV
    const csvData = convertSalesDataToCSV(salesData);
    const csvContent = csvData.map((row) => row.join(",")).join("\n");

    // 生成自動報表郵件內容
    const emailContent = generateAutomaticReportEmail(
      reportType,
      salesData,
      statistics,
      startDate,
      endDate
    );

    // 發送郵件
    const transporter = createEmailTransporter();
    const mailOptions = {
      from: "sagasucoffee@gmail.com",
      to: recipientEmail,
      subject: `🤖 SAGASU 咖啡廳 - 自動${reportType} (${startDate} ~ ${endDate})`,
      html: emailContent,
      attachments: [
        {
          filename: `SAGASU_自動${reportType}_${startDate}_to_${endDate}.csv`,
          content: csvContent,
          contentType: "text/csv; charset=utf-8",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`自動${reportType}發送成功:`, info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      recipient: recipientEmail,
      dataCount: salesData.length,
    };
  } catch (error) {
    console.error(`自動${reportType}發送失敗:`, error);
    return {
      success: false,
      error: error.message,
      recipient: recipientEmail,
    };
  }
}

/**
 * 生成自動報表專用的郵件內容
 */
function generateAutomaticReportEmail(
  reportType,
  salesData,
  statistics,
  startDate,
  endDate
) {
  // 基本資訊
  const period = `${startDate} ~ ${endDate}`;
  const currentTime = new Date().toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
  });

  // 統計摘要（簡化版）
  let summaryHtml = "";
  if (statistics && salesData.length > 0) {
    const topItem = statistics.popularItems.topItems[0];
    summaryHtml = `
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #374151;">📊 ${reportType}摘要</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
          <div>
            <p><strong>📈 總訂單數：</strong> ${
              statistics.summary.totalOrders
            } 筆</p>
            <p><strong>💰 總營業額：</strong> $${
              statistics.summary.totalRevenue
            }</p>
            <p><strong>🏆 熱門商品：</strong> ${
              topItem ? topItem.name : "N/A"
            }</p>
          </div>
          <div>
            <p><strong>💳 主要付款：</strong> ${
              statistics.payment.cash.amount > statistics.payment.linepay.amount
                ? "現金"
                : "Line Pay"
            }</p>
            <p><strong>🍽️ 內用佔比：</strong> ${
              statistics.orderType.dineIn.percentage
            }%</p>
            <p><strong>❌ 退款率：</strong> ${statistics.refund.refundRate}%</p>
          </div>
        </div>
      </div>
    `;
  } else {
    summaryHtml = `
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0;"><strong>⚠️ 注意：</strong> 此期間內沒有銷售資料。</p>
      </div>
    `;
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">🤖 自動${reportType}</h1>
        <h2 style="margin: 10px 0 0 0; font-weight: normal; opacity: 0.9;">SAGASU 咖啡廳</h2>
      </div>
      
      <div style="padding: 30px; background: white; border: 1px solid #e5e7eb;">
        <p style="font-size: 16px; margin-bottom: 20px;">店長您好，</p>
        
        <p>這是系統自動生成的 <strong>${reportType}</strong> (${period})，請查收。</p>
        
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin-top: 0; color: #065f46;">🤖 自動報表說明</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>自動發送時間：</strong> ${currentTime}</li>
            <li><strong>統計期間：</strong> ${period}</li>
            <li><strong>資料筆數：</strong> ${salesData.length} 筆訂單</li>
            <li><strong>發送頻率：</strong> ${
              reportType.includes("週") || reportType.includes("Week")
                ? "每週日 19:00"
                : "每月最後一天 19:00"
            }</li>
          </ul>
        </div>

        ${summaryHtml}
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>💡 提示：</strong> 詳細的統計分析請參考附件的 CSV 檔案，或登入系統查看完整報表。</p>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p>如需調整自動報表設定或有任何問題，請聯繫系統管理員。</p>
          <p>祝營業順利！</p>
        </div>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
        <p style="margin: 0; font-size: 12px; color: #6b7280;">此郵件由 SAGASU POS 系統自動發送</p>
      </div>
    </div>
  `;
}
