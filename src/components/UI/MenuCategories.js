import React from "react";

/**
 * 菜單類別選單組件
 *
 * @component
 * @description
 * 動態顯示所有可用的菜單類別，並處理類別切換
 * 使用 CSS Grid 自動平分空間，無論幾個類別都會填滿整排
 *
 * @param {Object} props - 組件屬性
 * @param {string[]} props.categories - 類別陣列（從 menuData 動態獲取）
 * @param {string} props.activeCategory - 當前選中的類別
 * @param {Function} props.onCategoryChange - 類別切換回調函數
 *
 * @example
 * <MenuCategories
 *   categories={["義式", "手沖", "非咖啡", "小食", "甜點"]}
 *   activeCategory="義式"
 *   onCategoryChange={(cat) => console.log(cat)}
 * />
 *
 * @技術說明
 * - 使用 CSS Grid 的 grid-template-columns: repeat(n, 1fr)
 * - 每個類別自動獲得相等的列寬（1fr = 1 fraction）
 * - 2 個類別 → 每個 50%
 * - 5 個類別 → 每個 20%
 * - 10 個類別 → 每個 10%
 *
 * @修改記錄
 * - 移除硬編碼的 categories 陣列
 * - 改用 CSS Grid 取代 Flexbox
 * - 動態計算 grid-template-columns 實現完美填滿
 */
const MenuCategories = ({ categories, activeCategory, onCategoryChange }) => {
  // 動態生成 grid-template-columns
  // 例如：5 個類別 → "repeat(5, 1fr)"
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${categories.length}, 1fr)`,
  };

  return (
    <div style={gridStyle} className="border-b">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`
            py-3 px-4 text-center border-r last:border-r-0 font-medium transition-colors
            ${
              activeCategory === category
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }
          `}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default MenuCategories;
