import React from "react";

/**
 * CustomOptionEditor
 *
 * 原始程式碼：MenuEditorPage.js 行 109-273
 * 功能效果：編輯單一客製選項（選項類型、選項內容、各選項的價格調整）
 * 用途：供 EditProductModal 和 AddProductForm 共用
 */
const CustomOptionEditor = ({ option, index, onChange, onDelete }) => {
  const addPriceAdjustment = () => {
    onChange({ ...option, priceAdjustments: { ...option.priceAdjustments, "": 0 } });
  };

  const updatePriceAdjustment = (optionValue, adjustment) => {
    onChange({
      ...option,
      priceAdjustments: {
        ...option.priceAdjustments,
        [optionValue]: parseFloat(adjustment) || 0,
      },
    });
  };

  const deletePriceAdjustment = (optionValue) => {
    const newAdjustments = { ...option.priceAdjustments };
    delete newAdjustments[optionValue];
    onChange({
      ...option,
      priceAdjustments: Object.keys(newAdjustments).length > 0 ? newAdjustments : {},
    });
  };

  return (
    <div className="border rounded-lg p-4 mb-4 bg-parchment">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-warm-dark">客製選項 #{index + 1}</h4>
        <button onClick={onDelete} className="text-error-warm hover:text-error-warm font-bold">
          ✕
        </button>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">選項類型：</label>
        <input
          type="text"
          value={option.type || ""}
          onChange={(e) => onChange({ ...option, type: e.target.value })}
          placeholder="例如：冰量、奶類、加料"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">選項內容：</label>
        <input
          type="text"
          value={(option.options || []).join(", ")}
          onChange={(e) => {
            const options = e.target.value.split(",").map((s) => s.trim()).filter((s) => s);
            onChange({ ...option, options });
          }}
          placeholder="例如：正常冰, 少冰, 去冰"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">價格調整設定：</label>
          <button
            onClick={addPriceAdjustment}
            className="text-sm bg-terracotta text-ivory px-2 py-1 rounded hover:bg-terracotta-dark"
          >
            ＋ 新增價格調整
          </button>
        </div>

        <div className="space-y-2">
          {option.priceAdjustments &&
            Object.entries(option.priceAdjustments).map(([optionValue, adjustment]) => (
              <div key={optionValue} className="flex items-center space-x-2 bg-ivory p-2 rounded border">
                <span className="text-sm text-warm-olive min-w-[60px]">當選擇</span>
                <select
                  value={optionValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    if (newValue !== optionValue) {
                      const newAdjustments = { ...option.priceAdjustments };
                      delete newAdjustments[optionValue];
                      newAdjustments[newValue] = adjustment;
                      onChange({ ...option, priceAdjustments: newAdjustments });
                    }
                  }}
                  className="border rounded px-2 py-1 text-sm flex-1"
                >
                  <option value="">請選擇選項</option>
                  {(option.options || []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <span className="text-sm text-warm-olive">價格</span>
                <input
                  type="number"
                  value={adjustment}
                  onChange={(e) => updatePriceAdjustment(optionValue, e.target.value)}
                  placeholder="0"
                  className="border rounded px-2 py-1 text-sm w-20"
                  step="1"
                />
                <span className="text-sm text-warm-olive">元</span>
                <button
                  onClick={() => deletePriceAdjustment(optionValue)}
                  className="text-error-warm hover:text-error-warm text-sm px-2"
                >
                  刪除
                </button>
              </div>
            ))}
        </div>

        {(!option.priceAdjustments || Object.keys(option.priceAdjustments).length === 0) && (
          <div className="text-sm text-warm-stone italic bg-ivory p-3 rounded border">
            尚未設定價格調整。點擊「新增價格調整」來設定某些選項的加價或折扣。
          </div>
        )}
      </div>

      <div className="text-xs text-warm-stone bg-parchment p-2 rounded">
        💡 價格調整說明：
        <ul className="mt-1 ml-4 list-disc">
          <li>正數表示加價（例如：+10 表示加價10元）</li>
          <li>負數表示折扣（例如：-20 表示折扣20元）</li>
          <li>0 或空白表示不調整價格</li>
        </ul>
      </div>
    </div>
  );
};

export default CustomOptionEditor;
