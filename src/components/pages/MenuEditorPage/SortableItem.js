import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * SortableItem
 *
 * 原始程式碼：MenuEditorPage.js 行 20-106
 * 功能效果：可拖拉的商品列，顯示名稱/價格，提供編輯/刪除按鈕
 * 用途：供 ProductList 使用的可排序列表項目
 */
const SortableItem = ({ item, index, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex items-center justify-between p-3 mb-2 border rounded-lg transition-all ${
        isDragging ? "bg-ivory shadow-lg scale-105 z-10" : "bg-parchment hover:bg-parchment"
      }`}
    >
      {/* 拖拉手柄 */}
      <div
        {...listeners}
        className="flex items-center mr-3 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-warm-sand transition-colors"
        title="拖拉調整順序"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-warm-silver">
          <circle cx="9" cy="6" r="1" fill="currentColor" />
          <circle cx="15" cy="6" r="1" fill="currentColor" />
          <circle cx="9" cy="12" r="1" fill="currentColor" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
          <circle cx="9" cy="18" r="1" fill="currentColor" />
          <circle cx="15" cy="18" r="1" fill="currentColor" />
        </svg>
      </div>

      {/* 順序編號 */}
      <div className="w-8 h-8 bg-terracotta text-ivory rounded-full flex items-center justify-center text-sm font-bold mr-3">
        {index + 1}
      </div>

      {/* 商品資訊 */}
      <div className="flex-1">
        <div className="font-medium">{item.name}</div>
        <div className="text-sm text-warm-olive">${item.price}</div>
        {item.customOptions &&
          item.customOptions.some(
            (opt) => opt.priceAdjustments && Object.keys(opt.priceAdjustments).length > 0
          ) && (
            <div className="text-xs text-terracotta-dark mt-1">💰 含價格調整選項</div>
          )}
      </div>

      {/* 操作按鈕 */}
      <div className="flex space-x-2">
        <button
          onClick={() => onEdit(item)}
          className="px-3 py-1 bg-warm-olive hover:bg-warm-charcoal rounded text-sm transition-colors"
        >
          編輯
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="px-3 py-1 bg-error-warm/80 hover:bg-error-warm text-ivory rounded text-sm transition-colors"
        >
          刪除
        </button>
      </div>
    </div>
  );
};

export default SortableItem;
