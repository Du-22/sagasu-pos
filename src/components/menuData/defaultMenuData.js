import { type } from "@testing-library/user-event/dist/type";

// 可放在 defaultMenuData.js 或 CafePOSSystem.js 的 menuData state
const defaultMenuData = [
  // 義式咖啡
  {
    id: "espresso",
    category: "義式",
    name: "濃縮",
    price: 100,
    customOptions: [
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "americano",
    category: "義式",
    name: "美式",
    price: 100,
    customOptions: [
      { type: "冰量", options: ["少冰", "冰", "熱"] },
      { type: "濃縮", options: ["加濃縮"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "latte",
    category: "義式",
    name: "拿鐵",
    price: 130,
    customOptions: [
      { type: "冰量", options: ["少冰", "冰", "熱"] },
      { type: "濃縮", options: ["加濃縮"] },
      { type: "奶", options: ["換燕麥奶"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "cappuccino",
    category: "義式",
    name: "卡布奇諾",
    price: 120,
    customOptions: [
      { type: "奶", options: ["換燕麥奶"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "Brown Sugar Latte",
    category: "義式",
    name: "黑糖拿鐵",
    price: 140,
    customOptions: [
      { type: "冰量", options: ["少冰", "冰", "熱"] },
      { type: "濃縮", options: ["加濃縮"] },
      { type: "奶", options: ["換燕麥奶"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "1+1",
    category: "義式",
    name: "1+1",
    price: 170,
    customOptions: [
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "Lemon American",
    category: "義式",
    name: "檸檬美式",
    price: 130,
    customOptions: [
      { type: "冰量", options: ["少冰", "冰"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "Orange American",
    category: "義式",
    name: "柳橙美式",
    price: 130,
    customOptions: [
      { type: "冰量", options: ["少冰", "冰"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "Apple American",
    category: "義式",
    name: "蘋果美式",
    price: 140,
    customOptions: [
      { type: "冰量", options: ["少冰", "冰"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "shiso sparkling americano",
    category: "義式",
    name: "紫蘇氣泡美式",
    price: 130,
    customOptions: [
      { type: "冰量", options: ["少冰", "冰"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },

  // 手沖咖啡
  {
    id: "pour_over_1",
    category: "手沖",
    name: "SAGASU配方",
    price: 160,
    customOptions: [
      { type: "冰量", options: ["少冰", "冰", "熱"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "pour_over_2",
    category: "手沖",
    name: "哥倫比亞 品種花園 粉紅波旁",
    price: 190,
    customOptions: [
      { type: "冰量", options: ["少冰", "冰", "熱"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "pour_over_3",
    category: "手沖",
    name: "哥斯大黎加 多卡產區",
    price: 170,
    customOptions: [
      { type: "冰量", options: ["少冰", "冰", "熱"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "pour_over_4",
    category: "手沖",
    name: "衣索比亞 耶加雪菲 果丁丁",
    price: 180,
    customOptions: [
      { type: "冰量", options: ["少冰", "冰", "熱"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "pour_over_5",
    category: "手沖",
    name: "衣索比亞 耶加雪菲 阿梅德萊落 孔加村",
    price: 180,
    customOptions: [
      { type: "冰量", options: ["少冰", "冰", "熱"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "pour_over_6",
    category: "手沖",
    name: "期間限定",
    price: 190,
    customOptions: [
      { type: "冰量", options: ["少冰", "冰", "熱"] },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },

  // 非咖啡
  {
    id: "fresh_milk_tea",
    category: "非咖啡",
    name: "鮮奶茶",
    price: 110,
    customOptions: [
      {
        type: "冰量",
        options: ["少冰", "冰", "熱"],
      },
      {
        type: "奶",
        options: ["換燕麥奶"],
      },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "apple_black_tea",
    category: "非咖啡",
    name: "蘋果紅茶",
    price: 120,
    customOptions: [
      {
        type: "冰量",
        options: ["少冰", "冰"],
      },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "brown_sugar_milk",
    category: "非咖啡",
    name: "黑糖牛奶",
    price: 130,
    customOptions: [
      {
        type: "冰量",
        options: ["少冰", "冰", "熱"],
      },
      {
        type: "奶",
        options: ["換燕麥奶"],
      },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "matcha_milk",
    category: "非咖啡",
    name: "抹茶牛奶",
    price: 140,
    customOptions: [
      {
        type: "冰量",
        options: ["少冰", "冰", "熱"],
      },
      {
        type: "奶",
        options: ["換燕麥奶"],
      },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "sesame_milk",
    category: "非咖啡",
    name: "芝麻牛奶",
    price: 140,
    customOptions: [
      {
        type: "奶",
        options: ["換燕麥奶"],
      },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "shiso_plum_sparkling",
    category: "非咖啡",
    name: "紫蘇梅氣泡",
    price: 120,
    customOptions: [
      {
        type: "冰量",
        options: ["少冰", "冰"],
      },
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "rooibos_tea",
    category: "非咖啡",
    name: "國寶茶",
    price: 120,
    customOptions: [
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "chamomile_tea",
    category: "非咖啡",
    name: "洋甘菊花草茶",
    price: 180,
    customOptions: [
      { type: "順序", options: ["後上"] },
      { type: "續杯", options: ["否", "是"] },
    ],
  },
  {
    id: "Gua Zi Rou Rice-apple_black_tea",
    category: "非咖啡",
    name: "瓜仔飯的蘋果紅茶",
    price: 100,
    customOptions: [
      { type: "冰量", options: ["少冰"] },
      { type: "順序", options: ["後上"] },
    ],
  },

  // 小食
  {
    id: "vanilla_bagel",
    category: "小食",
    name: "香草巴斯克",
    price: 130,
    customOptions: [{ type: "順序", options: ["後上"] }],
  },
  {
    id: "sesame_bagel",
    category: "小食",
    name: "芝麻巴斯克",
    price: 130,
    customOptions: [{ type: "順序", options: ["後上"] }],
  },
  {
    id: "salted_egg_yolk_bagel",
    category: "小食",
    name: "鹹蛋黃巴斯克",
    price: 160,
    customOptions: [{ type: "順序", options: ["後上"] }],
  },
  {
    id: "vanilla_cocotte",
    category: "小食",
    name: "香草可麗露",
    price: 100,
    customOptions: [{ type: "順序", options: ["後上"] }],
  },
  {
    id: "cocotte",
    category: "小食",
    name: "可麗露",
    price: 110,
    customOptions: [{ type: "順序", options: ["後上"] }],
  },
  {
    id: "dacquoise",
    category: "小食",
    name: "達克瓦茲",
    price: 130,
    customOptions: [{ type: "順序", options: ["後上"] }],
  },
  {
    id: "financier",
    category: "小食",
    name: "費南雪",
    price: 120,
    customOptions: [{ type: "順序", options: ["後上"] }],
  },
  {
    id: "vanilla_hot_dog",
    category: "小食",
    name: "香草熱狗堡",
    price: 140,
    customOptions: [
      {
        type: "番茄",
        options: ["不番茄"],
      },
      {
        type: "芥末",
        options: ["不芥末"],
      },
      {
        type: "洋蔥",
        options: ["不洋蔥"],
      },
      {
        type: "奶油",
        options: ["不奶油"],
      },
      { type: "順序", options: ["後上"] },
    ],
  },
  {
    id: "hot_dog",
    category: "小食",
    name: "熱狗堡",
    price: 130,
    customOptions: [
      {
        type: "番茄",
        options: ["不番茄"],
      },
      {
        type: "芥末",
        options: ["不芥末"],
      },
      {
        type: "洋蔥",
        options: ["不洋蔥"],
      },
      {
        type: "奶油",
        options: ["不奶油"],
      },
      { type: "順序", options: ["後上"] },
    ],
  },
  {
    id: "egg_salad_sandwich",
    category: "小食",
    name: "蛋沙拉堡",
    price: 120,
    customOptions: [
      {
        type: "辣度",
        options: ["不辣", "減半"],
      },
      { type: "順序", options: ["後上"] },
    ],
  },
  {
    id: "Gua Zi Rou Rice",
    category: "小食",
    name: "瓜仔飯",
    price: 120,
    customOptions: [{ type: "蔥", options: ["不蔥", "少蔥"] }],
  },
  {
    id: "plastic_bag",
    category: "小食",
    name: "塑膠袋",
    price: 1,
  },
];

export default defaultMenuData;
