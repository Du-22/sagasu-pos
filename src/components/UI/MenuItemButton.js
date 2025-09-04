import React, { useState } from "react";

const MenuItemButton = ({ item, onAddToOrder }) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedCustom, setSelectedCustom] = useState({});

  // 點擊按鈕時
  const handleClick = () => {
    console.log(item.customOptions); // 應該要印出陣列
    if (item.customOptions && item.customOptions.length > 0) {
      setShowCustomModal(true);
    } else {
      onAddToOrder(item);
    }
  };

  // 確認客製選項
  const handleConfirmCustom = () => {
    onAddToOrder({ ...item, selectedCustom });
    setShowCustomModal(false);
    setSelectedCustom({});
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors min-h-[80px]"
      >
        <div className="text-sm font-medium">{item.name}</div>
        <div className="text-sm text-gray-600 mt-1">${item.price}</div>
      </button>

      {/* 客製選項 Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg min-w-[300px]">
            <h2 className="text-lg font-bold mb-4">客製選項</h2>
            {item.customOptions.map((opt) => (
              <div key={opt.type} className="mb-2">
                <label className="font-medium mr-2">{opt.type}：</label>
                <select
                  value={selectedCustom[opt.type] || ""}
                  onChange={(e) =>
                    setSelectedCustom({
                      ...selectedCustom,
                      [opt.type]: e.target.value,
                    })
                  }
                  className="border rounded px-2 py-1"
                >
                  <option value="">請選擇</option>
                  {opt.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="flex space-x-2 mt-4">
              <button
                onClick={handleConfirmCustom}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                確定
              </button>
              <button
                onClick={() => setShowCustomModal(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuItemButton;
