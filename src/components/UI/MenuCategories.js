import React from "react";

const categories = ["義式", "手沖", "非咖啡", "甜點", "輕食"];

const MenuCategories = ({ activeCategory, onCategoryChange }) => (
  <div className="flex border-b">
    {categories.map((category) => (
      <button
        key={category}
        onClick={() => onCategoryChange(category)}
        className={`flex-1 py-3 px-4 text-center border-r last:border-r-0 font-medium ${
          activeCategory === category
            ? "bg-blue-500 text-white"
            : "bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        {category}
      </button>
    ))}
  </div>
);

export default MenuCategories;
