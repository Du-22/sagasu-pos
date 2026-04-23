// src/components/UI/Header.js
import React, { useState } from "react";
import { ArrowLeft, Coffee, Menu, X, LogOut } from "lucide-react";

const Header = ({
  title,
  subtitle,
  showBackButton,
  onBackClick,
  onMenuSelect,
  onLogout,
  currentPage,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 根據當前頁面選擇對應圖示
  const getPageIcon = (page) => {
    switch (page) {
      case "seating":
        return <Coffee className="w-5 h-5" />;
      case "history":
        return <span className="text-lg">📊</span>;
      // case "statistics":
      //   return <span className="text-lg">📈</span>;
      case "settings":
        return <span className="text-lg">⚙️</span>;
      case "export":
        return <span className="text-lg">📤</span>;
      case "account":
        return <span className="text-lg">👤</span>;
      default:
        return <Coffee className="w-5 h-5" />;
    }
  };

  const menuItems = [
    { id: "seating", label: "座位管理", icon: <Coffee className="w-5 h-5" /> },
    { id: "history", label: "營業記錄", icon: "📊" },
    // { id: "statistics", label: "統計分析", icon: "📈" },
    { id: "menuedit", label: "菜單編輯", icon: "📝" },
    { id: "export", label: "資料匯出", icon: "📤" },
    { id: "account", label: "帳戶管理", icon: "👤" },
  ];

  const handleMenuClick = (menuId) => {
    setIsMenuOpen(false);
    if (onMenuSelect) {
      onMenuSelect(menuId);
    }
  };

  const handleLogoutClick = () => {
    setIsMenuOpen(false);
    if (onLogout) {
      // 可以加入確認對話框
      const confirmed = window.confirm("確定要登出系統嗎？");
      if (confirmed) {
        onLogout();
      }
    }
  };

  return (
    <div className="bg-ivory border-b border-warm-cream p-4 flex items-center justify-between relative">
      <div className="flex items-center space-x-4">
        {showBackButton && (
          <button
            onClick={onBackClick}
            className="p-2 hover:bg-warm-sand rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-warm-charcoal" />
          </button>
        )}
        <button
          type="button"
          className="text-xl font-serif text-anthropic-black hover:text-terracotta transition-colors"
          onClick={() => onMenuSelect && onMenuSelect("seating")}
        >
          Sagasu POS系統
        </button>
      </div>

      <div className="flex items-center space-x-4">
        {subtitle && (
          <div className="flex items-center space-x-2">
            {getPageIcon(currentPage)} {/* 動態圖示 */}
            <span className="text-sm text-warm-olive">{subtitle}</span>
          </div>
        )}

        {/* 漢堡選單按鈕 */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-warm-sand rounded-full transition-colors"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-warm-charcoal" />
            ) : (
              <Menu className="w-6 h-6 text-warm-charcoal" />
            )}
          </button>

          {/* 下拉選單 */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-ivory rounded-xl shadow-whisper border border-warm-cream z-50">
              <div className="py-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className="w-full px-4 py-3 text-left hover:bg-parchment flex items-center space-x-3 transition-colors"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium text-warm-charcoal">
                      {item.label}
                    </span>
                  </button>
                ))}

                {/* 分隔線 */}
                <hr className="my-2 border-warm-cream" />

                {/* 登出選項 */}
                <button
                  onClick={handleLogoutClick}
                  className="w-full px-4 py-3 text-left hover:bg-parchment flex items-center space-x-3 transition-colors text-error-warm"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">登出系統</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 點擊外部關閉選單的遮罩 */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Header;
