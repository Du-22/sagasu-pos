import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import CommonExpenseItemsPanel from "./CommonExpenseItemsPanel";
import VendorFilterChips from "./VendorFilterChips";

const formatCurrency = (amount) => `$${amount.toLocaleString("zh-TW")}`;

const initialFormState = {
  date: "",
  name: "",
  vendor: "",
  amount: "",
};

/**
 * ExpenseRecordsPage
 *
 * 功能效果：v0 支出紀錄頁，只紀錄日期、名稱、廠商、金額與本期總額
 * 使用範例：<ExpenseRecordsPage expenseRecords={records} onAddRecord={addRecord} />
 */
const ExpenseRecordsPage = ({
  selectedDate,
  dateRangeText,
  expenseRecords,
  archivedExpenseTotal = 0,
  archivedExpenseCount = 0,
  hasArchivedSummaries = false,
  vendorOptions,
  materialOptions,
  commonVendorOptions,
  commonExpenseItems,
  isSaving = false,
  onAddRecord,
  onDeleteRecord,
  onAddCommonItem,
  onUpdateCommonItem,
  onDeleteCommonItem,
}) => {
  const [activeVendor, setActiveVendor] = useState("all");
  const [formData, setFormData] = useState({
    ...initialFormState,
    date: selectedDate,
  });

  useEffect(() => {
    setFormData((currentData) => ({
      ...currentData,
      date: selectedDate,
    }));
  }, [selectedDate]);

  useEffect(() => {
    if (activeVendor !== "all" && !vendorOptions.includes(activeVendor)) {
      setActiveVendor("all");
    }
  }, [activeVendor, vendorOptions]);

  const visibleExpenseRecords = useMemo(() => {
    if (activeVendor === "all") return expenseRecords;
    return expenseRecords.filter((record) => record.vendor === activeVendor);
  }, [activeVendor, expenseRecords]);

  const visibleExpenseTotal = visibleExpenseRecords.reduce(
    (sum, record) => sum + record.amount,
    0,
  );
  const displayedExpenseTotal =
    activeVendor === "all"
      ? visibleExpenseTotal + archivedExpenseTotal
      : visibleExpenseTotal;
  const displayedExpenseCount =
    activeVendor === "all"
      ? visibleExpenseRecords.length + archivedExpenseCount
      : visibleExpenseRecords.length;

  const handleChange = (field, value) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  };

  const handleSelectCommonItem = (item) => {
    setFormData({
      date: selectedDate,
      name: item.name,
      vendor: item.vendor,
      amount: String(item.amount),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const amount = Number(formData.amount);
    if (!formData.date || !formData.name.trim() || !formData.vendor.trim() || amount <= 0) {
      window.alert("請填寫日期、名稱、廠商與大於 0 的金額");
      return;
    }

    try {
      await onAddRecord({
        date: formData.date,
        name: formData.name.trim(),
        vendor: formData.vendor.trim(),
        amount,
      });

      setFormData({
        ...initialFormState,
        date: formData.date,
      });
    } catch (error) {
      console.error("新增支出紀錄失敗:", error);
      window.alert("新增支出紀錄失敗，請檢查網路後再試");
    }
  };

  const handleDeleteRecord = async (recordId) => {
    const confirmed = window.confirm("這筆支出紀錄會從 Firebase 刪除，確定刪除嗎？");
    if (!confirmed) return;

    try {
      await onDeleteRecord(recordId);
    } catch (error) {
      console.error("刪除支出紀錄失敗:", error);
      window.alert("刪除支出紀錄失敗，請檢查網路後再試");
    }
  };

  return (
    <div className="space-y-4">
      <CommonExpenseItemsPanel
        items={commonExpenseItems}
        materialOptions={materialOptions}
        vendorOptions={commonVendorOptions}
        onSelectItem={handleSelectCommonItem}
        isSaving={isSaving}
        onAddItem={onAddCommonItem}
        onUpdateItem={onUpdateCommonItem}
        onDeleteItem={onDeleteCommonItem}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={handleSubmit} className="bg-ivory rounded-lg p-4 shadow-whisper">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-anthropic-black">新增支出紀錄</h2>
              <p className="text-sm text-warm-olive">
                點選常用原材料會自動帶入，仍可手動微調。
              </p>
            </div>
            <div className="text-sm text-warm-stone">期間: {dateRangeText}</div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[150px_minmax(280px,1fr)_220px_150px_auto]">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-warm-charcoal">日期</span>
              <input
                type="date"
                value={formData.date}
                onChange={(event) => handleChange("date", event.target.value)}
                className="w-full rounded-lg border border-warm-sand bg-ivory px-3 py-2 focus:border-terracotta focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-warm-charcoal">名稱</span>
              <input
                type="text"
                value={formData.name}
                list="expense-material-options"
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="例：咖啡豆 耶加雪菲 水洗 1kg"
                className="w-full rounded-lg border border-warm-sand bg-ivory px-3 py-2 focus:border-terracotta focus:outline-none"
              />
              <datalist id="expense-material-options">
                {materialOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-warm-charcoal">廠商</span>
              <input
                type="text"
                value={formData.vendor}
                list="expense-vendor-options"
                onChange={(event) => handleChange("vendor", event.target.value)}
                placeholder="例：材料行名稱"
                className="w-full rounded-lg border border-warm-sand bg-ivory px-3 py-2 focus:border-terracotta focus:outline-none"
              />
              <datalist id="expense-vendor-options">
                {vendorOptions.map((vendor) => (
                  <option key={vendor} value={vendor} />
                ))}
              </datalist>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-warm-charcoal">金額</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={formData.amount}
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
                {isSaving ? "儲存中" : "新增"}
              </button>
            </div>
          </div>
        </form>

        <div className="bg-ivory rounded-lg p-4 shadow-whisper">
          <div className="text-sm text-warm-olive">
            {activeVendor === "all" ? "本期支出總額" : `${activeVendor} 支出總額`}
          </div>
          <div className="mt-2 text-3xl font-bold text-error-warm">
            {formatCurrency(displayedExpenseTotal)}
          </div>
          <div className="mt-1 text-sm text-warm-stone">
            共 {displayedExpenseCount} 筆支出紀錄
          </div>
          {activeVendor === "all" && archivedExpenseCount > 0 && (
            <div className="mt-2 text-xs leading-5 text-warm-olive">
              其中 {archivedExpenseCount} 筆已整理進營業總覽。
            </div>
          )}
        </div>
      </div>

      <div className="bg-ivory rounded-lg p-4 shadow-whisper">
        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-anthropic-black">支出紀錄</h2>
            <span className="text-sm text-warm-olive">{dateRangeText}</span>
          </div>
          <VendorFilterChips
            vendors={vendorOptions}
            activeVendor={activeVendor}
            onVendorChange={setActiveVendor}
          />
        </div>

        {visibleExpenseRecords.length === 0 ? (
          <div className="rounded-lg border border-dashed border-warm-sand py-10 text-center text-warm-stone">
            {hasArchivedSummaries && activeVendor === "all"
              ? "這個期間的支出已整理成總覽，請以本期支出總額為準"
              : "這個期間尚無支出紀錄"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-warm-olive">
                  <th className="border-b border-warm-cream px-3 py-3 font-medium">日期</th>
                  <th className="border-b border-warm-cream px-3 py-3 font-medium">名稱</th>
                  <th className="border-b border-warm-cream px-3 py-3 font-medium">廠商</th>
                  <th className="border-b border-warm-cream px-3 py-3 text-right font-medium">金額</th>
                  <th className="border-b border-warm-cream px-3 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleExpenseRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-parchment">
                    <td className="border-b border-warm-cream px-3 py-3 text-warm-charcoal">
                      {record.date}
                    </td>
                    <td className="max-w-[420px] border-b border-warm-cream px-3 py-3 font-medium text-anthropic-black">
                      {record.name}
                    </td>
                    <td className="border-b border-warm-cream px-3 py-3 text-warm-charcoal">
                      {record.vendor}
                    </td>
                    <td className="border-b border-warm-cream px-3 py-3 text-right font-bold text-error-warm">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="border-b border-warm-cream px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(record.id)}
                        disabled={isSaving}
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2 py-1 text-sm text-error-warm transition-colors hover:bg-error-warm/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseRecordsPage;
