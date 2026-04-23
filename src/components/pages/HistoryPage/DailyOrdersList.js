import React from "react";
import { calculateDiningTime } from "../../../utils/historyUtils";

/**
 * DailyOrdersList
 *
 * 原始程式碼：HistoryPage.js 行 658-989
 * 功能效果：日檢視的詳細訂單列表，支援同桌分組模式與詳細列表模式
 * 用途：獨立日檢視訂單 UI，只在 viewMode === "daily" 時渲染
 */
const DailyOrdersList = ({
  viewMode,
  displayMode,
  displayRecords,
  groupedRecords,
  selectedDate,
  showRefundedOrders,
  onShowRefundedChange,
  onRefundClick,
}) => {
  if (viewMode !== "daily") return null;

  return (
    <div className="bg-ivory rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">
          詳細記錄{displayMode === "grouped" ? " (同桌訂單)" : " (詳細檢視)"}
        </h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showRefundedOrders}
            onChange={(e) => onShowRefundedChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">顯示退款訂單</span>
        </label>
      </div>

      {displayRecords.length === 0 ? (
        <div className="text-center text-warm-stone py-8">
          {selectedDate} 暫無資料
        </div>
      ) : displayMode === "grouped" ? (
        <GroupedView
          groupedRecords={groupedRecords}
          onRefundClick={onRefundClick}
        />
      ) : (
        <DetailedView
          displayRecords={displayRecords}
          onRefundClick={onRefundClick}
        />
      )}
    </div>
  );
};

// 同桌分組顯示
const GroupedView = ({ groupedRecords, onRefundClick }) => (
  <div className="space-y-6">
    {groupedRecords.map((group) => (
      <div
        key={group.groupId}
        className={`border-2 rounded-lg overflow-hidden ${
          group.hasRefunded
            ? "border-error-warm/30 bg-error-warm/10"
            : group.isGrouped
            ? "border-terracotta-light bg-parchment"
            : "border-warm-cream bg-ivory"
        }`}
      >
        {/* 群組標題列 */}
        <div
          className={`p-4 ${
            group.hasRefunded
              ? "bg-error-warm text-ivory"
              : group.isGrouped
              ? "bg-terracotta text-ivory"
              : group.type === "takeout"
              ? "bg-terracotta text-ivory"
              : "bg-gray-500 text-ivory"
          }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-bold">
                {group.type === "takeout" ? `外帶 ${group.table}` : `${group.table} 桌`}
                {group.isGrouped && " (分開結帳)"}
                {group.hasRefunded && " (含退款)"}
              </h4>
              <p className="text-sm opacity-90">
                用餐時段: {calculateDiningTime(group.records)} •
                {group.isGrouped
                  ? ` 分 ${group.records.length} 次結帳`
                  : " 單次結帳"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${group.totalAmount}</div>
              <div className="text-sm opacity-90">{group.totalItems} 件商品</div>
              {group.hasRefunded && (
                <div className="text-sm opacity-90">(已扣除退款)</div>
              )}
            </div>
          </div>
        </div>

        {/* 群組內容 */}
        <div className="p-4">
          {group.isGrouped ? (
            <SplitPaymentRecords records={group.records} onRefundClick={onRefundClick} />
          ) : (
            <SinglePaymentRecord record={group.records[0]} onRefundClick={onRefundClick} />
          )}
        </div>
      </div>
    ))}
  </div>
);

// 分開結帳：多筆記錄
const SplitPaymentRecords = ({ records, onRefundClick }) => (
  <div className="space-y-3">
    {records.map((record, index) => (
      <div
        key={record.id}
        className={`border rounded-lg p-3 ${
          record.isRefunded ? "bg-error-warm/10 border-error-warm/30 opacity-75" : "bg-ivory"
        }`}
      >
        {record.isRefunded && (
          <div className="mb-2">
            <span className="bg-error-warm text-ivory px-2 py-1 rounded text-xs">
              已退款 {record.refundDate} {record.refundTime}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-3">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-ivory ${
                record.isRefunded ? "bg-error-warm" : "bg-terracotta"
              }`}
            >
              {index + 1}
            </span>
            <div>
              <div className="font-medium">
                第{index + 1}次結帳 - {record.time}
              </div>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  record.paymentMethod === "cash"
                    ? "bg-warm-sand text-terracotta-dark"
                    : "bg-warm-sand text-terracotta-dark"
                }`}
              >
                {record.paymentMethod === "cash" ? "現金" : "Line Pay"}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`text-lg font-bold ${
                record.isRefunded ? "text-error-warm line-through" : ""
              }`}
            >
              ${record.total}
            </div>
            {!record.isRefunded && (
              <button
                onClick={() => onRefundClick(record)}
                className="bg-error-warm text-ivory px-3 py-1 rounded text-xs hover:bg-error-warm transition-colors"
              >
                退款
              </button>
            )}
          </div>
        </div>
        <ItemsList items={record.items} />
      </div>
    ))}
  </div>
);

// 單次結帳：單筆記錄
const SinglePaymentRecord = ({ record, onRefundClick }) => (
  <div>
    {record.isRefunded && (
      <div className="mb-2">
        <span className="bg-error-warm text-ivory px-2 py-1 rounded text-xs">
          已退款 {record.refundDate} {record.refundTime}
        </span>
      </div>
    )}
    <div className="flex justify-between items-start mb-2">
      <div className="text-sm text-warm-charcoal flex-1">
        <ItemsList items={record.items} />
      </div>
      {!record.isRefunded && (
        <button
          onClick={() => onRefundClick(record)}
          className="bg-error-warm text-ivory px-3 py-1 rounded text-xs hover:bg-error-warm transition-colors ml-4"
        >
          退款
        </button>
      )}
    </div>
    <div className="mt-2">
      <span
        className={`text-xs px-2 py-1 rounded ${
          record.paymentMethod === "cash"
            ? "bg-warm-sand text-terracotta-dark"
            : "bg-warm-sand text-terracotta-dark"
        }`}
      >
        {record.paymentMethod === "cash" ? "現金" : "Line Pay"}
      </span>
    </div>
  </div>
);

// 詳細列表模式
const DetailedView = ({ displayRecords, onRefundClick }) => (
  <div className="space-y-3">
    {displayRecords
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((record) => (
        <div
          key={record.id}
          className={`border rounded-lg p-3 ${
            record.isRefunded
              ? "bg-error-warm/10 border-error-warm/30 opacity-75"
              : "hover:bg-parchment"
          }`}
        >
          {record.isRefunded && (
            <div className="mb-2">
              <span className="bg-error-warm text-ivory px-2 py-1 rounded text-xs">
                已退款 {record.refundDate} {record.refundTime}
              </span>
            </div>
          )}
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center space-x-3 flex-1">
              <span className="font-medium">
                {record.type === "takeout" ? `外帶 #${record.table}` : record.table}
              </span>
              <span className="text-sm text-warm-olive">{record.time}</span>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  record.type === "takeout"
                    ? "bg-warm-sand text-terracotta-dark"
                    : "bg-warm-sand text-terracotta-dark"
                }`}
              >
                {record.type === "takeout" ? "外帶" : "內用"}
              </span>
              {record.isPartialPayment && (
                <span className="text-xs px-2 py-1 rounded bg-warm-sand text-warm-charcoal">
                  部分結帳
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <span
                  className={`font-bold ${
                    record.isRefunded ? "text-error-warm line-through" : "text-terracotta-dark"
                  }`}
                >
                  ${record.total}
                </span>
                <div className="text-sm text-warm-olive">{record.itemCount} 項商品</div>
              </div>
              {!record.isRefunded && (
                <button
                  onClick={() => onRefundClick(record)}
                  className="bg-error-warm text-ivory px-3 py-1 rounded text-xs hover:bg-error-warm transition-colors"
                >
                  退款
                </button>
              )}
            </div>
          </div>
          <div className="text-sm text-warm-charcoal">
            <ItemsList items={record.items} />
          </div>
        </div>
      ))}
  </div>
);

// 共用：商品明細列表
const ItemsList = ({ items }) => (
  <>
    {items.map((item, index) => (
      <span key={index}>
        {item.name} x{item.quantity}
        {item.selectedCustom &&
          Object.entries(item.selectedCustom).map(([type, value]) => (
            <span key={type} className="ml-1 text-xs text-warm-stone">
              [{type}:{value}]
            </span>
          ))}
        {index < items.length - 1 ? ", " : ""}
      </span>
    ))}
  </>
);

export default DailyOrdersList;
