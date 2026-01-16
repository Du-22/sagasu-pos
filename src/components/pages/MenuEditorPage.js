import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// 可排序的商品組件
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
        isDragging
          ? "bg-white shadow-lg scale-105 z-10"
          : "bg-gray-50 hover:bg-gray-100"
      }`}
    >
      {/* 拖拉手柄 */}
      <div
        {...listeners}
        className="flex items-center mr-3 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-200 transition-colors"
        title="拖拉調整順序"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className="text-gray-400"
        >
          <circle cx="9" cy="6" r="1" fill="currentColor" />
          <circle cx="15" cy="6" r="1" fill="currentColor" />
          <circle cx="9" cy="12" r="1" fill="currentColor" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
          <circle cx="9" cy="18" r="1" fill="currentColor" />
          <circle cx="15" cy="18" r="1" fill="currentColor" />
        </svg>
      </div>

      {/* 順序編號 */}
      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
        {index + 1}
      </div>

      {/* 商品資訊 */}
      <div className="flex-1">
        <div className="font-medium">{item.name}</div>
        <div className="text-sm text-gray-600">${item.price}</div>
        {/* 顯示價格調整選項 */}
        {item.customOptions &&
          item.customOptions.some(
            (opt) =>
              opt.priceAdjustments &&
              Object.keys(opt.priceAdjustments).length > 0
          ) && (
            <div className="text-xs text-green-600 mt-1">💰 含價格調整選項</div>
          )}
      </div>

      {/* 操作按鈕 */}
      <div className="flex space-x-2">
        <button
          onClick={() => onEdit(item)}
          className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 rounded text-sm transition-colors"
        >
          編輯
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="px-3 py-1 bg-red-400 hover:bg-red-500 text-white rounded text-sm transition-colors"
        >
          刪除
        </button>
      </div>
    </div>
  );
};

// 客製選項編輯組件
const CustomOptionEditor = ({ option, index, onChange, onDelete }) => {
  const addPriceAdjustment = () => {
    const newOption = {
      ...option,
      priceAdjustments: {
        ...option.priceAdjustments,
        "": 0,
      },
    };
    onChange(newOption);
  };

  const updatePriceAdjustment = (optionValue, adjustment) => {
    const newOption = {
      ...option,
      priceAdjustments: {
        ...option.priceAdjustments,
        [optionValue]: parseFloat(adjustment) || 0,
      },
    };
    onChange(newOption);
  };

  const deletePriceAdjustment = (optionValue) => {
    const newAdjustments = { ...option.priceAdjustments };
    delete newAdjustments[optionValue];
    const newOption = {
      ...option,
      priceAdjustments:
        Object.keys(newAdjustments).length > 0 ? newAdjustments : {},
    };
    onChange(newOption);
  };

  return (
    <div className="border rounded-lg p-4 mb-4 bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-gray-800">客製選項 #{index + 1}</h4>
        <button
          onClick={onDelete}
          className="text-red-500 hover:text-red-700 font-bold"
        >
          ✕
        </button>
      </div>

      {/* 選項類型 */}
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

      {/* 選項內容 */}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">選項內容：</label>
        <input
          type="text"
          value={(option.options || []).join(", ")}
          onChange={(e) => {
            const options = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s);
            onChange({ ...option, options });
          }}
          placeholder="例如：正常冰, 少冰, 去冰"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* 價格調整設定 */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">價格調整設定：</label>
          <button
            onClick={addPriceAdjustment}
            className="text-sm bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
          >
            ＋ 新增價格調整
          </button>
        </div>

        <div className="space-y-2">
          {option.priceAdjustments &&
            Object.entries(option.priceAdjustments).map(
              ([optionValue, adjustment]) => (
                <div
                  key={optionValue}
                  className="flex items-center space-x-2 bg-white p-2 rounded border"
                >
                  <span className="text-sm text-gray-600 min-w-[60px]">
                    當選擇
                  </span>
                  <select
                    value={optionValue}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (newValue !== optionValue) {
                        const newAdjustments = { ...option.priceAdjustments };
                        delete newAdjustments[optionValue];
                        newAdjustments[newValue] = adjustment;
                        onChange({
                          ...option,
                          priceAdjustments: newAdjustments,
                        });
                      }
                    }}
                    className="border rounded px-2 py-1 text-sm flex-1"
                  >
                    <option value="">請選擇選項</option>
                    {(option.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-600">價格</span>
                  <input
                    type="number"
                    value={adjustment}
                    onChange={(e) =>
                      updatePriceAdjustment(optionValue, e.target.value)
                    }
                    placeholder="0"
                    className="border rounded px-2 py-1 text-sm w-20"
                    step="1"
                  />
                  <span className="text-sm text-gray-600">元</span>
                  <button
                    onClick={() => deletePriceAdjustment(optionValue)}
                    className="text-red-500 hover:text-red-700 text-sm px-2"
                  >
                    刪除
                  </button>
                </div>
              )
            )}
        </div>

        {(!option.priceAdjustments ||
          Object.keys(option.priceAdjustments).length === 0) && (
          <div className="text-sm text-gray-500 italic bg-white p-3 rounded border">
            尚未設定價格調整。點擊「新增價格調整」來設定某些選項的加價或折扣。
          </div>
        )}
      </div>

      {/* 說明文字 */}
      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
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

const MenuEditorPage = ({ menuData, setMenuData, onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState(
    menuData[0]?.category || ""
  );
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCustomOptions, setEditCustomOptions] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductCustomOptions, setNewProductCustomOptions] = useState([]);

  // 感應器設定（支援滑鼠和鍵盤）
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 取得所有類別
  const predefinedCategories = ["義式", "手沖", "非咖啡", "小食"];
  const allCategories = Array.from(
    new Set(menuData.map((item) => item.category))
  );
  const newCategories = allCategories.filter(
    (cat) => !predefinedCategories.includes(cat)
  );
  const categories = [...predefinedCategories, ...newCategories];

  // 取得當前類別的產品並按 order 排序
  const currentCategoryItems = menuData
    .filter((item) => item.category === selectedCategory && item.name)
    .sort((a, b) => {
      // 🔥 特殊處理：塑膠袋永遠在最後
      if (a.name === "塑膠袋") return 1;
      if (b.name === "塑膠袋") return -1;

      // 其他商品按 order 排序
      return (a.order || 0) - (b.order || 0);
    });

  // 處理拖拉結束
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = currentCategoryItems.findIndex(
      (item) => item.id === active.id
    );
    const newIndex = currentCategoryItems.findIndex(
      (item) => item.id === over.id
    );

    // 重新排序當前類別的商品
    const reorderedItems = arrayMove(currentCategoryItems, oldIndex, newIndex);

    // 🔥 新邏輯：只更新當前類別內的 order，從 1 開始重新編號
    const updatedMenuData = [...menuData];

    reorderedItems.forEach((item, index) => {
      const menuIndex = updatedMenuData.findIndex(
        (menuItem) => menuItem.id === item.id
      );
      if (menuIndex !== -1) {
        // 🔥 特殊處理：塑膠袋永遠保持 order: 999
        if (item.name === "塑膠袋") {
          updatedMenuData[menuIndex] = {
            ...updatedMenuData[menuIndex],
            order: 999,
          };
        } else {
          updatedMenuData[menuIndex] = {
            ...updatedMenuData[menuIndex],
            order: index + 1, // 🔥 從 1 開始重新編號
          };
        }
      }
    });

    // 🔥 如果有塑膠袋被拖動，需要重新調整其他商品的 order
    if (selectedCategory === "小食") {
      const plasticBagItem = reorderedItems.find(
        (item) => item.name === "塑膠袋"
      );
      if (plasticBagItem) {
        // 將塑膠袋以外的商品重新編號
        const nonPlasticBagItems = reorderedItems.filter(
          (item) => item.name !== "塑膠袋"
        );
        nonPlasticBagItems.forEach((item, index) => {
          const menuIndex = updatedMenuData.findIndex(
            (menuItem) => menuItem.id === item.id
          );
          if (menuIndex !== -1) {
            updatedMenuData[menuIndex] = {
              ...updatedMenuData[menuIndex],
              order: index + 1,
            };
          }
        });
      }
    }

    setMenuData(updatedMenuData);
  };

  // 編輯現有產品
  const handleEditProduct = () => {
    if (!selectedProduct) return;

    // 確保 customOptions 有正確的格式
    const processedCustomOptions = editCustomOptions.map((option) => ({
      type: option.type || "",
      options: Array.isArray(option.options) ? option.options : [],
      priceAdjustments: option.priceAdjustments || {},
    }));

    setMenuData(
      menuData.map((item) =>
        item.id === selectedProduct.id
          ? {
              ...item,
              name: editName,
              price: Number(editPrice),
              customOptions: processedCustomOptions,
              category: selectedCategory,
            }
          : item
      )
    );
    setSelectedProduct(null);
  };

  // 刪除產品
  const handleDeleteProduct = (id) => {
    setMenuData(menuData.filter((item) => item.id !== id));
    setSelectedProduct(null);
  };

  //刪除類別
  /**
   * 刪除類別功能 - 兩層防呆確認
   *
   * @param {string} categoryToDelete - 要刪除的類別名稱
   *
   * @description
   * 連同類別下的所有產品一起刪除，並提供兩層確認防呆
   *
   * @安全機制
   * 1. 第一層確認：提示將刪除的產品數量
   * 2. 第二層確認：要求用戶輸入類別名稱確認
   * 3. 刪除後自動切換到第一個可用的類別
   */
  const handleDeleteCategory = (categoryToDelete) => {
    // 計算該類別下的產品數量
    const itemsInCategory = menuData.filter(
      (item) => item.category === categoryToDelete
    );

    // 第一層防呆：確認是否要刪除
    const firstConfirm = window.confirm(
      `⚠️ 警告：即將刪除類別\n\n` +
        `類別名稱：「${categoryToDelete}」\n` +
        `產品數量：${itemsInCategory.length} 個\n\n` +
        `此操作將同時刪除該類別下的所有產品！\n` +
        `此操作無法復原！\n\n` +
        `確定要繼續嗎？`
    );

    if (!firstConfirm) {
      return;
    }

    // 第二層防呆：要求輸入類別名稱確認
    const userInput = window.prompt(
      `🔒 二次確認\n\n` +
        `為了防止誤刪，請輸入要刪除的類別名稱：\n\n` +
        `「${categoryToDelete}」\n\n` +
        `(請完整輸入類別名稱)`
    );

    // 檢查輸入是否正確
    if (userInput !== categoryToDelete) {
      if (userInput !== null) {
        // 用戶有輸入但輸入錯誤
        alert(
          `❌ 輸入錯誤\n\n` +
            `您輸入的是：「${userInput}」\n` +
            `正確的類別名稱是：「${categoryToDelete}」\n\n` +
            `刪除已取消。`
        );
      }
      // 用戶點擊取消或輸入錯誤，都不執行刪除
      return;
    }

    // 通過兩層確認，執行刪除
    const updatedMenuData = menuData.filter(
      (item) => item.category !== categoryToDelete
    );

    setMenuData(updatedMenuData);

    // 切換到第一個可用的類別
    const remainingCategories = Array.from(
      new Set(updatedMenuData.map((item) => item.category))
    );

    if (remainingCategories.length > 0) {
      setSelectedCategory(remainingCategories[0]);
    } else {
      setSelectedCategory("");
    }

    // 成功提示
    alert(
      `✅ 刪除成功\n\n已刪除類別「${categoryToDelete}」及其下的 ${itemsInCategory.length} 個產品。`
    );
  };

  //重新命名類別
  /**
   * 重命名類別功能
   *
   * @param {string} oldCategoryName - 原類別名稱
   *
   * @description
   * 修改類別名稱，會同步更新該類別下所有產品的類別
   *
   * @驗證規則
   * 1. 新名稱不能為空
   * 2. 新名稱不能與現有類別重複
   * 3. 新名稱不能與原名稱相同
   */
  const handleRenameCategory = (oldCategoryName) => {
    // 取得新的類別名稱
    const newCategoryName = window.prompt(
      `✏️ 重命名類別\n\n` +
        `目前類別名稱：「${oldCategoryName}」\n\n` +
        `請輸入新的類別名稱：`,
      oldCategoryName
    );

    // 用戶取消或輸入為空
    if (!newCategoryName || newCategoryName.trim() === "") {
      return;
    }

    const trimmedNewName = newCategoryName.trim();

    // 檢查是否與原名稱相同
    if (trimmedNewName === oldCategoryName) {
      alert("❌ 新名稱與原名稱相同，無需修改。");
      return;
    }

    // 檢查新名稱是否已存在
    const existingCategories = Array.from(
      new Set(menuData.map((item) => item.category))
    );

    if (existingCategories.includes(trimmedNewName)) {
      alert(
        `❌ 類別名稱重複\n\n` +
          `類別「${trimmedNewName}」已經存在。\n` +
          `請使用其他名稱。`
      );
      return;
    }

    // 確認重命名
    const confirm = window.confirm(
      `確定要將類別名稱修改嗎？\n\n` +
        `原名稱：「${oldCategoryName}」\n` +
        `新名稱：「${trimmedNewName}」\n\n` +
        `此操作會同步更新該類別下所有產品的類別。`
    );

    if (!confirm) {
      return;
    }

    // 執行重命名：更新所有屬於該類別的產品
    const updatedMenuData = menuData.map((item) =>
      item.category === oldCategoryName
        ? { ...item, category: trimmedNewName }
        : item
    );

    setMenuData(updatedMenuData);
    setSelectedCategory(trimmedNewName);

    // 成功提示
    alert(
      `✅ 重命名成功\n\n類別「${oldCategoryName}」已改名為「${trimmedNewName}」。`
    );
  };

  // 新增產品
  const handleAddProduct = () => {
    if (!newProductName || !newProductPrice || !newProductCategory) return;

    // 🔥 新邏輯：只計算同類別內的最大 order
    const categoryItems = menuData.filter(
      (item) => item.category === newProductCategory && item.name
    );

    let maxOrder = 0;

    if (categoryItems.length > 0) {
      // 🔥 特殊處理：如果是小食類別，排除塑膠袋(order: 999)
      if (newProductCategory === "小食") {
        const nonPlasticBagItems = categoryItems.filter(
          (item) => item.name !== "塑膠袋"
        );
        maxOrder =
          nonPlasticBagItems.length > 0
            ? Math.max(...nonPlasticBagItems.map((item) => item.order || 0))
            : 0;
      } else {
        maxOrder = Math.max(...categoryItems.map((item) => item.order || 0));
      }
    }

    // 🔥 新產品的 order = 同類別最大 order + 1
    const newOrder = maxOrder + 1;

    const processedCustomOptions = newProductCustomOptions.map((option) => ({
      type: option.type || "",
      options: Array.isArray(option.options) ? option.options : [],
      priceAdjustments: option.priceAdjustments || {},
    }));

    setMenuData([
      ...menuData,
      {
        id: Date.now().toString(),
        name: newProductName,
        price: Number(newProductPrice),
        category: newProductCategory,
        customOptions: processedCustomOptions,
        order: newOrder, // 🔥 使用新的 order 邏輯
      },
    ]);

    setNewProductName("");
    setNewProductPrice("");
    setNewProductCategory("");
    setNewProductCustomOptions([]);
  };

  // 新增客製選項
  const addNewCustomOption = () => {
    setNewProductCustomOptions([
      ...newProductCustomOptions,
      { type: "", options: [], priceAdjustments: {} },
    ]);
  };

  // 更新客製選項
  const updateNewCustomOption = (index, newOption) => {
    const updated = [...newProductCustomOptions];
    updated[index] = newOption;
    setNewProductCustomOptions(updated);
  };

  // 刪除客製選項
  const deleteNewCustomOption = (index) => {
    setNewProductCustomOptions(
      newProductCustomOptions.filter((_, i) => i !== index)
    );
  };

  // 編輯時的客製選項處理
  const updateEditCustomOption = (index, newOption) => {
    const updated = [...editCustomOptions];
    updated[index] = newOption;
    setEditCustomOptions(updated);
  };

  const deleteEditCustomOption = (index) => {
    setEditCustomOptions(editCustomOptions.filter((_, i) => i !== index));
  };

  const addEditCustomOption = () => {
    setEditCustomOptions([
      ...editCustomOptions,
      { type: "", options: [], priceAdjustments: {} },
    ]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">菜單編輯 - 支援價格調整</h2>
        <button onClick={onBack} className="px-4 py-2 bg-gray-300 rounded">
          返回
        </button>
      </div>

      {/* 類別選擇與管理 */}
      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-3 flex-wrap">
          {/* 類別選擇 */}
          <div className="flex items-center">
            <label className="font-medium mr-2">選擇類別：</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border rounded px-3 py-2"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 類別管理按鈕組 */}
          <div className="flex items-center gap-2">
            {/* 重命名按鈕 */}
            <button
              onClick={() => handleRenameCategory(selectedCategory)}
              className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors text-sm font-medium flex items-center gap-1"
              title="重命名此類別"
            >
              ✏️ 重命名
            </button>

            {/* 刪除按鈕 */}
            <button
              onClick={() => handleDeleteCategory(selectedCategory)}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors text-sm font-medium flex items-center gap-1"
              title="刪除此類別（兩層確認）"
            >
              🗑️ 刪除
            </button>
          </div>

          {/* 分隔線 */}
          <div className="h-8 w-px bg-gray-300"></div>

          {/* 新增類別 */}
          <div className="flex items-center">
            <input
              type="text"
              placeholder="新增類別名稱"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="border rounded px-3 py-2"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  // 按 Enter 也可以新增
                  document.querySelector("[data-add-category]").click();
                }
              }}
            />
            <button
              data-add-category
              onClick={() => {
                if (newCategory && !categories.includes(newCategory.trim())) {
                  const trimmedCategory = newCategory.trim();
                  setMenuData([
                    ...menuData,
                    {
                      id: Date.now().toString(),
                      name: "",
                      price: 0,
                      category: trimmedCategory,
                      customOptions: [],
                      order: 1,
                    },
                  ]);
                  setSelectedCategory(trimmedCategory);
                  setNewCategory("");
                } else if (categories.includes(newCategory.trim())) {
                  alert("❌ 此類別名稱已存在！");
                }
              }}
              className="ml-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors text-sm font-medium"
            >
              ➕ 新增類別
            </button>
          </div>
        </div>

        {/* 提示訊息 */}
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

      {/* 可拖拉的產品列表 */}
      <div className="mb-6 bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-bold flex items-center">
            <span className="mr-2">📋</span>
            產品列表 - {selectedCategory}
            <span className="ml-2 text-sm text-gray-500">(拖拉調整順序)</span>
          </h3>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="p-4 min-h-[200px]">
            {currentCategoryItems.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                此類別暫無商品
              </div>
            ) : (
              <SortableContext
                items={currentCategoryItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {currentCategoryItems.map((item, index) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    index={index}
                    onEdit={(item) => {
                      setSelectedProduct(item);
                      setEditName(item.name);
                      setEditPrice(item.price);
                      // 確保編輯時有正確的 customOptions 格式
                      setEditCustomOptions(
                        (item.customOptions || []).map((option) => ({
                          type: option.type || "",
                          options: Array.isArray(option.options)
                            ? option.options
                            : [],
                          priceAdjustments: option.priceAdjustments || {},
                        }))
                      );
                    }}
                    onDelete={handleDeleteProduct}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        </DndContext>
      </div>

      {/* 編輯產品 Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg min-w-[600px] max-w-[800px] w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h4 className="font-bold mb-4 text-lg">編輯產品</h4>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="產品名稱"
                className="border rounded px-3 py-2"
              />
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="價格"
                className="border rounded px-3 py-2"
              />
            </div>

            {/* 客製選項編輯 */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <label className="font-medium">客製選項：</label>
                <button
                  onClick={addEditCustomOption}
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
                  onChange={(newOption) =>
                    updateEditCustomOption(index, newOption)
                  }
                  onDelete={() => deleteEditCustomOption(index)}
                />
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleEditProduct}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                儲存
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增產品 */}
      <div className="mb-6 bg-white rounded-lg p-4 shadow">
        <h4 className="font-bold mb-4 flex items-center">
          <span className="mr-2">➕</span>
          新增產品
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            placeholder="產品名稱"
            className="border rounded px-3 py-2"
          />
          <input
            type="number"
            value={newProductPrice}
            onChange={(e) => setNewProductPrice(e.target.value)}
            placeholder="價格"
            className="border rounded px-3 py-2"
          />
          <select
            value={newProductCategory}
            onChange={(e) => setNewProductCategory(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">選擇類別</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* 新增產品的客製選項 */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <label className="font-medium">客製選項：</label>
            <button
              onClick={addNewCustomOption}
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
              onChange={(newOption) => updateNewCustomOption(index, newOption)}
              onDelete={() => deleteNewCustomOption(index)}
            />
          ))}
        </div>

        <button
          onClick={handleAddProduct}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          新增商品
        </button>
      </div>

      {/* 使用說明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-bold text-blue-800 mb-2">🔧 使用說明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 現在可以為每個客製選項設定價格調整了！</li>
          <li>
            • 設定步驟：填寫選項類型 → 填寫選項內容 → 點擊「新增價格調整」→
            選擇選項並設定金額
          </li>
          <li>• 正數表示加價，負數表示折扣，零或空白表示無價格調整</li>
          <li>• 價格調整會在點餐時即時顯示和計算</li>
          <li>• 拖拉商品可以調整菜單順序</li>
        </ul>
      </div>
    </div>
  );
};

export default MenuEditorPage;
