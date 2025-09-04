import React from "react";
import { Trash2 } from "lucide-react";

// const OrderItem = ({ item, onUpdateQuantity, onRemove }) => (
//   <div className="flex items-center justify-between py-2 border-b">
//     <div className="flex-1">
//       <div className="font-medium text-sm">
//         {item.name}
//         {item.isEditing && (
//           <span className="text-blue-500 text-xs ml-2">(修改中)</span>
//         )}
//       </div>
//       <div className="text-xs text-gray-600">${item.price}</div>
//     </div>
//     <div className="flex items-center space-x-2">
//       <button
//         onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
//         className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
//       >
//         -
//       </button>
//       <span className="w-8 text-center text-sm">{item.quantity}</span>
//       <button
//         onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
//         className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
//       >
//         +
//       </button>
//       <button
//         onClick={() => onRemove(item.id)}
//         className="w-6 h-6 rounded-full bg-red-200 hover:bg-red-300 flex items-center justify-center text-sm"
//       >
//         <Trash2 className="w-3 h-3" />
//       </button>
//     </div>
//   </div>
// );

const OrderItem = ({ item, onUpdateQuantity, onRemove }) => (
  <div className="flex items-center justify-between py-2 border-b">
    <div className="flex-1">
      <div className="font-medium text-sm">{item.name}</div>
      <div className="text-xs text-gray-600">${item.price}</div>
      {/* 新增：顯示客製選項 */}
      {item.selectedCustom &&
        Object.entries(item.selectedCustom).map(([type, value]) => (
          <div key={type} className="text-xs text-gray-500">
            {type}: {value}
          </div>
        ))}
    </div>
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
      >
        -
      </button>
      <span className="w-8 text-center text-sm">{item.quantity}</span>
      <button
        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
      >
        +
      </button>
      <button
        onClick={() => onRemove(item.id)}
        className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
          item.isEditing
            ? "bg-red-200 hover:bg-red-300 text-red-600"
            : "bg-red-200 hover:bg-red-300"
        }`}
        title={item.isEditing ? "刪除此餐點" : "移除"}
      >
        🗑️
      </button>
    </div>
  </div>
);

export default OrderItem;
