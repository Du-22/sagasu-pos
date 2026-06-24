export const demoExpenseRecords = [
  {
    id: "expense-demo-1",
    date: "2026-06-24",
    name: "咖啡豆 耶加雪菲 水洗 1kg",
    vendor: "Sagasu 咖啡材料行",
    amount: 1200,
  },
  {
    id: "expense-demo-2",
    date: "2026-06-24",
    name: "鮮奶",
    vendor: "本地乳品商",
    amount: 850,
  },
  {
    id: "expense-demo-3",
    date: "2026-06-18",
    name: "外帶杯與杯蓋",
    vendor: "包材供應商",
    amount: 1680,
  },
];

export const demoCommonExpenseItems = [
  {
    id: "common-expense-1",
    name: "咖啡豆 耶加雪菲 水洗 1kg",
    vendor: "Sagasu 咖啡材料行",
    amount: 1200,
  },
  {
    id: "common-expense-2",
    name: "鮮奶",
    vendor: "本地乳品商",
    amount: 850,
  },
  {
    id: "common-expense-3",
    name: "外帶杯與杯蓋",
    vendor: "包材供應商",
    amount: 1680,
  },
];

export const createDemoIncomeRecords = (selectedDate) => {
  const baseTimestamp = new Date(`${selectedDate}T12:00:00+08:00`).getTime();

  return [
    {
      id: "income-demo-1",
      date: selectedDate,
      time: "12:15",
      timestamp: baseTimestamp,
      table: "S1",
      type: "table",
      paymentMethod: "cash",
      isRefunded: false,
      isPartialPayment: false,
      total: 1280,
      itemCount: 7,
      items: [
        { name: "辣蛋沙拉堡", quantity: 3, price: 130, subtotal: 390 },
        { name: "香草巴斯克", quantity: 2, price: 130, subtotal: 260 },
        { name: "可麗露", quantity: 2, price: 315, subtotal: 630 },
      ],
    },
    {
      id: "income-demo-2",
      date: selectedDate,
      time: "14:30",
      timestamp: baseTimestamp + 8100000,
      table: "T1",
      type: "takeout",
      paymentMethod: "linepay",
      isRefunded: false,
      isPartialPayment: false,
      total: 860,
      itemCount: 5,
      items: [
        { name: "拿鐵", quantity: 3, price: 140, subtotal: 420 },
        { name: "磅磅", quantity: 2, price: 220, subtotal: 440 },
      ],
    },
    {
      id: "income-demo-3",
      date: selectedDate,
      time: "16:05",
      timestamp: baseTimestamp + 14700000,
      table: "S3",
      type: "table",
      paymentMethod: "cash",
      isRefunded: false,
      isPartialPayment: false,
      total: 1180,
      itemCount: 6,
      items: [
        { name: "手沖咖啡", quantity: 2, price: 180, subtotal: 360 },
        { name: "可麗露", quantity: 3, price: 100, subtotal: 300 },
        { name: "香草巴斯克", quantity: 1, price: 520, subtotal: 520 },
      ],
    },
  ];
};
