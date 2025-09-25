import React, { useState } from "react";
import {
  calculateItemPrice,
  calculateItemsTotal,
} from "../../../utils/priceCalculations";
import {
  processConfirmedOrders,
  getCheckoutableItems,
} from "../../../utils/orderDataProcessors";

// UI 組件 imports
import OrderSummaryContent from "./OrderSummaryContent";
import CheckoutTypeModal from "./CheckoutTypeModal";
import PaymentModal from "./PaymentModal";
import PartialCheckoutModal from "./PartialCheckoutModal";

/**
 * 新版訂單摘要組件 - 純狀態管理
 *
 * 原始程式碼：OrderSummary.js（約800行）
 * 功能效果：顯示訂單摘要、處理結帳流程、支援部分結帳
 * 用途：純狀態管理和邏輯處理，UI完全分離到子組件
 * 組件長度：約100行，無JSX渲染邏輯
 */
const NewOrderSummary = ({
  currentOrder,
  confirmedOrdersBatches = [],
  selectedTable,
  tableStatus,
  onUpdateQuantity,
  onRemoveItem,
  onSubmitOrder,
  onCheckout,
  onEditConfirmedItem,
}) => {
  // === 狀態管理 ===
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCheckoutTypeModal, setShowCheckoutTypeModal] = useState(false);
  const [showPartialCheckoutModal, setShowPartialCheckoutModal] =
    useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // === 調用邏輯組件 ===
  const processedBatches = processConfirmedOrders(confirmedOrdersBatches);
  const checkoutableItems = getCheckoutableItems(
    processedBatches,
    currentOrder,
    selectedTable
  );

  // 價格計算
  const currentTotal = calculateItemsTotal(currentOrder).total;

  const confirmedTotal = (() => {
    const editingPositions = new Set(
      currentOrder
        .filter((item) => item.isEditing)
        .map((item) =>
          selectedTable.startsWith("T")
            ? item.originalItemIndex
            : `${item.originalBatchIndex}-${item.originalItemIndex}`
        )
    );

    if (selectedTable.startsWith("T")) {
      return processedBatches.flat().reduce((total, item, index) => {
        return editingPositions.has(index)
          ? total
          : total + calculateItemPrice(item).subtotal;
      }, 0);
    } else {
      return processedBatches.reduce((batchTotal, batch, batchIndex) => {
        return (
          batchTotal +
          batch.reduce((itemTotal, item, itemIndex) => {
            const positionKey = `${batchIndex}-${itemIndex}`;
            return editingPositions.has(positionKey)
              ? itemTotal
              : itemTotal + calculateItemPrice(item).subtotal;
          }, 0)
        );
      }, 0);
    }
  })();

  const grandTotal = currentTotal + confirmedTotal;

  const partialTotal = Object.entries(selectedItems).reduce(
    (total, [key, isSelected]) => {
      if (!isSelected) return total;
      const selectedQty = selectedQuantities[key] || 1;
      const item = checkoutableItems.find((item) => item.key === key);
      return item
        ? total +
            calculateItemPrice({ ...item, quantity: selectedQty }).subtotal
        : total;
    },
    0
  );

  // === 事件處理邏輯 ===
  const handleCheckoutClick = () => {
    const hasMultiple =
      checkoutableItems.some((item) => item.quantity > 1) ||
      checkoutableItems.length > 1;
    hasMultiple ? setShowCheckoutTypeModal(true) : setShowPaymentModal(true);
  };

  const handleFullCheckout = () => {
    setShowCheckoutTypeModal(false);
    setShowPaymentModal(true);
  };

  const handlePartialCheckout = () => {
    setShowCheckoutTypeModal(false);
    const initialSelection = {};
    const initialQuantities = {};
    checkoutableItems.forEach((item) => {
      initialSelection[item.key] = false;
      initialQuantities[item.key] = 0;
    });
    setSelectedItems(initialSelection);
    setSelectedQuantities(initialQuantities);
    setShowPartialCheckoutModal(true);
  };

  const handleItemSelect = (key, isSelected) => {
    setSelectedItems({ ...selectedItems, [key]: isSelected });
    if (isSelected) {
      setSelectedQuantities({ ...selectedQuantities, [key]: 1 });
    } else {
      setSelectedQuantities({ ...selectedQuantities, [key]: 0 });
    }
  };

  const handleQuantityChange = (key, quantity) => {
    setSelectedQuantities({ ...selectedQuantities, [key]: quantity });
  };

  const handleQuickSelect = (key, quantity) => {
    setSelectedQuantities({ ...selectedQuantities, [key]: quantity });
    setSelectedItems({ ...selectedItems, [key]: quantity > 0 });
  };

  const handleConfirmPartialSelection = () => {
    const hasValidSelection = Object.values(selectedItems).some(Boolean);
    if (!hasValidSelection) {
      alert("請至少選擇一個商品並設定數量");
      return;
    }
    setShowPartialCheckoutModal(false);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    const methodName = paymentMethod === "cash" ? "現金" : "Line Pay";
    const hasPartialSelection = Object.values(selectedItems).some(Boolean);

    if (hasPartialSelection) {
      const selectedCount = Object.entries(selectedItems)
        .filter(([key, isSelected]) => isSelected)
        .reduce((sum, [key]) => sum + (selectedQuantities[key] || 1), 0);

      if (partialTotal === 0 || selectedCount === 0) {
        alert("選中商品的總額為0或數量為0，請重新選擇");
        return;
      }

      const confirmed = window.confirm(
        `確定要以 ${methodName} 結帳選中的 ${selectedCount} 個商品，總額 $${partialTotal} 嗎？`
      );

      if (confirmed) {
        onCheckout(paymentMethod, {
          items: selectedItems,
          quantities: selectedQuantities,
        });
        resetState();
      }
    } else {
      const confirmed = window.confirm(
        `確定要以 ${methodName} 結帳全部商品，總額 $${grandTotal} 嗎？`
      );
      if (confirmed) {
        onCheckout(paymentMethod);
        resetState();
      }
    }
  };

  const resetState = () => {
    setShowPaymentModal(false);
    setShowCheckoutTypeModal(false);
    setShowPartialCheckoutModal(false);
    setSelectedItems({});
    setSelectedQuantities({});
  };

  // === 組合 UI 組件 ===
  return (
    <>
      <OrderSummaryContent
        processedBatches={processedBatches}
        currentOrder={currentOrder}
        currentTotal={currentTotal}
        confirmedTotal={confirmedTotal}
        grandTotal={grandTotal}
        tableStatus={tableStatus}
        selectedTable={selectedTable}
        onEditConfirmedItem={onEditConfirmedItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemoveItem={onRemoveItem}
        onSubmitOrder={onSubmitOrder}
        onCheckoutClick={handleCheckoutClick}
      />

      <CheckoutTypeModal
        isOpen={showCheckoutTypeModal}
        grandTotal={grandTotal}
        onFullCheckout={handleFullCheckout}
        onPartialCheckout={handlePartialCheckout}
        onClose={() => setShowCheckoutTypeModal(false)}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        total={
          Object.values(selectedItems).some(Boolean) ? partialTotal : grandTotal
        }
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onConfirm={handleConfirmPayment}
        onClose={() => setShowPaymentModal(false)}
      />

      <PartialCheckoutModal
        isOpen={showPartialCheckoutModal}
        checkoutableItems={checkoutableItems}
        selectedItems={selectedItems}
        selectedQuantities={selectedQuantities}
        onItemSelect={handleItemSelect}
        onQuantityChange={handleQuantityChange}
        onQuickSelect={handleQuickSelect}
        onConfirm={handleConfirmPartialSelection}
        onClose={() => setShowPartialCheckoutModal(false)}
      />
    </>
  );
};

export default NewOrderSummary;
