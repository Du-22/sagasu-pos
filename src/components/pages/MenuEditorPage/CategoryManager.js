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
    <div className="mb-4 bg-white p-4 rounded-lg shadow">
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
            className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors text-sm font-medium flex items-center gap-1"
            title="重命名此類別"
          >
            ✏️ 重命名
          </button>
          <button
            onClick={() => onDeleteCategory(selectedCategory)}
            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors text-sm font-medium flex items-center gap-1"
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
            className="ml-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors text-sm font-medium"
          >
            ➕ 新增類別
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-700 bg-blue-50 p-3 rounded border border-blue-200">
        <div className="font-bold mb-2 text-sm">💡 類別管理說明</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white p-2 rounded">
            <div className="font-bold text-blue-600 mb-1">✏️ 重命名類別</div>
            <ul className="list-disc ml-4 space-y-0.5">
              <li>修改類別名稱</li>
              <li>自動更新所有產品</li>
              <li>不能使用重複名稱</li>
            </ul>
          </div>
          <div className="bg-white p-2 rounded">
            <div className="font-bold text-red-600 mb-1">🗑️ 刪除類別</div>
            <ul className="list-disc ml-4 space-y-0.5">
              <li>會同時刪除所有產品</li>
              <li>需要兩層確認防呆</li>
              <li>無法復原，請謹慎操作</li>
            </ul>
          </div>
          <div className="bg-white p-2 rounded">
            <div className="font-bold text-green-600 mb-1">➕ 新增類別</div>
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
