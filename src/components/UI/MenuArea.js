import React, { useState } from "react";
import MenuCategories from "./MenuCategories";
import MenuItemButton from "./MenuItemButton";

// menuData: 陣列，每個元素有 category/name/price/id/customOptions
const MenuArea = ({ menuData, onAddToOrder }) => {
  // 取得所有類別（不重複）
  const categories = Array.from(new Set(menuData.map((item) => item.category)));
  const [activeCategory, setActiveCategory] = useState(categories[0] || "");

  // 選擇目前類別的產品
  const itemsInCategory = menuData.filter(
    (item) => item.category === activeCategory && item.name
  );

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
