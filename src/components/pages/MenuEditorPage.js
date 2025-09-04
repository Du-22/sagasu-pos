import React, { useState } from "react";

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
    setMenuData([
      ...menuData,
      {
        id: Date.now().toString(),
        name: newProductName,
        price: Number(newProductPrice),
        category: newProductCategory,
        customOptions: newProductCustomOptions,
      },
    ]);
    setNewProductName("");
    setNewProductPrice("");
    setNewProductCategory("");
    setNewProductCustomOptions([]);
  };

  // 新增/編輯大類別
  const categories = Array.from(new Set(menuData.map((item) => item.category)));

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">菜單編輯</h2>
        <button onClick={onBack} className="px-4 py-2 bg-gray-300 rounded">
          返回
        </button>
      </div>

      {/* 類別選擇 */}
      <div className="mb-4">
        <label className="font-medium mr-2">選擇類別：</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded px-2 py-1"
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

      {/* 產品列表 */}
      <div className="mb-6">
        <h3 className="font-bold mb-2">產品列表</h3>
        <ul>
          {menuData
            .filter((item) => item.category === selectedCategory && item.name)
            .map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between py-1 border-b"
              >
                <span>
                  {item.name} (${item.price})
                </span>
                <div>
                  <button
                    onClick={() => {
                      setSelectedProduct(item);
                      setEditName(item.name);
                      setEditPrice(item.price);
                      setEditCustomOptions(item.customOptions || []);
                    }}
                    className="px-2 py-1 bg-yellow-400 rounded mr-2"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(item.id)}
                    className="px-2 py-1 bg-red-400 text-white rounded"
                  >
                    刪除
                  </button>
                </div>
              </li>
            ))}
        </ul>
      </div>

      {/* 編輯產品 */}
      {selectedProduct && (
        <div className="mb-6 bg-white rounded p-4 shadow">
          <h4 className="font-bold mb-2">編輯產品</h4>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="產品名稱"
            className="border rounded px-2 py-1 mb-2 w-full"
          />
          <input
            type="number"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            placeholder="價格"
            className="border rounded px-2 py-1 mb-2 w-full"
          />
          <div className="mb-2">
            <label className="font-medium">客製選項：</label>
            <input
              type="text"
              value={editCustomOptions.join(",")}
              onChange={(e) =>
                setEditCustomOptions(
                  e.target.value.split(",").map((opt) => opt.trim())
                )
              }
              placeholder="例如：少冰,無糖"
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <button
            onClick={handleEditProduct}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            儲存
          </button>
        </div>
      )}

      {/* 新增產品 */}
      <div className="mb-6 bg-white rounded p-4 shadow">
        <h4 className="font-bold mb-2">新增產品</h4>
        <input
          type="text"
          value={newProductName}
          onChange={(e) => setNewProductName(e.target.value)}
          placeholder="產品名稱"
          className="border rounded px-2 py-1 mb-2 w-full"
        />
        <input
          type="number"
          value={newProductPrice}
          onChange={(e) => setNewProductPrice(e.target.value)}
          placeholder="價格"
          className="border rounded px-2 py-1 mb-2 w-full"
        />
        <select
          value={newProductCategory}
          onChange={(e) => setNewProductCategory(e.target.value)}
          className="border rounded px-2 py-1 mb-2 w-full"
        >
          <option value="">選擇類別</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {/* 客製選項 */}
        <div className="mb-2">
          <label className="font-medium">客製選項：</label>
          {newCustomOptions.map((opt, idx) => (
            <div key={idx} className="flex mb-1">
              <input
                type="text"
                value={opt.type}
                onChange={(e) => {
                  const arr = [...newCustomOptions];
                  arr[idx].type = e.target.value;
                  setNewCustomOptions(arr);
                }}
                placeholder="選項類型（如：冰量）"
                className="border rounded px-2 py-1 mr-2"
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
                className="border rounded px-2 py-1"
              />
              <button
                onClick={() => {
                  setNewCustomOptions(
                    newCustomOptions.filter((_, i) => i !== idx)
                  );
                }}
                className="ml-2 px-2 py-1 bg-red-400 text-white rounded"
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
            className="mt-1 px-2 py-1 bg-blue-500 text-white rounded"
          >
            新增選項
          </button>
        </div>
        <button
          onClick={() => {
            if (!newProductName || !newProductPrice || !newProductCategory)
              return;
            setMenuData([
              ...menuData,
              {
                id: Date.now().toString(),
                name: newProductName,
                price: Number(newProductPrice),
                category: newProductCategory,
                customOptions: newCustomOptions.filter(
                  (opt) => opt.type && opt.options.length > 0
                ),
              },
            ]);
            setNewProductName("");
            setNewProductPrice("");
            setNewProductCategory("");
            setNewCustomOptions([{ type: "", options: [""] }]);
          }}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          新增
        </button>
      </div>
    </div>
  );
};

export default MenuEditorPage;
