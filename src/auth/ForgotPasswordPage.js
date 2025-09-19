import React, { useState, useEffect } from "react";
import {
  Key,
  Shield,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const ForgotPasswordPage = ({ onBack, onResetSuccess }) => {
  const [step, setStep] = useState(1); // 1: 安全問題, 2: 設定新密碼
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    newPassword: false,
    confirmPassword: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");

  useEffect(() => {
    loadSecurityQuestion();
  }, []);

  const loadSecurityQuestion = async () => {
    try {
      const { getSecurityQuestion } = await import("../firebase/operations");
      const settings = await getSecurityQuestion();

      if (settings && settings.question) {
        setSecurityQuestion(settings.question);
      } else {
        setError("尚未設定安全問題，無法重置密碼");
      }
    } catch (error) {
      console.error("載入安全問題失敗:", error);
      setError("無法載入安全問題，請稍後再試");
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();

    if (!securityAnswer.trim()) {
      setError("請輸入安全問題答案");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { verifySecurityAnswer } = await import("../firebase/operations");
      const isValid = await verifySecurityAnswer(securityAnswer);

      if (isValid) {
        setStep(2);
      } else {
        setError("安全問題答案錯誤，請重新確認");
      }
    } catch (error) {
      console.error("驗證安全問題答案失敗:", error);
      setError("驗證失敗，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  };

  const validateNewPassword = () => {
    if (!newPassword.trim()) {
      setError("請輸入新密碼");
      return false;
    }

    if (newPassword.length < 6) {
      setError("新密碼至少需要6個字符");
      return false;
    }

    if (!confirmPassword.trim()) {
      setError("請確認新密碼");
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError("新密碼與確認密碼不一致");
      return false;
    }

    if (newPassword === "sagasu2024") {
      setError("新密碼不能與預設密碼相同");
      return false;
    }

    return true;
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (!validateNewPassword()) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { resetPasswordWithSecurity } = await import(
        "../firebase/operations"
      );
      const result = await resetPasswordWithSecurity(
        securityAnswer,
        newPassword
      );

      if (result.success) {
        // 顯示成功訊息後返回登入頁面
        setTimeout(() => {
          onResetSuccess();
        }, 2000);
      } else {
        setError(result.message || "密碼重置失敗");
      }
    } catch (error) {
      console.error("重置密碼失敗:", error);
      setError("系統錯誤，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  };

  const PasswordInput = ({ label, field, value, onChange, placeholder }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Key
            className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none h-5 w-5 text-gray-400"
            style={{ top: "50%", transform: "translateY(-50%)", left: "12px" }}
          />
          <input
            type={showPasswords[field] ? "text" : "password"}
            value={value}
            onChange={onChange}
            className="block w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
            placeholder={placeholder}
            disabled={isLoading}
          />
        </div>
        <button
          type="button"
          onClick={() => togglePasswordVisibility(field)}
          className="p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
          disabled={isLoading}
        >
          {showPasswords[field] ? (
            <EyeOff className="h-5 w-5 text-gray-400" />
          ) : (
            <Eye className="h-5 w-5 text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );

  // 成功頁面
  if (step === 2 && isLoading && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                密碼重置成功
              </h1>
              <p className="text-gray-600 mb-4">
                您的密碼已成功重置，請使用新密碼登入
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">正在返回登入頁面...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 返回按鈕 */}
        <button
          onClick={onBack}
          className="mb-4 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回登入
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* 標題區域 */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {step === 1 ? (
                <Shield className="w-8 h-8 text-blue-600" />
              ) : (
                <Key className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 1 ? "安全驗證" : "設定新密碼"}
            </h1>
            <p className="text-gray-600 mt-2">
              {step === 1 ? "請回答安全問題來驗證身份" : "請設定您的新密碼"}
            </p>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* 步驟1：安全問題驗證 */}
          {step === 1 && (
            <form onSubmit={handleAnswerSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  安全問題
                </label>
                <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                  <p className="text-gray-800 font-medium">
                    {securityQuestion || "載入中..."}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="securityAnswer"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  您的答案
                </label>
                <input
                  type="text"
                  id="securityAnswer"
                  value={securityAnswer}
                  onChange={(e) => {
                    setSecurityAnswer(e.target.value);
                    if (error) setError("");
                  }}
                  className="block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                  placeholder="請輸入答案"
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !securityAnswer.trim()}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                  isLoading || !securityAnswer.trim()
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    驗證中...
                  </div>
                ) : (
                  "驗證答案"
                )}
              </button>
            </form>
          )}

          {/* 步驟2：設定新密碼 */}
          {step === 2 && (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <PasswordInput
                label="新密碼"
                field="newPassword"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="請輸入新密碼 (至少6個字符)"
              />

              <PasswordInput
                label="確認新密碼"
                field="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="請再次輸入新密碼"
              />

              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                  isLoading || !newPassword || !confirmPassword
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    重置中...
                  </div>
                ) : (
                  "重置密碼"
                )}
              </button>
            </form>
          )}

          {/* 提示訊息 */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm font-medium">提示：</p>
            {step === 1 ? (
              <ul className="text-blue-700 text-xs mt-1 space-y-1">
                <li>• 答案不區分大小寫</li>
                <li>• 請輸入完整且準確的店名</li>
                <li>• 如果忘記答案，請聯絡技術支援</li>
              </ul>
            ) : (
              <ul className="text-blue-700 text-xs mt-1 space-y-1">
                <li>• 新密碼至少需要6個字符</li>
                <li>• 不能使用預設密碼 "sagasu2024"</li>
                <li>• 請妥善保管新密碼</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
