import { type } from "@testing-library/user-event/dist/type";

// 可放在 defaultMenuData.js 或 CafePOSSystem.js 的 menuData state
const defaultMenuData = [
  // 義式
  { id: "espresso", category: "義式", name: "濃縮咖啡", price: 80 },
  { id: "americano", category: "義式", name: "美式咖啡", price: 120 },
  { id: "latte", category: "義式", name: "拿鐵咖啡", price: 150 },
  { id: "cappuccino", category: "義式", name: "卡布奇諾", price: 140 },
  { id: "mocha", category: "義式", name: "摩卡咖啡", price: 160 },
  { id: "macchiato", category: "義式", name: "瑪奇朵", price: 145 },

  // 手沖
  { id: "pour_over_1", category: "手沖", name: "衣索比亞", price: 180 },
  { id: "pour_over_2", category: "手沖", name: "哥倫比亞", price: 170 },
  { id: "pour_over_3", category: "手沖", name: "瓜地馬拉", price: 175 },
  { id: "pour_over_4", category: "手沖", name: "肯亞AA", price: 190 },
  { id: "pour_over_5", category: "手沖", name: "巴西半日曬", price: 165 },
  { id: "pour_over_6", category: "手沖", name: "巴拿馬藝伎", price: 250 },

  // 非咖啡
  {
    id: "black_tea",
    category: "非咖啡",
    name: "紅茶",
    price: 90,
    customOptions: [
      {
        type: "冰量",
        options: ["去冰", "微冰", "少冰", "正常冰"],
      },
      {
        type: "糖量",
        options: ["無糖", "微糖", "半糖", "正常糖"],
      },
    ],
  },
  {
    id: "green_tea",
    category: "非咖啡",
    name: "綠茶",
    price: 90,
    customOptions: [
      {
        type: "冰量",
        options: ["去冰", "微冰", "少冰", "正常冰"],
      },
      {
        type: "糖量",
        options: ["無糖", "微糖", "半糖", "正常糖"],
      },
    ],
  },
  { id: "milk_tea", category: "非咖啡", name: "奶茶", price: 110 },
  { id: "hot_chocolate", category: "非咖啡", name: "熱巧克力", price: 130 },
  { id: "fresh_juice", category: "非咖啡", name: "鮮果汁", price: 120 },
  { id: "smoothie", category: "非咖啡", name: "果昔", price: 140 },

  // 甜點
  { id: "cheesecake", category: "甜點", name: "起司蛋糕", price: 150 },
  { id: "tiramisu", category: "甜點", name: "提拉米蘇", price: 160 },
  { id: "brownie", category: "甜點", name: "布朗尼", price: 120 },
  { id: "muffin", category: "甜點", name: "馬芬", price: 100 },
  { id: "scone", category: "甜點", name: "司康餅", price: 110 },
  { id: "croissant", category: "甜點", name: "可頌", price: 85 },

  // 輕食
  { id: "sandwich_1", category: "輕食", name: "火腿起司三明治", price: 180 },
  { id: "sandwich_2", category: "輕食", name: "鮪魚沙拉三明治", price: 170 },
  { id: "bagel", category: "輕食", name: "貝果", price: 120 },
  { id: "salad", category: "輕食", name: "凱薩沙拉", price: 200 },
  { id: "pasta", category: "輕食", name: "義大利麵", price: 240 },
  { id: "panini", category: "輕食", name: "帕尼尼", price: 190 },
];

export default defaultMenuData;
