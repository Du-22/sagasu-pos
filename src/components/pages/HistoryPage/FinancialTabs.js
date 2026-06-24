import React from "react";
import { ChartNoAxesColumn, ClipboardList, WalletCards } from "lucide-react";

const tabs = [
  { id: "income", label: "收入", icon: ChartNoAxesColumn },
  { id: "expense", label: "支出", icon: ClipboardList },
  { id: "overview", label: "收支總覽", icon: WalletCards },
];

/**
 * FinancialTabs
 *
 * 功能效果：營業紀錄頁的收入、支出、收支總覽切換列
 * 使用範例：<FinancialTabs activeTab="income" onTabChange={setActiveTab} />
 */
const FinancialTabs = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-ivory rounded-lg p-2 shadow-whisper">
      <div className="grid grid-cols-3 gap-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-terracotta text-ivory shadow-whisper"
                  : "text-warm-olive hover:bg-parchment hover:text-warm-charcoal"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FinancialTabs;
