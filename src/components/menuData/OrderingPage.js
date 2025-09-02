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
}) => (
  <div className="min-h-screen bg-gray-100">
    <Header
      title={`XX點餐系統 - ${selectedTable}`}
      subtitle={selectedTable}
      showBackButton={true}
      onBackClick={onBack}
    />

    <div className="flex h-screen">
      <MenuArea onAddToOrder={onAddToOrder} />
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
);

export default OrderingPage;
