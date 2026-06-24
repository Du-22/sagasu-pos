import React from "react";

/**
 * VendorFilterChips
 *
 * 功能效果：用廠商標籤篩選目前日期區間內的支出紀錄
 * 使用範例：<VendorFilterChips vendors={vendors} activeVendor="all" />
 */
const VendorFilterChips = ({ vendors, activeVendor, onVendorChange }) => {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onVendorChange("all")}
        className={`min-h-[34px] rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
          activeVendor === "all"
            ? "bg-terracotta text-ivory"
            : "bg-parchment text-warm-olive hover:bg-warm-sand"
        }`}
      >
        全部廠商
      </button>

      {vendors.map((vendor) => (
        <button
          key={vendor}
          type="button"
          onClick={() => onVendorChange(vendor)}
          className={`min-h-[34px] rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
            activeVendor === vendor
              ? "bg-terracotta text-ivory"
              : "bg-parchment text-warm-olive hover:bg-warm-sand"
          }`}
        >
          {vendor}
        </button>
      ))}
    </div>
  );
};

export default VendorFilterChips;
