import React, { useState } from "react";
import { Plus, Settings } from "lucide-react";
import CommonExpenseItemsManagerModal from "./CommonExpenseItemsManagerModal";

const formatCurrency = (amount) => `$${amount.toLocaleString("zh-TW")}`;

const blankItem = {
  name: "",
  vendor: "",
  amount: "",
};

/**
 * CommonExpenseItemsPanel
 *
 * 功能效果：設定常用原材料，並用大尺寸卡片快速帶入支出表單
 * 使用範例：<CommonExpenseItemsPanel items={items} onSelectItem={fillForm} />
 */
const CommonExpenseItemsPanel = ({
  items,
  materialOptions,
  vendorOptions,
  onSelectItem,
  isSaving = false,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [draftItem, setDraftItem] = useState(blankItem);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  const handleChange = (field, value) => {
    setDraftItem((currentItem) => ({
      ...currentItem,
      [field]: value,
    }));
  };

  const handleAddItem = async (event) => {
    event.preventDefault();

    const amount = Number(draftItem.amount);
    if (!draftItem.name.trim() || !draftItem.vendor.trim() || amount <= 0) {
      window.alert("請填寫常用原材料名稱、廠商與大於 0 的價格");
      return;
    }

    try {
      await onAddItem({
        name: draftItem.name.trim(),
        vendor: draftItem.vendor.trim(),
        amount,
      });
      setDraftItem(blankItem);
    } catch (error) {
      console.error("新增常用原材料失敗:", error);
      window.alert("新增常用原材料失敗，請檢查網路後再試");
    }
  };

  return (
    <div className="bg-ivory rounded-lg p-4 shadow-whisper">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-anthropic-black">常用原材料</h2>
          <p className="text-sm text-warm-olive">
            設定好名稱、廠商、價格後，點卡片即可帶入支出紀錄。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsManagerOpen(true)}
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-parchment px-3 py-2 text-sm font-medium text-warm-charcoal transition-colors hover:bg-warm-sand"
        >
          <Settings className="h-4 w-4" />
          管理常用清單
          <span className="text-warm-stone">({items.length})</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectItem(item)}
            className="min-h-[112px] rounded-lg border border-warm-cream bg-parchment p-4 text-left transition-colors hover:border-terracotta hover:bg-warm-sand focus:border-terracotta focus:outline-none"
          >
            <div className="line-clamp-2 font-bold text-anthropic-black">
              {item.name}
            </div>
            <div className="mt-2 text-sm text-warm-olive">{item.vendor}</div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-lg font-bold text-terracotta">
                {formatCurrency(item.amount)}
              </span>
              <span className="text-xs text-warm-stone">點選帶入</span>
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={handleAddItem} className="mt-4 rounded-lg border border-warm-cream p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-warm-charcoal">新增常用項目</h3>
          <span className="text-xs text-warm-stone">Firebase 同步</span>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(280px,1fr)_220px_150px_auto]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-warm-charcoal">名稱</span>
            <input
              type="text"
              value={draftItem.name}
              list="common-expense-material-options"
              onChange={(event) => handleChange("name", event.target.value)}
              placeholder="例：咖啡豆 耶加雪菲 水洗 1kg"
              className="w-full rounded-lg border border-warm-sand bg-ivory px-3 py-2 focus:border-terracotta focus:outline-none"
            />
            <datalist id="common-expense-material-options">
              {materialOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-warm-charcoal">廠商</span>
            <input
              type="text"
              value={draftItem.vendor}
              list="common-expense-vendor-options"
              onChange={(event) => handleChange("vendor", event.target.value)}
              placeholder="例：材料行名稱"
              className="w-full rounded-lg border border-warm-sand bg-ivory px-3 py-2 focus:border-terracotta focus:outline-none"
            />
            <datalist id="common-expense-vendor-options">
              {vendorOptions.map((vendor) => (
                <option key={vendor} value={vendor} />
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-warm-charcoal">價格</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={draftItem.amount}
              onChange={(event) => handleChange("amount", event.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-warm-sand bg-ivory px-3 py-2 focus:border-terracotta focus:outline-none"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-terracotta px-4 py-2 font-medium text-ivory transition-colors hover:bg-terracotta-dark xl:w-auto"
            >
              <Plus className="h-4 w-4" />
              {isSaving ? "儲存中" : "新增常用"}
            </button>
          </div>
        </div>
      </form>

      {isManagerOpen && (
        <CommonExpenseItemsManagerModal
          items={items}
          onClose={() => setIsManagerOpen(false)}
          isSaving={isSaving}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
        />
      )}
    </div>
  );
};

export default CommonExpenseItemsPanel;
