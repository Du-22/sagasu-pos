import React from "react";
import Header from "../UI/Header";
import MenuArea from "../UI/MenuArea";
import OrderSummary from "../UI/OrderSummary";

const OrderingPage = ({
  selectedTable,
  currentOrder,
  confirmedOrdersBatches, // 新增
  tableStatus,
  onBack,
  onAddToOrder,
  onUpdateQuantity,
  onRemoveItem,
  onSubmitOrder,
  onCheckout,
  onEditConfirmedItem, // 新增
  onMenuSelect,
}) => (
  <div className="min-h-screen bg-gray-100">
    <Header
      title={`Sagasu POS系統 - ${selectedTable}`}
      subtitle={selectedTable}
      currentPage="seating"
      showBackButton={true}
      onBackClick={onBack}
      onMenuSelect={onMenuSelect}
    />

    <div className="flex ">
      <div className="flex-1  overflow-y-auto">
        <MenuArea onAddToOrder={onAddToOrder} />
      </div>
      <div className="w-1/3 h-full flex flex-col">
        <OrderSummary
          currentOrder={currentOrder}
          confirmedOrdersBatches={confirmedOrdersBatches} // 新增
          selectedTable={selectedTable}
          tableStatus={tableStatus}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
          onSubmitOrder={onSubmitOrder}
          onCheckout={onCheckout}
          onEditConfirmedItem={onEditConfirmedItem} // 新增
        />
      </div>
    </div>
  </div>
);

export default OrderingPage;
