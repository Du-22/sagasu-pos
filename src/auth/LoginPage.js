import React, { useState } from "react";
import { Eye, EyeOff, Coffee, Lock } from "lucide-react";

const LoginPage = ({
  onLoginSuccess,
  onLoginFailure,
  onForgotPassword,
  isLoading,
}) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password.trim()) {
      alert("請輸入密碼");
      return;
    }

    if (isSubmitting || isLoading) return;

    setIsSubmitting(true);

    try {
      // 呼叫父組件傳入的登入處理函數
      await onLoginSuccess(password);
    } catch (error) {
      console.error("登入處理失敗:", error);
      if (onLoginFailure) {
        onLoginFailure(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo 和標題區域 */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <Coffee className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sagasu POS 系統
          </h2>
          <p className="mt-2 text-sm text-gray-600">請輸入密碼以存取系統</p>
        </div>

        {/* 登入表單 */}
        <div className="bg-white rounded-xl shadow-2xl p-8 space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="sr-only">
                密碼
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full pl-10 pr-12 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-lg"
                  placeholder="請輸入系統密碼"
                  disabled={isSubmitting || isLoading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isSubmitting || isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || isLoading || !password.trim()}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isSubmitting || isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    驗證中...
                  </div>
                ) : (
                  "登入系統"
                )}
              </button>
            </div>

            {/* 新增：忘記密碼連結 */}
            <div className="text-center">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                disabled={isLoading}
              >
                忘記密碼？
              </button>
            </div>
          </form>
        </div>

        {/* 版權訊息 */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            © 2024 Sagasu Coffee POS System
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
