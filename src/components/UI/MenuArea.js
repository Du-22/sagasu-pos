import React, { useState } from "react";
import MenuCategories from "./MenuCategories";
import MenuItemButton from "./MenuItemButton";

const MenuArea = ({ menuData, onAddToOrder }) => {
  // 取得所有類別（不重複）
  const categories = Array.from(new Set(menuData.map((item) => item.category)));
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
