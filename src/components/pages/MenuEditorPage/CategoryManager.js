import React from "react";

/**
 * CategoryManager
 *
 * 原始程式碼：MenuEditorPage.js 行 700-817
 * 功能效果：類別下拉選單、重命名/刪除按鈕、新增類別輸入框，及說明提示
 * 用途：獨立類別管理 UI
 */
const CategoryManager = ({
  categories,
  selectedCategory,
  onCategoryChange,
  newCategory,
  onNewCategoryChange,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
}) => {
  return (
    <div className="mb-4 bg-ivory p-4 rounded-lg shadow">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center">
          <label className="font-medium mr-2">選擇類別：</label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="border rounded px-3 py-2"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRenameCategory(selectedCategory)}
            className="px-3 py-2 bg-warm-charcoal hover:bg-anthropic-black text-ivory rounded transition-colors text-sm font-medium flex items-center gap-1"
            title="重命名此類別"
          >
            ✏️ 重命名
          </button>
          <button
            onClick={() => onDeleteCategory(selectedCategory)}
            className="px-3 py-2 bg-error-warm hover:bg-error-warm text-ivory rounded transition-colors text-sm font-medium flex items-center gap-1"
            title="刪除此類別（兩層確認）"
          >
            🗑️ 刪除
          </button>
        </div>

        <div className="h-8 w-px bg-gray-300"></div>

        <div className="flex items-center">
          <input
            type="text"
            placeholder="新增類別名稱"
            value={newCategory}
            onChange={(e) => onNewCategoryChange(e.target.value)}
            className="border rounded px-3 py-2"
            onKeyPress={(e) => { if (e.key === "Enter") onAddCategory(); }}
          />
          <button
            onClick={onAddCategory}
            className="ml-2 px-3 py-2 bg-terracotta hover:bg-terracotta-dark text-ivory rounded transition-colors text-sm font-medium"
          >
            ➕ 新增類別
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-warm-charcoal bg-parchment p-3 rounded border border-terracotta-light">
        <div className="font-bold mb-2 text-sm">💡 類別管理說明</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-ivory p-2 rounded">
            <div className="font-bold text-terracotta mb-1">✏️ 重命名類別</div>
            <ul className="list-disc ml-4 space-y-0.5">
              <li>修改類別名稱</li>
              <li>自動更新所有產品</li>
              <li>不能使用重複名稱</li>
            </ul>
          </div>
          <div className="bg-ivory p-2 rounded">
            <div className="font-bold text-error-warm mb-1">🗑️ 刪除類別</div>
            <ul className="list-disc ml-4 space-y-0.5">
              <li>會同時刪除所有產品</li>
              <li>需要兩層確認防呆</li>
              <li>無法復原，請謹慎操作</li>
            </ul>
          </div>
          <div className="bg-ivory p-2 rounded">
            <div className="font-bold text-terracotta-dark mb-1">➕ 新增類別</div>
            <ul className="list-disc ml-4 space-y-0.5">
              <li>輸入名稱後點擊按鈕</li>
              <li>或按 Enter 快速新增</li>
              <li>會自動切換到新類別</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
