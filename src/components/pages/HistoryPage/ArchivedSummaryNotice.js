import React from "react";
import { Archive } from "lucide-react";

/**
 * ArchivedSummaryNotice
 *
 * 功能效果：提示目前查詢期間包含已封存的收支明細
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
            此期間包含已封存的收支彙總
          </div>
          <div className="mt-1 text-sm leading-6 text-warm-charcoal">
            {dateRangeText} 有 {archivedDayCount} 天已建立封存彙總，收入
            <span className="font-bold text-terracotta">
              ${archivedIncomeTotal.toLocaleString("zh-TW")}
            </span>
            ，支出
            <span className="font-bold text-error-warm">
              ${archivedExpenseTotal.toLocaleString("zh-TW")}
            </span>
            。
            {hasVisibleDetails
              ? " 目前畫面仍會顯示尚存在的明細。"
              : " 原始明細可能已從 Firestore 移出，畫面會以彙總資料顯示。"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchivedSummaryNotice;
