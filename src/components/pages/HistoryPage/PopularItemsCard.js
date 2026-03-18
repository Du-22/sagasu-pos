import React from "react";

/**
 * PopularItemsCard
 *
 * 原始程式碼：HistoryPage.js 行 471-523
 * 功能效果：顯示熱門商品 TOP 5，含排名徽章、售出數量、營收
 * 用途：獨立熱門商品卡片 UI
 */
const PopularItemsCard = ({ popularItems, viewMode }) => {
  return (
    <div className="bg-white rounded-lg p-4">
      <h3 className="text-lg font-bold mb-3">
        熱門商品 TOP 5
        {viewMode !== "daily" && (
          <span className="text-sm font-normal text-gray-600">
            ({viewMode === "weekly" ? "本週" : "本月"})
          </span>
        )}
      </h3>
      {popularItems.length === 0 ? (
        <div className="text-center text-gray-500 py-4">暫無資料</div>
      ) : (
        <div className="space-y-3">
          {popularItems.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    index === 0
                      ? "bg-yellow-500"
                      : index === 1
                      ? "bg-gray-400"
                      : index === 2
                      ? "bg-orange-400"
                      : "bg-blue-400"
                  }`}
                >
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-600">售出 {item.quantity} 份</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">${item.revenue}</div>
                <div className="text-sm text-gray-600">${item.price}/份</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PopularItemsCard;
