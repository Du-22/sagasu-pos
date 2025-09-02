import React, { useState } from "react";
import MenuCategories from "./MenuCategories";
import MenuItemButton from "./MenuItemButton";

const menuData = {
  義式: [
    { id: "espresso", name: "濃縮咖啡", price: 80 },
    { id: "americano", name: "美式咖啡", price: 120 },
    { id: "latte", name: "拿鐵咖啡", price: 150 },
    { id: "cappuccino", name: "卡布奇諾", price: 140 },
    { id: "mocha", name: "摩卡咖啡", price: 160 },
    { id: "macchiato", name: "瑪奇朵", price: 145 },
  ],
  手沖: [
    { id: "pour_over_1", name: "衣索比亞", price: 180 },
    { id: "pour_over_2", name: "哥倫比亞", price: 170 },
    { id: "pour_over_3", name: "瓜地馬拉", price: 175 },
    { id: "pour_over_4", name: "肯亞AA", price: 190 },
    { id: "pour_over_5", name: "巴西半日曬", price: 165 },
    { id: "pour_over_6", name: "巴拿馬藝伎", price: 250 },
  ],
  非咖啡: [
    { id: "black_tea", name: "紅茶", price: 90 },
    { id: "green_tea", name: "綠茶", price: 90 },
    { id: "milk_tea", name: "奶茶", price: 110 },
    { id: "hot_chocolate", name: "熱巧克力", price: 130 },
    { id: "fresh_juice", name: "鮮果汁", price: 120 },
    { id: "smoothie", name: "果昔", price: 140 },
  ],
  甜點: [
    { id: "cheesecake", name: "起司蛋糕", price: 150 },
    { id: "tiramisu", name: "提拉米蘇", price: 160 },
    { id: "brownie", name: "布朗尼", price: 120 },
    { id: "muffin", name: "馬芬", price: 100 },
    { id: "scone", name: "司康餅", price: 110 },
    { id: "croissant", name: "可頌", price: 85 },
  ],
  輕食: [
    { id: "sandwich_1", name: "火腿起司三明治", price: 180 },
    { id: "sandwich_2", name: "鮪魚沙拉三明治", price: 170 },
    { id: "bagel", name: "貝果", price: 120 },
    { id: "salad", name: "凱薩沙拉", price: 200 },
    { id: "pasta", name: "義大利麵", price: 240 },
    { id: "panini", name: "帕尼尼", price: 190 },
  ],
};

const MenuArea = ({ onAddToOrder }) => {
  const [activeCategory, setActiveCategory] = useState("義式");

  return (
    <div className="w-2/3 p-4">
      <div className="bg-white rounded-lg shadow-sm h-full">
        <MenuCategories
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        <div
          className="p-4 overflow-y-auto"
          style={{ height: "calc(100% - 60px)" }}
        >
          <div className="grid grid-cols-3 gap-3">
            {menuData[activeCategory].map((item) => (
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
