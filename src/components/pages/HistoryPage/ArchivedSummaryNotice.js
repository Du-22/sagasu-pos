import React from "react";
import { Archive, Download, Lock } from "lucide-react";

const formatFileSize = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

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
  monthlySummary,
}) => {
  if (archivedDayCount === 0) return null;

  const storageFiles = monthlySummary?.storageFiles || [];
  const storageBucket = monthlySummary?.storageBucket;
  const archiveStatus = monthlySummary?.archiveStatus;
  const fileTotalSize = storageFiles.reduce(
    (total, file) => total + (Number(file.size) || 0),
    0,
  );
  const hasArchiveFiles = storageFiles.length > 0;

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
          {hasArchiveFiles && (
            <div className="mt-3 flex flex-col gap-2 border-t border-warm-sand pt-3 text-sm text-warm-charcoal sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-bold text-anthropic-black">
                  封存檔已建立
                  {archiveStatus ? `（${archiveStatus}）` : ""}
                </div>
                <div className="mt-1 break-words">
                  {storageFiles.length} 個檔案，約 {formatFileSize(fileTotalSize)}
                  {storageBucket ? `，bucket：${storageBucket}` : ""}
                </div>
              </div>
              <button
                type="button"
                disabled
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-warm-sand bg-parchment px-3 text-sm font-bold text-warm-olive opacity-80"
                title="需要先完成 Firebase Auth 或等效後台授權，才會開放下載"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                <Download className="h-4 w-4" aria-hidden="true" />
                下載
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchivedSummaryNotice;
