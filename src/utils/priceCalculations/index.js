/**
 * 價格計算系統統一導出入口
 *
 * 功能效果：提供統一的導入介面，方便其他組件使用
 * 用途：集中管理所有價格計算相關函數的導出
 * 組件長度：約30行，純導出邏輯
 */

import * as core from "./core";
import * as validators from "./validators";
import * as formatters from "./formatters";
import * as batchProcessor from "./batchProcessor";

// 核心計算函數

export { calculateItemPrice, calculateItemsTotal } from "./core";

// 驗證函數
export { validatePriceCalculation, validateItemFormat } from "./validators";

// 格式化函數
export {
  formatPriceAdjustment,
  getPriceAdjustmentDisplay,
  formatSubtotalDisplay,
} from "./formatters";

// 批量處理函數
export { batchCalculateItemPrices } from "./batchProcessor";

export default {
  ...core,
  ...validators,
  ...formatters,
  ...batchProcessor,
};
