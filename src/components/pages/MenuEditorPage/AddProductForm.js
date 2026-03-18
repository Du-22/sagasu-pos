import React from "react";
import CustomOptionEditor from "./CustomOptionEditor";

/**
 * AddProductForm
 *
 * 原始程式碼：MenuEditorPage.js 行 939-1003
 * 功能效果：新增商品的表單，包含名稱、價格、類別選擇，以及客製選項編輯
 * 用途：獨立新增商品 UI
 */
const AddProductForm = ({
  categories,
  newProductName,
  newProductPrice,
  newProductCategory,
  newProductCustomOptions,
  onNameChange,
  onPriceChange,
  onCategoryChange,
  onCustomOptionsChange,
  onAddCustomOption,
  onDeleteCustomOption,
  onSubmit,
}) => {
  const updateOption = (index, newOption) => {
    const updated = [...newProductCustomOptions];
    updated[index] = newOption;
    onCustomOptionsChange(updated);
  };

  return (
    <div className="mb-6 bg-white rounded-lg p-4 shadow">
      <h4 className="font-bold mb-4 flex items-center">
        <span className="mr-2">➕</span>
        新增產品
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input
          type="text"
          value={newProductName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="產品名稱"
          className="border rounded px-3 py-2"
        />
        <input
          type="number"
          value={newProductPrice}
          onChange={(e) => onPriceChange(e.target.value)}
          placeholder="價格"
          className="border rounded px-3 py-2"
        />
        <select
          value={newProductCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">選擇類別</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
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
        {newProductCustomOptions.map((option, index) => (
          <CustomOptionEditor
            key={index}
            option={option}
            index={index}
            onChange={(newOption) => updateOption(index, newOption)}
            onDelete={() => onDeleteCustomOption(index)}
          />
        ))}
      </div>

      <button
        onClick={onSubmit}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
      >
        新增商品
      </button>
    </div>
  );
};

export default AddProductForm;
