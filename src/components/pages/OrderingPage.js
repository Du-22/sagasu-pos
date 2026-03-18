import React from "react";
import Header from "../UI/Header";
import MenuArea from "../UI/MenuArea";
import NewOrderSummary from "../UI/OrderSummary/NewOrderSummary";

const OrderingPage = ({
  selectedTable,
  currentOrder,
  confirmedOrdersBatches,
  tableStatus,
  onBack,
  onAddToOrder,
  onUpdateQuantity,
  onRemoveItem,
  onSubmitOrder,
  onCheckout,
  onEditConfirmedItem,
  onMenuSelect,
  menuData,
  onReleaseSeat,
  onMoveTable,
  onLogout,
}) => (
  <div className="min-h-screen bg-gray-100">
    <Header
      title={`Sagasu POS系統 - ${selectedTable}`}
      subtitle={selectedTable}
      currentPage="seating"
      showBackButton={true}
      onBackClick={onBack}
      onMenuSelect={onMenuSelect}
      onLogout={onLogout}
    />

    <div className="flex ">
      <div className="flex-1  overflow-y-auto">
        <MenuArea menuData={menuData} onAddToOrder={onAddToOrder} />
      </div>
      <div className="w-1/3 h-full flex flex-col">
        {/* 入座狀態才顯示釋放桌子按鈕 */}

        {tableStatus === "seated" && (
          <button
            onClick={() => onReleaseSeat(selectedTable)}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded mt-2 transition"
          >
            釋放桌子
          </button>
        )}

        {/* 有訂單時顯示換桌按鈕 */}
        {tableStatus === "occupied" && (
          <button
            onClick={onMoveTable}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded mt-2 transition"
          >
            換桌
          </button>
        )}

        <NewOrderSummary
          currentOrder={currentOrder}
          confirmedOrdersBatches={confirmedOrdersBatches}
          selectedTable={selectedTable}
          tableStatus={tableStatus}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
          onSubmitOrder={onSubmitOrder}
          onCheckout={onCheckout}
          onEditConfirmedItem={onEditConfirmedItem}
        />
      </div>
    </div>
  </div>
);

export default OrderingPage;
