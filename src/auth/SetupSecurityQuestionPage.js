import React, { useState } from "react";
import { Shield, AlertCircle, CheckCircle, Store } from "lucide-react";

const SetupSecurityQuestionPage = ({ onComplete, onSkip }) => {
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const question = "您的咖啡廳店名是？";

  const handleAnswerChange = (e) => {
    setAnswer(e.target.value);
    if (error) setError("");
  };

  const validateAnswer = () => {
    if (!answer.trim()) {
      setError("請輸入咖啡廳店名");
      return false;
    }

    if (answer.trim().length < 2) {
      setError("店名至少需要2個字符");
      return false;
    }

    if (answer.trim().length > 50) {
      setError("店名不能超過50個字符");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateAnswer()) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // 動態 import Firebase 操作函數
      const { setSecurityQuestion } = await import("../firebase/operations");

      const success = await setSecurityQuestion(question, answer.trim());

      if (success) {
        setSuccess(true);

        // 短暫顯示成功訊息後完成設定
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        setError("設定失敗，請稍後再試");
      }
    } catch (error) {
      console.error("設定安全問題失敗:", error);
      if (error.message.includes("Firebase")) {
        setError("網路連線異常，請檢查網路後重試");
      } else {
        setError("系統錯誤，請稍後再試");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    const confirmed = window.confirm(
      "跳過安全問題設定將無法使用忘記密碼功能。\n\n確定要跳過嗎？"
    );

    if (confirmed) {
      onSkip();
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                設定完成
              </h1>
              <p className="text-gray-600">
                安全問題已成功設定，正在進入系統...
              </p>
              <div className="mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* 標題區域 */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">安全問題設定</h1>
            <p className="text-gray-600 mt-2">為了帳戶安全，請設定安全問題</p>
          </div>

          {/* 說明區域 */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-800 text-sm font-medium mb-1">
                  為什麼需要設定安全問題？
                </p>
                <ul className="text-blue-700 text-xs space-y-1">
                  <li>• 忘記密碼時可以重置密碼</li>
                  <li>• 提供額外的帳戶安全保護</li>
                  <li>• 確保只有店主能重置密碼</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* 表單 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                安全問題
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Store className="h-5 w-5 text-gray-400" />
                </div>
                <div className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 font-medium">
                  {question}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="answer"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                您的答案
              </label>
              <input
                type="text"
                id="answer"
                value={answer}
                onChange={handleAnswerChange}
                className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  error ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
                placeholder="請輸入您的咖啡廳店名"
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                答案會經過加密儲存，請確保只有您知道正確答案
              </p>
            </div>

            {/* 提交按鈕 */}
            <button
              type="submit"
              disabled={isLoading || !answer.trim()}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                isLoading || !answer.trim()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  設定中...
                </div>
              ) : (
                "完成設定"
              )}
            </button>

            {/* 跳過按鈕 */}
            <button
              type="button"
              onClick={handleSkip}
              disabled={isLoading}
              className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              暫時跳過
            </button>
          </form>

          {/* 注意事項 */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm font-medium">注意事項：</p>
            <ul className="text-yellow-700 text-xs mt-1 space-y-1">
              <li>• 請確保答案準確，重置密碼時需要完全一致</li>
              <li>• 建議使用正式的店名，避免使用暱稱</li>
              <li>• 答案不區分大小寫，但請記住正確的字詞</li>
              <li>• 如果跳過設定，稍後可在帳戶管理中設定</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupSecurityQuestionPage;
