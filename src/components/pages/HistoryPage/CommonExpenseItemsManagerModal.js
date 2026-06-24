import React, { useMemo, useState } from "react";
import { Check, Pencil, Search, Trash2, X } from "lucide-react";

const formatCurrency = (amount) => `$${amount.toLocaleString("zh-TW")}`;

const blankItem = {
  name: "",
  vendor: "",
  amount: "",
};

/**
 * CommonExpenseItemsManagerModal
 *
 * 功能效果：用彈出式頁面管理大量常用原材料，支援搜尋、編輯與刪除
 * 使用範例：<CommonExpenseItemsManagerModal items={items} onUpdateItem={updateItem} />
 */
const CommonExpenseItemsManagerModal = ({
  items,
  onClose,
  isSaving = false,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingDraft, setEditingDraft] = useState(blankItem);
  const [searchText, setSearchText] = useState("");

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return items;

    return items.filter((item) =>
      `${item.name} ${item.vendor}`.toLowerCase().includes(keyword),
    );
  }, [items, searchText]);

  const startEditing = (item) => {
    setEditingItemId(item.id);
    setEditingDraft({
      name: item.name,
      vendor: item.vendor,
      amount: String(item.amount),
    });
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditingDraft(blankItem);
  };

  const handleEditingChange = (field, value) => {
    setEditingDraft((currentItem) => ({
      ...currentItem,
      [field]: value,
    }));
  };

  const handleSaveEditing = async () => {
    const amount = Number(editingDraft.amount);
    if (!editingDraft.name.trim() || !editingDraft.vendor.trim() || amount <= 0) {
      window.alert("請填寫常用原材料名稱、廠商與大於 0 的價格");
      return;
    }

    try {
      await onUpdateItem(editingItemId, {
        name: editingDraft.name.trim(),
        vendor: editingDraft.vendor.trim(),
        amount,
      });
      cancelEditing();
    } catch (error) {
      console.error("更新常用原材料失敗:", error);
      window.alert("更新常用原材料失敗，請檢查網路後再試");
    }
  };

  const handleDeleteItem = async (itemId) => {
    const confirmed = window.confirm("這個常用項目會從 Firebase 刪除，確定刪除嗎？");
    if (!confirmed) return;

    try {
      await onDeleteItem(itemId);
    } catch (error) {
      console.error("刪除常用原材料失敗:", error);
      window.alert("刪除常用原材料失敗，請檢查網路後再試");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-anthropic-black/40 p-4">
      <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-xl bg-ivory shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-warm-cream p-4">
          <div>
            <h3 className="text-lg font-bold text-anthropic-black">
              管理常用清單
            </h3>
            <p className="text-sm text-warm-olive">
              常用項目變多時，可在這裡搜尋、編輯或刪除。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-warm-olive transition-colors hover:bg-parchment hover:text-warm-charcoal"
            aria-label="關閉常用清單管理"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-warm-cream p-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-stone" />
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="搜尋名稱或廠商"
              className="w-full rounded-lg border border-warm-sand bg-ivory py-2 pl-9 pr-3 focus:border-terracotta focus:outline-none"
            />
          </label>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-4">
          {filteredItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-warm-sand py-10 text-center text-warm-stone">
              找不到符合的常用項目
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <CommonExpenseItemRow
                  key={item.id}
                  item={item}
                  isEditing={editingItemId === item.id}
                  editingDraft={editingDraft}
                  onStartEditing={startEditing}
                  onCancelEditing={cancelEditing}
                  onEditingChange={handleEditingChange}
                  onSaveEditing={handleSaveEditing}
                  onDeleteItem={handleDeleteItem}
                  isSaving={isSaving}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-warm-cream p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-[40px] rounded-lg bg-terracotta px-4 py-2 font-medium text-ivory transition-colors hover:bg-terracotta-dark"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

const CommonExpenseItemRow = ({
  item,
  isEditing,
  editingDraft,
  onStartEditing,
  onCancelEditing,
  onEditingChange,
  onSaveEditing,
  onDeleteItem,
  isSaving,
}) => {
  return (
    <div className="rounded-lg border border-warm-cream bg-parchment p-3">
      {isEditing ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_120px_auto]">
          <EditField
            label="名稱"
            type="text"
            value={editingDraft.name}
            onChange={(value) => onEditingChange("name", value)}
          />
          <EditField
            label="廠商"
            type="text"
            value={editingDraft.vendor}
            onChange={(value) => onEditingChange("vendor", value)}
          />
          <EditField
            label="價格"
            type="number"
            value={editingDraft.amount}
            onChange={(value) => onEditingChange("amount", value)}
          />
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={onSaveEditing}
              disabled={isSaving}
              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-lg bg-terracotta px-3 py-2 text-sm font-medium text-ivory transition-colors hover:bg-terracotta-dark lg:flex-none"
            >
              <Check className="h-4 w-4" />
              {isSaving ? "儲存中" : "儲存"}
            </button>
            <button
              type="button"
              onClick={onCancelEditing}
              className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-warm-olive transition-colors hover:bg-warm-sand lg:flex-none"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="font-bold text-anthropic-black">{item.name}</div>
            <div className="mt-1 text-sm text-warm-olive">
              {item.vendor} · {formatCurrency(item.amount)}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onStartEditing(item)}
              className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-warm-charcoal transition-colors hover:bg-warm-sand sm:flex-none"
            >
              <Pencil className="h-4 w-4" />
              編輯
            </button>
            <button
              type="button"
              onClick={() => onDeleteItem(item.id)}
              disabled={isSaving}
              className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-error-warm transition-colors hover:bg-error-warm/10 sm:flex-none"
            >
              <Trash2 className="h-4 w-4" />
              刪除
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const EditField = ({ label, type, value, onChange }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-warm-olive">
      {label}
    </span>
    <input
      type={type}
      min={type === "number" ? "0" : undefined}
      inputMode={type === "number" ? "numeric" : undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-warm-sand bg-ivory px-3 py-2 focus:border-terracotta focus:outline-none"
    />
  </label>
);

export default CommonExpenseItemsManagerModal;
