import React, { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import Header from "../UI/Header";

const ExportReportsPage = ({ onMenuSelect, onBack }) => {
  // State 管理
  const [reportEmail, setReportEmail] = useState("du88215@gmail.com"); // 改成你的預設信箱
  const [reportStartDate, setReportStartDate] = useState(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return sevenDaysAgo.toISOString().split("T")[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [reportType, setReportType] = useState("營業報表");
  const [quickDateRange, setQuickDateRange] = useState("week");
  const [savedEmails, setSavedEmails] = useState(["du88215@gmail.com"]);
  const [showAddEmailInput, setShowAddEmailInput] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showDeleteEmailModal, setShowDeleteEmailModal] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState("");

  // 載入常用信箱
  useEffect(() => {
    const saved = localStorage.getItem("reportEmails");
    if (saved) {
      try {
        setSavedEmails(JSON.parse(saved));
      } catch (error) {
        console.error("讀取常用信箱失敗:", error);
      }
    }
  }, []);

  // 快速日期範圍選擇
  const handleQuickDateRange = (range) => {
    const today = new Date();
    const endDate = today.toISOString().split("T")[0];
    let startDate;

    switch (range) {
      case "today":
        startDate = endDate;
        setReportType("今日報表");
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString().split("T")[0];
        setReportStartDate(startDate);
        setReportEndDate(startDate);
        setReportType("昨日報表");
        return;
      case "week":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        startDate = startDate.toISOString().split("T")[0];
        setReportType("週報表");
        break;
      case "month":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        startDate = startDate.toISOString().split("T")[0];
        setReportType("月報表");
        break;
      case "thisMonth":
        const now = new Date();
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
          2,
          "0"
        )}-01`;
        setReportType("本月報表");
        break;
      case "lastMonth":
        const lastMonthNum = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
        const lastMonthYear =
          today.getMonth() === 0
            ? today.getFullYear() - 1
            : today.getFullYear();
        const lastMonthDays = new Date(
          lastMonthYear,
          lastMonthNum + 1,
          0
        ).getDate();

        setReportStartDate(
          `${lastMonthYear}-${String(lastMonthNum + 1).padStart(2, "0")}-01`
        );
        setReportEndDate(
          `${lastMonthYear}-${String(lastMonthNum + 1).padStart(
            2,
            "0"
          )}-${lastMonthDays}`
        );
        setReportType("上月報表");
        return;
      default:
        return;
    }

    setReportStartDate(startDate);
    setReportEndDate(endDate);
    setQuickDateRange(range);
  };

  // 發送報表
  const handleSendReport = async () => {
    if (!reportEmail || !reportStartDate || !reportEndDate) {
      alert("請填寫完整的報表資訊");
      return;
    }

    if (reportStartDate > reportEndDate) {
      alert("開始日期不能晚於結束日期");
      return;
    }

    setIsGeneratingReport(true);

    try {
      const functions = getFunctions();
      const sendCSVReport = httpsCallable(functions, "sendCSVReport");

      const result = await sendCSVReport({
        reportType: reportType,
        recipientEmail: reportEmail,
        startDate: reportStartDate,
        endDate: reportEndDate,
      });

      if (result.data.success) {
        alert(`${reportType}發送成功！

期間：${result.data.period.startDate} ~ ${result.data.period.endDate}
資料筆數：${result.data.dataInfo.totalRecords} 筆
郵件已寄送到：${reportEmail}

請檢查信箱查看完整的統計報表。`);
      } else {
        alert("報表發送失敗: " + result.data.error);
      }
    } catch (error) {
      console.error("發送報表失敗:", error);
      alert("發送報表失敗: " + error.message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // 加入常用信箱
  const handleAddEmail = () => {
    if (reportEmail && !savedEmails.includes(reportEmail)) {
      const updatedEmails = [...savedEmails, reportEmail];
      setSavedEmails(updatedEmails);
      localStorage.setItem("reportEmails", JSON.stringify(updatedEmails));
      setShowAddEmailInput(false);
    } else if (savedEmails.includes(reportEmail)) {
      alert("此信箱已在常用列表中");
    } else {
      alert("請先輸入有效的信箱地址");
    }
  };

  // 刪除常用信箱
  const handleRemoveEmail = (emailToRemove) => {
    const updatedEmails = savedEmails.filter(
      (email) => email !== emailToRemove
    );
    setSavedEmails(updatedEmails);
    localStorage.setItem("reportEmails", JSON.stringify(updatedEmails));

    if (reportEmail === emailToRemove) {
      setReportEmail("");
    }

    setShowDeleteEmailModal(false);
    setEmailToDelete("");
  };

  // 自動報表測試
  const testWeeklyReport = async () => {
    try {
      const functions = getFunctions();
      const triggerWeeklyReport = httpsCallable(
        functions,
        "triggerWeeklyReport"
      );
      const result = await triggerWeeklyReport();

      if (result.data.success) {
        alert(`週報測試發送成功！

請檢查信箱查看自動週報郵件。

注意：這是測試功能，正式的自動週報會在每週日 19:00 自動發送。`);
      } else {
        alert("週報測試失敗: " + result.data.error);
      }
    } catch (error) {
      console.error("週報測試失敗:", error);
      alert("週報測試失敗: " + error.message);
    }
  };

  const testMonthlyReport = async () => {
    try {
      const functions = getFunctions();
      const triggerMonthlyReport = httpsCallable(
        functions,
        "triggerMonthlyReport"
      );
      const result = await triggerMonthlyReport();

      if (result.data.success) {
        alert(`月報測試發送成功！

請檢查信箱查看自動月報郵件。

注意：這是測試功能，正式的自動月報會在每月最後一天 19:00 自動發送。`);
      } else {
        alert("月報測試失敗: " + result.data.error);
      }
    } catch (error) {
      console.error("月報測試失敗:", error);
      alert("月報測試失敗: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        title="Sasuga POS系統"
        subtitle="資料匯出"
        currentPage="export"
        showBackButton={true}
        onBackClick={onBack}
        onMenuSelect={onMenuSelect}
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* 手動報表區塊 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              📊 手動報表匯出
            </h2>
            <p className="text-gray-600">
              選擇統計期間和收件人，立即生成並發送營業報表。
            </p>
          </div>

          {/* 快速日期選擇 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              快速選擇統計期間
            </label>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[
                { key: "today", label: "今日", icon: "📅" },
                { key: "yesterday", label: "昨日", icon: "📋" },
                { key: "week", label: "最近7天", icon: "📊" },
                { key: "month", label: "最近30天", icon: "📈" },
                { key: "thisMonth", label: "本月", icon: "🗓️" },
                { key: "lastMonth", label: "上個月", icon: "📆" },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleQuickDateRange(option.key)}
                  className={`p-4 text-center border-2 rounded-lg transition-all ${
                    quickDateRange === option.key
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="text-xl mb-2">{option.icon}</div>
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 自訂日期範圍 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              自訂統計期間
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  開始日期
                </label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => {
                    setReportStartDate(e.target.value);
                    setQuickDateRange("");
                    setReportType("自訂報表");
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  結束日期
                </label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => {
                    setReportEndDate(e.target.value);
                    setQuickDateRange("");
                    setReportType("自訂報表");
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* 報表類型顯示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-blue-600 font-medium">📄 報表類型：</span>
                <span className="ml-2 text-blue-800 font-bold">
                  {reportType}
                </span>
              </div>
              <span className="text-blue-600 text-sm">
                {reportStartDate} ~ {reportEndDate}
              </span>
            </div>
          </div>

          {/* 收件人設定 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              收件人信箱
            </label>

            {/* 常用信箱選擇 */}
            {savedEmails.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-2">
                  常用信箱
                </label>
                <div className="flex flex-wrap gap-2">
                  {savedEmails.map((email) => (
                    <div
                      key={email}
                      className={`group relative inline-flex items-center px-3 py-2 text-sm rounded-full border transition-colors ${
                        reportEmail === email
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                      }`}
                    >
                      <button
                        onClick={() => setReportEmail(email)}
                        className="flex-1 text-left"
                      >
                        {email}
                      </button>
                      <button
                        onClick={() => {
                          setEmailToDelete(email);
                          setShowDeleteEmailModal(true);
                        }}
                        className={`ml-2 w-4 h-4 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity ${
                          reportEmail === email
                            ? "hover:bg-blue-600 text-white"
                            : "hover:bg-red-500 hover:text-white"
                        }`}
                        title={`移除 ${email}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 信箱輸入 */}
            <div className="flex space-x-2">
              <input
                type="email"
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
                placeholder="請輸入接收報表的信箱地址"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {!showAddEmailInput ? (
                <button
                  onClick={() => setShowAddEmailInput(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  + 加入常用
                </button>
              ) : (
                <button
                  onClick={handleAddEmail}
                  disabled={!reportEmail || savedEmails.includes(reportEmail)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  確定
                </button>
              )}
            </div>
          </div>

          {/* 發送按鈕 */}
          <button
            onClick={handleSendReport}
            disabled={
              isGeneratingReport ||
              !reportEmail ||
              !reportStartDate ||
              !reportEndDate
            }
            className="w-full py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingReport ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                產生報表中...
              </div>
            ) : (
              `📧 發送 ${reportType}`
            )}
          </button>
        </div>

        {/* 自動報表區塊 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                🤖 自動報表
              </h2>
              <p className="text-gray-600">
                系統會自動在指定時間發送報表，無需手動操作。
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={testWeeklyReport}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                測試週報
              </button>
              <button
                onClick={testMonthlyReport}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
              >
                測試月報
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 週報設定 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-3">
                📅 自動週報
              </h3>
              <ul className="text-sm text-green-700 space-y-2">
                <li>
                  <strong>發送時間：</strong> 每週日 19:00
                </li>
                <li>
                  <strong>統計期間：</strong> 本週一 ~ 本週日
                </li>
                <li>
                  <strong>報表內容：</strong> 完整營業統計分析
                </li>
                <li>
                  <strong>狀態：</strong>{" "}
                  <span className="text-green-600 font-medium">✓ 已啟用</span>
                </li>
              </ul>
            </div>

            {/* 月報設定 */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-800 mb-3">
                📊 自動月報
              </h3>
              <ul className="text-sm text-purple-700 space-y-2">
                <li>
                  <strong>發送時間：</strong> 每月最後一天 19:00
                </li>
                <li>
                  <strong>統計期間：</strong> 本月 1 號 ~ 本月最後一天
                </li>
                <li>
                  <strong>報表內容：</strong> 月度營業分析總結
                </li>
                <li>
                  <strong>狀態：</strong>{" "}
                  <span className="text-purple-600 font-medium">✓ 已啟用</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 報表內容說明 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📋 報表內容說明
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">統計分析包含：</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 營業摘要統計</li>
                <li>• 熱門商品排行榜</li>
                <li>• 付款方式分析</li>
                <li>• 內用 vs 外帶統計</li>
                <li>• 退款統計分析</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">檔案格式：</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 專業 HTML 格式郵件</li>
                <li>• 完整銷售明細 CSV 檔案</li>
                <li>• 支援 Excel 開啟編輯</li>
                <li>• 適合打印和存檔</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 刪除信箱確認 Modal */}
      {showDeleteEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-800 mb-2">確認刪除</h3>
              <p className="text-gray-600 text-sm">
                確定要從常用信箱列表中移除以下信箱嗎？
              </p>
              <p className="font-medium text-gray-800 mt-2 p-2 bg-gray-50 rounded">
                {emailToDelete}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteEmailModal(false);
                  setEmailToDelete("");
                }}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleRemoveEmail(emailToDelete)}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors"
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportReportsPage;
