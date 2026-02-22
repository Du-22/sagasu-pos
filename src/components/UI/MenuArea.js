import React, { useState } from "react";
import MenuCategories from "./MenuCategories";
import MenuItemButton from "./MenuItemButton";

const MenuArea = ({ menuData, onAddToOrder }) => {
  // 定義類別順序
  // 往後新增的類別都會排在小食後面
  const CATEGORY_ORDER = ["義式", "手沖", "非咖啡", "小食"];

  // 取得所有類別（只選擇有產品的）
  const allCategories = Array.from(
    new Set(
      menuData
        .filter((item) => item.name) // ⭐ 只取有名稱的產品
        .map((item) => item.category),
    ),
  );

  // 按照預定義順序排列類別
  const categories = [
    ...CATEGORY_ORDER.filter((cat) => allCategories.includes(cat)),
    ...allCategories
      .filter((cat) => !CATEGORY_ORDER.includes(cat))
      .sort((a, b) => a.localeCompare(b, "zh-TW")),
  ];

  const [activeCategory, setActiveCategory] = useState(categories[0] || "");

  // 選擇目前類別的產品 + 使用 order 欄位排序
  const itemsInCategory = menuData
    .filter((item) => item.category === activeCategory && item.name)
    .sort((a, b) => {
      // 優先使用 order 欄位排序
      const aOrder = a.order || 9999;
      const bOrder = b.order || 9999;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      // 如果 order 相同，按名稱排序
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm h-full">
        {/* 類別選單 */}
        <MenuCategories
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        <div
          className="p-4 overflow-y-auto"
          style={{ height: "calc(100% - 60px)" }}
        >
          <div className="grid grid-cols-3 gap-3">
            {itemsInCategory.map((item) => (
              <MenuItemButton
                key={item.id}
                item={item}
                onAddToOrder={onAddToOrder}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuArea;
