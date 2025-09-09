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
        <div className="text-sm text-gray-600">
          ${item.price} | Order: {item.order || "N/A"}
        </div>
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
  const [newCustomOptions, setNewCustomOptions] = useState([
    { type: "", options: [""] },
  ]);

  // 感應器設定（支援滑鼠和鍵盤）
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 取得所有類別
  const categories = Array.from(new Set(menuData.map((item) => item.category)));

  // 取得當前類別的產品並按 order 排序
  const currentCategoryItems = menuData
    .filter((item) => item.category === selectedCategory && item.name)
    .sort((a, b) => (a.order || 9999) - (b.order || 9999));

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

    // 重新排序
    const reorderedItems = arrayMove(currentCategoryItems, oldIndex, newIndex);

    // 更新所有商品的 order 值
    const updatedMenuData = [...menuData];
    reorderedItems.forEach((item, index) => {
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

    setMenuData(updatedMenuData);
  };

  // 編輯現有產品
  const handleEditProduct = () => {
    if (!selectedProduct) return;
    setMenuData(
      menuData.map((item) =>
        item.id === selectedProduct.id
          ? {
              ...item,
              name: editName,
              price: Number(editPrice),
              customOptions: editCustomOptions,
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

  // 新增產品
  const handleAddProduct = () => {
    if (!newProductName || !newProductPrice || !newProductCategory) return;

    // 計算新產品的 order 值（放在該類別最後）
    const categoryItems = menuData.filter(
      (item) => item.category === newProductCategory && item.name
    );
    const maxOrder =
      categoryItems.length > 0
        ? Math.max(...categoryItems.map((item) => item.order || 0))
        : 0;

    setMenuData([
      ...menuData,
      {
        id: Date.now().toString(),
        name: newProductName,
        price: Number(newProductPrice),
        category: newProductCategory,
        customOptions: newProductCustomOptions,
        order: maxOrder + 1,
      },
    ]);
    setNewProductName("");
    setNewProductPrice("");
    setNewProductCategory("");
    setNewProductCustomOptions([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">菜單編輯</h2>
        <button onClick={onBack} className="px-4 py-2 bg-gray-300 rounded">
          返回
        </button>
      </div>

      {/* 類別選擇 */}
      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <label className="font-medium mr-2">選擇類別：</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded px-2 py-1 mr-4"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="新增類別"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="ml-2 border rounded px-2 py-1"
        />
        <button
          onClick={() => {
            if (newCategory && !categories.includes(newCategory)) {
              setMenuData([
                ...menuData,
                {
                  id: Date.now().toString(),
                  name: "",
                  price: 0,
                  category: newCategory,
                  customOptions: [],
                  order: 1,
                },
              ]);
              setSelectedCategory(newCategory);
              setNewCategory("");
            }
          }}
          className="ml-2 px-2 py-1 bg-blue-500 text-white rounded"
        >
          新增類別
        </button>
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
                      setEditCustomOptions(item.customOptions || []);
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
          <div className="bg-white rounded-lg p-6 shadow-lg min-w-[400px] max-w-[600px] w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h4 className="font-bold mb-4 text-lg">編輯產品</h4>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="產品名稱"
              className="border rounded px-3 py-2 mb-3 w-full"
            />
            <input
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              placeholder="價格"
              className="border rounded px-3 py-2 mb-3 w-full"
            />
            <div className="mb-4">
              <label className="font-medium block mb-2">客製選項：</label>
              <input
                type="text"
                value={editCustomOptions.join(",")}
                onChange={(e) =>
                  setEditCustomOptions(
                    e.target.value.split(",").map((opt) => opt.trim())
                  )
                }
                placeholder="例如：少冰,無糖"
                className="border rounded px-3 py-2 w-full"
              />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <button
            onClick={handleAddProduct}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            新增商品
          </button>
        </div>

        {/* 客製選項 */}
        <div className="mt-4">
          <label className="font-medium block mb-2">客製選項：</label>
          {newCustomOptions.map((opt, idx) => (
            <div key={idx} className="flex mb-2 space-x-2">
              <input
                type="text"
                value={opt.type}
                onChange={(e) => {
                  const arr = [...newCustomOptions];
                  arr[idx].type = e.target.value;
                  setNewCustomOptions(arr);
                }}
                placeholder="選項類型（如：冰量）"
                className="border rounded px-3 py-2 flex-1"
              />
              <input
                type="text"
                value={opt.options.join(",")}
                onChange={(e) => {
                  const arr = [...newCustomOptions];
                  arr[idx].options = e.target.value
                    .split(",")
                    .map((s) => s.trim());
                  setNewCustomOptions(arr);
                }}
                placeholder="選項內容（如：正常冰,少冰,去冰）"
                className="border rounded px-3 py-2 flex-1"
              />
              <button
                onClick={() => {
                  setNewCustomOptions(
                    newCustomOptions.filter((_, i) => i !== idx)
                  );
                }}
                className="px-3 py-2 bg-red-400 text-white rounded hover:bg-red-500 transition-colors"
              >
                刪除
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setNewCustomOptions([
                ...newCustomOptions,
                { type: "", options: [""] },
              ])
            }
            className="mt-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
          >
            新增選項
          </button>
        </div>
      </div>

      {/* 使用說明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-bold text-blue-800 mb-2">🔧 使用說明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 點擊拖拉手柄（6個點圖案）來拖拉商品調整順序</li>
          <li>• 支援鍵盤操作：Tab 選擇商品，Space 開始拖拉，方向鍵移動</li>
          <li>• 新增的商品會自動放在該類別的最後面</li>
          <li>• 編輯商品不會影響順序</li>
          <li>• 小食類別中的「塑膠袋」會永遠顯示在最後</li>
        </ul>
      </div>
    </div>
  );
};

export default MenuEditorPage;
