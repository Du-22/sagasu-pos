import React from "react";
import CustomOptionEditor from "./CustomOptionEditor";

/**
 * EditProductModal
 *
 * 原始程式碼：MenuEditorPage.js 行 873-937
 * 功能效果：編輯商品名稱、價格、客製選項的 Modal
 * 用途：獨立編輯 Modal UI
 */
const EditProductModal = ({
  selectedProduct,
  editName,
  editPrice,
  editCustomOptions,
  onNameChange,
  onPriceChange,
  onCustomOptionsChange,
  onAddCustomOption,
  onDeleteCustomOption,
  onSave,
  onCancel,
}) => {
  if (!selectedProduct) return null;

  const updateOption = (index, newOption) => {
    const updated = [...editCustomOptions];
    updated[index] = newOption;
    onCustomOptionsChange(updated);
  };

  const deleteOption = (index) => {
    onDeleteCustomOption(index);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-lg min-w-[600px] max-w-[800px] w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h4 className="font-bold mb-4 text-lg">編輯產品</h4>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            value={editName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="產品名稱"
            className="border rounded px-3 py-2"
          />
          <input
            type="number"
            value={editPrice}
            onChange={(e) => onPriceChange(e.target.value)}
            placeholder="價格"
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <label className="font-medium">客製選項：</label>
            <button
              onClick={onAddCustomOption}
              className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
            >
              ＋ 新增客製選項
            </button>
          </div>
          {editCustomOptions.map((option, index) => (
            <CustomOptionEditor
              key={index}
              option={option}
              index={index}
              onChange={(newOption) => updateOption(index, newOption)}
              onDelete={() => deleteOption(index)}
            />
          ))}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            儲存
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProductModal;
