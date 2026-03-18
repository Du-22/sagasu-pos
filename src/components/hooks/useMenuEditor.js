import { useState } from "react";
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

/**
 * useMenuEditor Hook
 *
 * 原始程式碼：定義在 MenuEditorPage.js 的所有 state 與處理函數
 * 功能效果：管理菜單編輯的所有狀態，包含類別管理、商品 CRUD、拖拉排序
 * 用途：封裝 MenuEditorPage 的業務邏輯，讓主元件只負責 UI 組合
 * 組件長度：約 180 行
 */
const useMenuEditor = ({ menuData, setMenuData }) => {
  const [selectedCategory, setSelectedCategory] = useState(menuData[0]?.category || "");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCustomOptions, setEditCustomOptions] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductCustomOptions, setNewProductCustomOptions] = useState([]);

  // DnD 感應器設定
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 類別計算
  const predefinedCategories = ["義式", "手沖", "非咖啡", "小食"];
  const allCategories = Array.from(new Set(menuData.map((item) => item.category)));
  const newCategories = allCategories.filter((cat) => !predefinedCategories.includes(cat));
  const categories = [...predefinedCategories, ...newCategories];

  // 當前類別的商品（塑膠袋固定在最後）
  const currentCategoryItems = menuData
    .filter((item) => item.category === selectedCategory && item.name)
    .sort((a, b) => {
      if (a.name === "塑膠袋") return 1;
      if (b.name === "塑膠袋") return -1;
      return (a.order || 0) - (b.order || 0);
    });

  // 拖拉排序結束
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = currentCategoryItems.findIndex((item) => item.id === active.id);
    const newIndex = currentCategoryItems.findIndex((item) => item.id === over.id);
    const reorderedItems = arrayMove(currentCategoryItems, oldIndex, newIndex);

    const updatedMenuData = [...menuData];
    reorderedItems.forEach((item, index) => {
      const menuIndex = updatedMenuData.findIndex((m) => m.id === item.id);
      if (menuIndex !== -1) {
        updatedMenuData[menuIndex] = {
          ...updatedMenuData[menuIndex],
          order: item.name === "塑膠袋" ? 999 : index + 1,
        };
      }
    });

    // 小食類別：確保塑膠袋以外的商品編號正確
    if (selectedCategory === "小食") {
      const plasticBagItem = reorderedItems.find((item) => item.name === "塑膠袋");
      if (plasticBagItem) {
        reorderedItems
          .filter((item) => item.name !== "塑膠袋")
          .forEach((item, index) => {
            const menuIndex = updatedMenuData.findIndex((m) => m.id === item.id);
            if (menuIndex !== -1) {
              updatedMenuData[menuIndex] = { ...updatedMenuData[menuIndex], order: index + 1 };
            }
          });
      }
    }

    setMenuData(updatedMenuData);
  };

  // 開啟編輯 Modal
  const handleOpenEdit = (item) => {
    setSelectedProduct(item);
    setEditName(item.name);
    setEditPrice(item.price);
    setEditCustomOptions(
      (item.customOptions || []).map((opt) => ({
        type: opt.type || "",
        options: Array.isArray(opt.options) ? opt.options : [],
        priceAdjustments: opt.priceAdjustments || {},
      }))
    );
  };

  // 儲存編輯
  const handleEditProduct = () => {
    if (!selectedProduct) return;
    const processedCustomOptions = editCustomOptions.map((opt) => ({
      type: opt.type || "",
      options: Array.isArray(opt.options) ? opt.options : [],
      priceAdjustments: opt.priceAdjustments || {},
    }));
    setMenuData(
      menuData.map((item) =>
        item.id === selectedProduct.id
          ? { ...item, name: editName, price: Number(editPrice), customOptions: processedCustomOptions, category: selectedCategory }
          : item
      )
    );
    setSelectedProduct(null);
  };

  // 刪除商品
  const handleDeleteProduct = (id) => {
    const product = menuData.find((item) => item.id === id);
    if (!product) { alert("❌ 找不到該產品"); return; }
    const confirmed = window.confirm(
      `⚠️ 確定要刪除此產品嗎？\n\n產品名稱：「${product.name}」\n價格：$${product.price}\n類別：${product.category}\n\n此操作無法復原！`
    );
    if (!confirmed) return;
    setMenuData(menuData.filter((item) => item.id !== id));
    setSelectedProduct(null);
  };

  // 新增類別
  const handleAddCategory = () => {
    if (!newCategory || categories.includes(newCategory.trim())) {
      if (categories.includes(newCategory.trim())) alert("❌ 此類別名稱已存在！");
      return;
    }
    const trimmedCategory = newCategory.trim();
    setMenuData([
      ...menuData,
      { id: Date.now().toString(), name: "", price: 0, category: trimmedCategory, customOptions: [], order: 1 },
    ]);
    setSelectedCategory(trimmedCategory);
    setNewCategory("");
  };

  // 刪除類別（兩層防呆）
  const handleDeleteCategory = (categoryToDelete) => {
    const itemsInCategory = menuData.filter((item) => item.category === categoryToDelete);
    const firstConfirm = window.confirm(
      `⚠️ 警告：即將刪除類別\n\n類別名稱：「${categoryToDelete}」\n產品數量：${itemsInCategory.length} 個\n\n此操作將同時刪除該類別下的所有產品！\n此操作無法復原！\n\n確定要繼續嗎？`
    );
    if (!firstConfirm) return;

    const userInput = window.prompt(
      `🔒 二次確認\n\n為了防止誤刪，請輸入要刪除的類別名稱：\n\n「${categoryToDelete}」\n\n(請完整輸入類別名稱)`
    );
    if (userInput !== categoryToDelete) {
      if (userInput !== null) alert(`❌ 輸入錯誤\n\n您輸入的是：「${userInput}」\n正確的類別名稱是：「${categoryToDelete}」\n\n刪除已取消。`);
      return;
    }

    const updatedMenuData = menuData.filter((item) => item.category !== categoryToDelete);
    setMenuData(updatedMenuData);

    const remainingCategories = Array.from(new Set(updatedMenuData.map((item) => item.category)));
    setSelectedCategory(remainingCategories.length > 0 ? remainingCategories[0] : "");
    alert(`✅ 刪除成功\n\n已刪除類別「${categoryToDelete}」及其下的 ${itemsInCategory.length} 個產品。`);
  };

  // 重新命名類別
  const handleRenameCategory = (oldCategoryName) => {
    const newCategoryName = window.prompt(
      `✏️ 重命名類別\n\n目前類別名稱：「${oldCategoryName}」\n\n請輸入新的類別名稱：`,
      oldCategoryName
    );
    if (!newCategoryName || newCategoryName.trim() === "") return;
    const trimmedNewName = newCategoryName.trim();
    if (trimmedNewName === oldCategoryName) { alert("❌ 新名稱與原名稱相同，無需修改。"); return; }

    const existingCategories = Array.from(new Set(menuData.map((item) => item.category)));
    if (existingCategories.includes(trimmedNewName)) {
      alert(`❌ 類別名稱重複\n\n類別「${trimmedNewName}」已經存在。\n請使用其他名稱。`);
      return;
    }

    const confirmed = window.confirm(
      `確定要將類別名稱修改嗎？\n\n原名稱：「${oldCategoryName}」\n新名稱：「${trimmedNewName}」\n\n此操作會同步更新該類別下所有產品的類別。`
    );
    if (!confirmed) return;

    setMenuData(menuData.map((item) =>
      item.category === oldCategoryName ? { ...item, category: trimmedNewName } : item
    ));
    setSelectedCategory(trimmedNewName);
    alert(`✅ 重命名成功\n\n類別「${oldCategoryName}」已改名為「${trimmedNewName}」。`);
  };

  // 新增商品
  const handleAddProduct = () => {
    if (!newProductName || !newProductPrice || !newProductCategory) return;

    const categoryItems = menuData.filter(
      (item) => item.category === newProductCategory && item.name
    );
    let maxOrder = 0;
    if (categoryItems.length > 0) {
      const relevantItems = newProductCategory === "小食"
        ? categoryItems.filter((item) => item.name !== "塑膠袋")
        : categoryItems;
      maxOrder = relevantItems.length > 0
        ? Math.max(...relevantItems.map((item) => item.order || 0))
        : 0;
    }

    const processedCustomOptions = newProductCustomOptions.map((opt) => ({
      type: opt.type || "",
      options: Array.isArray(opt.options) ? opt.options : [],
      priceAdjustments: opt.priceAdjustments || {},
    }));

    setMenuData([
      ...menuData,
      {
        id: Date.now().toString(),
        name: newProductName,
        price: Number(newProductPrice),
        category: newProductCategory,
        customOptions: processedCustomOptions,
        order: maxOrder + 1,
      },
    ]);
    setNewProductName("");
    setNewProductPrice("");
    setNewProductCategory("");
    setNewProductCustomOptions([]);
  };

  return {
    // 狀態
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
    // 計算值
    sensors,
    categories,
    currentCategoryItems,
    // 處理函數
    handleDragEnd,
    handleOpenEdit,
    handleEditProduct,
    handleDeleteProduct,
    handleAddCategory,
    handleDeleteCategory,
    handleRenameCategory,
    handleAddProduct,
  };
};

export default useMenuEditor;
