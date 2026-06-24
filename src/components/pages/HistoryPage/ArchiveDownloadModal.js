import React, { useState } from "react";
import { Download, ExternalLink, Lock, X } from "lucide-react";
import { createArchiveDownloadSession } from "../../../firebase/financialArchiveDownloads";

const formatFileSize = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/**
 * ArchiveDownloadModal
 *
 * 功能效果：重新驗證 POS 密碼後，顯示封存檔短效下載連結。
 * 使用範例：<ArchiveDownloadModal month="2026-03" onClose={handleClose} />
 */
const ArchiveDownloadModal = ({ month, onClose }) => {
  const [password, setPassword] = useState("");
  const [downloadFiles, setDownloadFiles] = useState([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasDownloadLinks = downloadFiles.length > 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!password.trim()) {
      setErrorMessage("請輸入 POS 管理密碼。");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await createArchiveDownloadSession({
        month,
        password,
      });

      if (!result.success) {
        setErrorMessage(result.error || "建立下載連結失敗。");
        return;
      }

      setDownloadFiles(result.files || []);
      setExpiresAt(result.expiresAt || "");
      setPassword("");
    } catch (error) {
      console.error("建立封存檔下載連結失敗:", error);
      setErrorMessage("建立下載連結失敗，請稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  const expiresText = expiresAt
    ? new Date(expiresAt).toLocaleTimeString("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="w-full max-w-lg rounded-lg bg-ivory p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-anthropic-black">
              下載 {month} 封存檔
            </h3>
            <p className="mt-1 text-sm leading-6 text-warm-charcoal">
              下載前需要重新驗證 POS 管理密碼。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-warm-sand text-warm-charcoal hover:bg-parchment"
            aria-label="關閉"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {!hasDownloadLinks && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-warm-charcoal">
                POS 管理密碼
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-warm-sand bg-white px-3 py-3 text-anthropic-black outline-none focus:border-terracotta"
                autoFocus
              />
            </label>

            {errorMessage && (
              <div className="rounded-lg border border-error-warm/30 bg-error-warm/10 px-3 py-2 text-sm text-error-warm">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 rounded-lg border border-warm-sand px-4 font-bold text-warm-charcoal hover:bg-parchment"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isLoading || !password.trim()}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-terracotta px-4 font-bold text-ivory hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                {isLoading ? "驗證中..." : "建立連結"}
              </button>
            </div>
          </form>
        )}

        {hasDownloadLinks && (
          <div className="space-y-4">
            <div className="rounded-lg border border-warm-sand bg-parchment px-3 py-2 text-sm text-warm-charcoal">
              下載連結有效至 {expiresText}，逾時後需重新建立。
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {downloadFiles.map((file) => (
                <a
                  key={file.key}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-warm-sand bg-white px-3 py-3 text-sm hover:bg-parchment"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-anthropic-black">
                      {file.filename}
                    </span>
                    <span className="text-warm-olive">
                      {formatFileSize(file.size)}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-2 font-bold text-terracotta">
                    <Download className="h-4 w-4" aria-hidden="true" />
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </span>
                </a>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-lg bg-terracotta px-4 font-bold text-ivory hover:bg-terracotta-dark"
            >
              完成
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchiveDownloadModal;
