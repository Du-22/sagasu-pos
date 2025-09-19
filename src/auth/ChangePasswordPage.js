// src/components/auth/ChangePasswordPage.js
import React, { useState, useRef } from "react";
import { Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";

const ChangePasswordPage = ({ onBack, onPasswordChanged }) => {
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // 使用非受控組件，直接操作 DOM
  const oldPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const getInputRef = (field) => {
    switch (field) {
      case "oldPassword":
        return oldPasswordRef;
      case "newPassword":
        return newPasswordRef;
      case "confirmPassword":
        return confirmPasswordRef;
      default:
        return null;
    }
  };

  // 簡化的密碼顯示切換，使用 React 狀態但按鈕在外面
  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const clearErrors = () => {
    setErrors({});
    setSuccessMessage("");
  };

  const validateForm = () => {
    const oldPassword = oldPasswordRef.current?.value || "";
    const newPassword = newPasswordRef.current?.value || "";
    const confirmPassword = confirmPasswordRef.current?.value || "";

    const newErrors = {};

    if (!oldPassword.trim()) {
      newErrors.oldPassword = "請輸入目前密碼";
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = "請輸入新密碼";
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "新密碼至少需要6個字符";
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "請確認新密碼";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "新密碼與確認密碼不一致";
    }

    if (oldPassword && newPassword && oldPassword === newPassword) {
      newErrors.newPassword = "新密碼不能與目前密碼相同";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const oldPassword = oldPasswordRef.current.value;
      const newPassword = newPasswordRef.current.value;

      // 動態 import Firebase 操作函數
      const { changeAuthPassword } = await import("../firebase/operations");

      const success = await changeAuthPassword(oldPassword, newPassword);

      if (success) {
        setSuccessMessage("密碼更改成功！");

        // 清空輸入框
        oldPasswordRef.current.value = "";
        newPasswordRef.current.value = "";
        confirmPasswordRef.current.value = "";

        if (onPasswordChanged) {
          onPasswordChanged();
        }

        onBack(); // 立即返回系統
      } else {
        setErrors({ oldPassword: "目前密碼錯誤，請重新輸入" });
      }
    } catch (error) {
      console.error("更改密碼失敗:", error);
      setErrors({ general: "系統錯誤，請稍後再試" });
    } finally {
      setIsLoading(false);
    }
  };

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
          返回系統
        </button>

        {/* 主要卡片 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">更改密碼</h1>
            <p className="text-gray-600 mt-2">請輸入目前密碼和新密碼</p>
          </div>

          {/* 成功訊息 */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm text-center">
                {successMessage}
              </p>
              <p className="text-green-600 text-xs text-center mt-1">
                3秒後自動返回系統...
              </p>
            </div>
          )}

          {/* 一般錯誤訊息 */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm text-center">
                {errors.general}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 目前密碼 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                目前密碼
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Lock
                    className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none h-5 w-5 text-gray-400"
                    style={{
                      top: "50%",
                      transform: "translateY(-50%)",
                      left: "12px",
                    }}
                  />
                  <input
                    ref={oldPasswordRef}
                    type={showPasswords.oldPassword ? "text" : "password"}
                    className={`block w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.oldPassword
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="請輸入目前密碼"
                    disabled={isLoading}
                    onChange={clearErrors}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("oldPassword")}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                  disabled={isLoading}
                >
                  {showPasswords.oldPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.oldPassword && (
                <p className="text-sm text-red-600">{errors.oldPassword}</p>
              )}
            </div>

            {/* 新密碼 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                新密碼
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Lock
                    className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none h-5 w-5 text-gray-400"
                    style={{
                      top: "50%",
                      transform: "translateY(-50%)",
                      left: "12px",
                    }}
                  />
                  <input
                    ref={newPasswordRef}
                    type={showPasswords.newPassword ? "text" : "password"}
                    className={`block w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.newPassword
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="請輸入新密碼 (至少6個字符)"
                    disabled={isLoading}
                    onChange={clearErrors}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("newPassword")}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                  disabled={isLoading}
                >
                  {showPasswords.newPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-red-600">{errors.newPassword}</p>
              )}
            </div>

            {/* 確認新密碼 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                確認新密碼
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Lock
                    className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none h-5 w-5 text-gray-400"
                    style={{
                      top: "50%",
                      transform: "translateY(-50%)",
                      left: "12px",
                    }}
                  />
                  <input
                    ref={confirmPasswordRef}
                    type={showPasswords.confirmPassword ? "text" : "password"}
                    className={`block w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.confirmPassword
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="請再次輸入新密碼"
                    disabled={isLoading}
                    onChange={clearErrors}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirmPassword")}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                  disabled={isLoading}
                >
                  {showPasswords.confirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* 提交按鈕 */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  更改中...
                </div>
              ) : (
                "確認更改密碼"
              )}
            </button>
          </form>

          {/* 提示訊息 */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>注意：</strong>
            </p>
            <ul className="text-yellow-700 text-xs mt-1 space-y-1">
              <li>• 新密碼至少需要6個字符</li>
              <li>• 請妥善保管新密碼</li>
              <li>• 更改後請重新登入所有裝置</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
