import React from "react";
import { Archive } from "lucide-react";

/**
 * ArchivedSummaryNotice
 *
 * 功能效果：提示目前查詢期間包含已整理成總覽的收支紀錄
 * 使用範例：<ArchivedSummaryNotice archivedDayCount={3} archivedIncomeTotal={1200} />
 */
const ArchivedSummaryNotice = ({
  archivedDayCount,
  archivedIncomeTotal,
  archivedExpenseTotal,
  hasVisibleDetails,
  dateRangeText,
}) => {
  if (archivedDayCount === 0) return null;

  return (
    <div className="rounded-lg border border-warm-sand bg-ivory px-4 py-3 shadow-whisper">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-parchment text-terracotta">
          <Archive className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-anthropic-black">
            此期間以營業總覽呈現
          </div>
          <div className="mt-1 text-sm leading-6 text-warm-charcoal">
            {dateRangeText}的紀錄已整理成營業總覽（共 {archivedDayCount} 天），營業額
            <span className="font-bold text-terracotta">
              ${archivedIncomeTotal.toLocaleString("zh-TW")}
            </span>
            ，支出
            <span className="font-bold text-error-warm">
              ${archivedExpenseTotal.toLocaleString("zh-TW")}
            </span>
            ，會直接計入上方統計。
            {hasVisibleDetails
              ? " 近期明細會照常顯示。"
              : " 此畫面保留每日與月份統計，方便查看營業狀況。"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchivedSummaryNotice;
