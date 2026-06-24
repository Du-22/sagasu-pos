import React from "react";

const formatCurrency = (amount) => `$${amount.toLocaleString("zh-TW")}`;

/**
 * ProfitOverviewPage
 *
 * 功能效果：v0 收支總覽，用營收扣除採買支出顯示粗估結餘
 * 使用範例：<ProfitOverviewPage incomeTotal={1000} expenseTotal={300} />
 */
const ProfitOverviewPage = ({
  incomeTotal,
  expenseTotal,
  orderCount,
  expenseCount,
  dateRangeText,
}) => {
  const balance = incomeTotal - expenseTotal;
  const totalFlow = incomeTotal + expenseTotal;
  const incomeShare = totalFlow > 0 ? Math.round((incomeTotal / totalFlow) * 100) : 0;
  const expenseShare = totalFlow > 0 ? 100 - incomeShare : 0;
  const incomeDegrees = totalFlow > 0 ? (incomeTotal / totalFlow) * 360 : 0;
  const pieBackground =
    totalFlow > 0
      ? `conic-gradient(#c96442 0deg ${incomeDegrees}deg, #b53333 ${incomeDegrees}deg 360deg)`
      : "#e8e6dc";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="收入總額" value={formatCurrency(incomeTotal)} tone="income" />
        <SummaryCard label="支出總額" value={formatCurrency(expenseTotal)} tone="expense" />
        <SummaryCard
          label="粗估結餘"
          value={formatCurrency(balance)}
          tone={balance >= 0 ? "income" : "expense"}
        />
      </div>

      <div className="bg-ivory rounded-lg p-4 shadow-whisper">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-anthropic-black">收支總覽</h2>
            <p className="text-sm text-warm-olive">
              目前只扣除支出紀錄中的採買金額，尚未包含人事、租金、水電等成本。
            </p>
          </div>
          <div className="text-sm text-warm-stone">期間: {dateRangeText}</div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-lg bg-parchment p-5">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_480px] xl:items-center xl:justify-center xl:gap-[184px]">
              <div className="mx-auto flex h-[280px] w-[280px] items-center justify-center rounded-full bg-warm-sand p-5 shadow-warm-ring">
                <div
                  className="flex h-full w-full items-center justify-center rounded-full"
                  style={{ background: pieBackground }}
                  aria-label={`收入 ${incomeShare}%，支出 ${expenseShare}%`}
                >
                  <div className="flex h-[164px] w-[164px] flex-col items-center justify-center rounded-full bg-ivory text-center shadow-warm-ring">
                    <div className="text-xs text-warm-olive">粗估結餘</div>
                    <div
                      className={`mt-1 text-2xl font-bold ${
                        balance >= 0 ? "text-terracotta" : "text-error-warm"
                      }`}
                    >
                      {formatCurrency(balance)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mx-auto w-full max-w-[480px] space-y-3 xl:mx-0">
                <OverviewMetric
                  label="收入"
                  amount={incomeTotal}
                  count={orderCount}
                  share={incomeShare}
                  markerClassName="bg-terracotta"
                  valueClassName="text-terracotta"
                />
                <OverviewMetric
                  label="支出"
                  amount={expenseTotal}
                  count={expenseCount}
                  share={expenseShare}
                  markerClassName="bg-error-warm"
                  valueClassName="text-error-warm"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-warm-cream bg-ivory p-5 shadow-warm-ring">
            <h3 className="text-lg font-bold text-anthropic-black">總覽</h3>
            <div className="mt-5 space-y-4 text-sm text-warm-charcoal">
              <div className="flex items-center justify-between gap-4 rounded-lg bg-parchment px-4 py-3">
                <span>收入總額</span>
                <span className="text-lg font-bold text-terracotta">
                  {formatCurrency(incomeTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg bg-parchment px-4 py-3">
                <span>支出總額</span>
                <span className="text-lg font-bold text-error-warm">
                  - {formatCurrency(expenseTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-warm-cream pt-4">
                <span>粗估結餘</span>
                <span
                  className={`text-2xl font-bold ${
                    balance >= 0 ? "text-terracotta" : "text-error-warm"
                  }`}
                >
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const OverviewMetric = ({
  label,
  amount,
  count,
  share,
  markerClassName,
  valueClassName,
}) => {
  return (
    <div className="rounded-lg bg-ivory px-4 py-2.5 shadow-warm-ring">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${markerClassName}`} />
          <span className="font-bold text-anthropic-black">{label}</span>
        </div>
        <span className={`text-lg font-bold ${valueClassName}`}>{share}%</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2 text-xs text-warm-olive">
        <span>{count} 筆紀錄</span>
        <span className={`text-base font-bold ${valueClassName}`}>
          {formatCurrency(amount)}
        </span>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, tone }) => {
  const valueColor = tone === "expense" ? "text-error-warm" : "text-terracotta";

  return (
    <div className="bg-ivory rounded-lg p-4 text-center shadow-whisper">
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      <div className="text-sm text-warm-olive">{label}</div>
    </div>
  );
};

export default ProfitOverviewPage;
