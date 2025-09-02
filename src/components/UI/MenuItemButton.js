import React from "react";

const MenuItemButton = ({ item, onAddToOrder }) => (
  <button
    onClick={() => onAddToOrder(item)}
    className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors min-h-[80px]"
  >
    <div className="text-sm font-medium">{item.name}</div>
    <div className="text-sm text-gray-600 mt-1">${item.price}</div>
  </button>
);

export default MenuItemButton;
