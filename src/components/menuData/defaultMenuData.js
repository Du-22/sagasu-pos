import { type } from "@testing-library/user-event/dist/type";

//固定菜單 order改為各類別排序
//只留塑膠袋 其他菜單則使用網頁菜單編輯功能新增
const defaultMenuData = [
  {
    id: "plastic_bag",
    category: "小食",
    name: "塑膠袋",
    price: 1,
    order: 999, // 永遠在最後
  },
];

export default defaultMenuData;
