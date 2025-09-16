const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const createCsvWriter = require("csv-writer").createArrayCsvWriter;

// 初始化 Firebase Admin
initializeApp();
const db = getFirestore();

// 測試用的 HTTP Function
exports.helloWorld = onRequest((request, response) => {
  response.send("Hello from SAGASU POS Functions! 🚀");
});

// 測試用的可呼叫 Function
exports.testConnection = onCall(async (request) => {
  try {
    // 測試 Firestore 連接
    const testDoc = await db.collection("test").add({
      timestamp: new Date(),
      message: "Functions 連接測試成功！",
    });

    return {
      success: true,
      message: "Firebase Functions 運作正常！",
      docId: testDoc.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

// 這裡之後會加入 Email 和 CSV 功能
console.log("📧 SAGASU POS Dev Functions 已載入 [開發環境]");

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

// 測試 CSV 轉換的 Function
exports.testCSV = onCall(async (request) => {
  try {
    // 從 Firestore 讀取一些測試數據
    const salesRef = db.collection("stores/default_store/sales");
    const snapshot = await salesRef.orderBy("timestamp", "desc").limit(5).get();

    const salesData = [];
    snapshot.forEach((doc) => {
      salesData.push({ id: doc.id, ...doc.data() });
    });

    // 轉換為 CSV 格式
    const csvData = convertSalesDataToCSV(salesData);

    return {
      success: true,
      message: `成功轉換 ${salesData.length} 筆資料為 CSV 格式`,
      csvRowCount: csvData.length,
      sampleData: csvData.slice(0, 3), // 回傳前3行作為範例
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

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

// 發送 CSV 報表的 Function
exports.sendCSVReport = onCall(async (request) => {
  try {
    const { reportType, recipientEmail } = request.data;

    console.log(`開始發送 ${reportType} 到 ${recipientEmail}`);

    // 1. 取得銷售資料
    const salesRef = db.collection("stores/default_store/sales");
    const snapshot = await salesRef
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    const salesData = [];
    snapshot.forEach((doc) => {
      salesData.push({ id: doc.id, ...doc.data() });
    });

    // 2. 轉換為 CSV
    const csvData = convertSalesDataToCSV(salesData);

    // 3. 建立 CSV 檔案內容
    const csvContent = csvData.map((row) => row.join(",")).join("\n");

    // 4. 建立 Email transporter
    const transporter = createEmailTransporter();

    // 5. 設定郵件內容
    const mailOptions = {
      from: "du88215@gmail.com",
      to: recipientEmail,
      subject: `SAGASU 咖啡廳 - ${reportType} (${new Date().toLocaleDateString(
        "zh-TW"
      )})`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>☕ SAGASU 咖啡廳營業報表</h2>
          <p>親愛的店長您好，</p>
          <p>附件為您的 <strong>${reportType}</strong>，請查收。</p>
          <ul>
            <li>資料筆數: ${salesData.length} 筆訂單</li>
            <li>CSV 行數: ${csvData.length} 行</li>
            <li>生成時間: ${new Date().toLocaleString("zh-TW")}</li>
          </ul>
          <p>祝營業順利！</p>
          <hr>
          <small>此郵件由 SAGASU POS 系統自動發送</small>
        </div>
      `,
      attachments: [
        {
          filename: `SAGASU_${reportType}_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`,
          content: csvContent,
          contentType: "text/csv; charset=utf-8",
        },
      ],
    };

    // 6. 發送郵件
    const info = await transporter.sendMail(mailOptions);

    console.log("郵件發送成功:", info.messageId);

    return {
      success: true,
      message: `${reportType} 已成功寄送到 ${recipientEmail}`,
      messageId: info.messageId,
      dataCount: salesData.length,
      csvRows: csvData.length,
    };
  } catch (error) {
    console.error("發送郵件失敗:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});
