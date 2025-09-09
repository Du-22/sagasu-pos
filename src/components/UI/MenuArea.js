import React, { useState } from "react";
import MenuCategories from "./MenuCategories";
import MenuItemButton from "./MenuItemButton";

const MenuArea = ({ menuData, onAddToOrder }) => {
  // 取得所有類別（不重複）
  const categories = Array.from(new Set(menuData.map((item) => item.category)));
  const [activeCategory, setActiveCategory] = useState(categories[0] || "");

  // 選擇目前類別的產品 + 加入排序邏輯
  const itemsInCategory = menuData
    .filter((item) => item.category === activeCategory && item.name)
    .sort((a, b) => {
      // 特殊處理：塑膠袋永遠在最後
      if (a.id === "plastic_bag") return 1;
      if (b.id === "plastic_bag") return -1;

      // 定義各類別的預設商品順序（來自 defaultMenuData）
      const categoryOrders = {
        義式: [
          "espresso",
          "americano",
          "latte",
          "cappuccino",
          "Brown Sugar Latte",
          "1+1",
          "Lemon American",
          "Orange American",
          "Apple American",
          "shiso sparkling americano",
        ],
        手沖: [
          "pour_over_1",
          "pour_over_2",
          "pour_over_3",
          "pour_over_4",
          "pour_over_5",
          "pour_over_6",
        ],
        非咖啡: [
          "fresh_milk_tea",
          "apple_black_tea",
          "brown_sugar_milk",
          "matcha_milk",
          "sesame_milk",
          "shiso_plum_sparkling",
          "rooibos_tea",
          "chamomile_tea",
          "Gua Zi Rou Rice-apple_black_tea",
        ],
        小食: [
          "vanilla_bagel",
          "sesame_bagel",
          "salted_egg_yolk_bagel",
          "vanilla_cocotte",
          "cocotte",
          "dacquoise",
          "financier",
          "vanilla_hot_dog",
          "hot_dog",
          "egg_salad_sandwich",
          "Gua Zi Rou Rice",
          // 注意：這裡移除了 plastic_bag，因為它會被特殊處理放在最後
        ],
      };

      const idealOrder = categoryOrders[activeCategory] || [];

      // 獲取兩個商品在預設順序中的位置
      const aIndex = idealOrder.indexOf(a.id);
      const bIndex = idealOrder.indexOf(b.id);

      // 兩個都是預設商品：按預設順序排列
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // 一個是預設商品，一個是新增商品：預設商品在前
      if (aIndex !== -1 && bIndex === -1) return -1;
      if (aIndex === -1 && bIndex !== -1) return 1;

      // 兩個都是新增商品：按新增時間排序（ID 越大越新）
      // 假設新增商品的 ID 是時間戳，數字越大越新
      const aTimestamp = parseInt(a.id) || 0;
      const bTimestamp = parseInt(b.id) || 0;

      if (aTimestamp > 0 && bTimestamp > 0) {
        return aTimestamp - bTimestamp; // 先新增的在前
      }

      // 如果 ID 不是數字，按商品名稱排序
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
