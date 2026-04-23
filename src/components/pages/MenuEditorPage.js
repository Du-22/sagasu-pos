import React from "react";
import useMenuEditor from "../../hooks/useMenuEditor";
import CategoryManager from "./MenuEditorPage/CategoryManager";
import ProductList from "./MenuEditorPage/ProductList";
import EditProductModal from "./MenuEditorPage/EditProductModal";
import AddProductForm from "./MenuEditorPage/AddProductForm";

/**
 * MenuEditorPage
 *
 * 原始程式碼：MenuEditorPage.js（1024 行）
 * 功能效果：菜單編輯主頁面，整合類別管理、商品列表、編輯 Modal、新增表單
 * 用途：組合所有子組件，由 useMenuEditor Hook 管理狀態與業務邏輯
 * 組件長度：約 80 行
 */
const MenuEditorPage = ({ menuData, setMenuData, onBack }) => {
  const {
    selectedCategory, setSelectedCategory,
    selectedProduct, setSelectedProduct,
    editName, setEditName,
    editPrice, setEditPrice,
    editCustomOptions, setEditCustomOptions,
    newCategory, setNewCategory,
    newProductName, setNewProductName,
    newProductPrice, setNewProductPrice,
    newProductCategory, setNewProductCategory,
    newProductCustomOptions, setNewProductCustomOptions,
    sensors,
    categories,
    currentCategoryItems,
    handleDragEnd,
    handleOpenEdit,
    handleEditProduct,
    handleDeleteProduct,
    handleAddCategory,
    handleDeleteCategory,
    handleRenameCategory,
    handleAddProduct,
  } = useMenuEditor({ menuData, setMenuData });

  return (
    <div className="min-h-screen bg-parchment p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">菜單編輯 - 支援價格調整</h2>
        <button onClick={onBack} className="px-4 py-2 bg-gray-300 rounded">
          返回
        </button>
      </div>

      <CategoryManager
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        newCategory={newCategory}
        onNewCategoryChange={setNewCategory}
        onAddCategory={handleAddCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      <ProductList
        selectedCategory={selectedCategory}
        currentCategoryItems={currentCategoryItems}
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteProduct}
      />

      <EditProductModal
        selectedProduct={selectedProduct}
        editName={editName}
        editPrice={editPrice}
        editCustomOptions={editCustomOptions}
        onNameChange={setEditName}
        onPriceChange={setEditPrice}
        onCustomOptionsChange={setEditCustomOptions}
        onAddCustomOption={() =>
          setEditCustomOptions([...editCustomOptions, { type: "", options: [], priceAdjustments: {} }])
        }
        onDeleteCustomOption={(index) =>
          setEditCustomOptions(editCustomOptions.filter((_, i) => i !== index))
        }
        onSave={handleEditProduct}
        onCancel={() => setSelectedProduct(null)}
      />

      <AddProductForm
        categories={categories}
        newProductName={newProductName}
        newProductPrice={newProductPrice}
        newProductCategory={newProductCategory}
        newProductCustomOptions={newProductCustomOptions}
        onNameChange={setNewProductName}
        onPriceChange={setNewProductPrice}
        onCategoryChange={setNewProductCategory}
        onCustomOptionsChange={setNewProductCustomOptions}
        onAddCustomOption={() =>
          setNewProductCustomOptions([...newProductCustomOptions, { type: "", options: [], priceAdjustments: {} }])
        }
        onDeleteCustomOption={(index) =>
          setNewProductCustomOptions(newProductCustomOptions.filter((_, i) => i !== index))
        }
        onSubmit={handleAddProduct}
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-bold text-blue-800 mb-2">🔧 使用說明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 現在可以為每個客製選項設定價格調整了！</li>
          <li>• 設定步驟：填寫選項類型 → 填寫選項內容 → 點擊「新增價格調整」→ 選擇選項並設定金額</li>
          <li>• 正數表示加價，負數表示折扣，零或空白表示無價格調整</li>
          <li>• 價格調整會在點餐時即時顯示和計算</li>
          <li>• 拖拉商品可以調整菜單順序</li>
        </ul>
      </div>
    </div>
  );
};

export default MenuEditorPage;
