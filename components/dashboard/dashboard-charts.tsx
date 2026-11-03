"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import type { DashboardData, ReportCashFlow } from "@/lib/types";

const pnlConfig = {
  amount: { label: "Amount", color: "var(--chart-1)" },
} satisfies ChartConfig;

const stockConfig = {
  value: { label: "Stock value", color: "var(--chart-2)" },
} satisfies ChartConfig;

const cashFlowConfig = {
  inflow: { label: "Inflow", color: "var(--chart-2)" },
  outflow: { label: "Outflow", color: "var(--chart-5)" },
} satisfies ChartConfig;

const liquidityConfig = {
  balance: { label: "Balance" },
} satisfies ChartConfig;

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function moneyTick(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}

export function DashboardCharts({
  data,
  cashFlow,
}: {
  data: DashboardData;
  cashFlow: ReportCashFlow | null;
}) {
  const [cashRange, setCashRange] = useState<"7" | "14" | "30" | "all">("14");
  const { profitAndLoss: pnl, financialOverview: fin } = data;

  const pnlData = useMemo(
    () =>
      [
        { label: "Revenue", amount: parseFloat(pnl.revenue) },
        { label: "COGS", amount: parseFloat(pnl.costOfGoodsSold) },
        { label: "Gross", amount: parseFloat(pnl.grossProfit) },
        { label: "Expenses", amount: parseFloat(pnl.totalExpenses) },
        { label: "Net", amount: parseFloat(pnl.netProfit) },
      ].map((row) => ({ ...row, amount: Number.isFinite(row.amount) ? row.amount : 0 })),
    [pnl]
  );

  const stockData = useMemo(
    () =>
      data.stockValueByLocation.map((row) => ({
        name: row.locationName,
        value: parseFloat(row.value) || 0,
      })),
    [data.stockValueByLocation]
  );

  const liquidityData = useMemo(
    () =>
      fin.bankAccounts
        .map((acc) => ({
          name: acc.name,
          balance: parseFloat(acc.balance) || 0,
        }))
        .filter((row) => row.balance !== 0)
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)),
    [fin.bankAccounts]
  );

  const cashFlowData = useMemo(() => {
    const rows = cashFlow?.dailyBalances ?? [];
    const mapped = rows.map((row) => {
      const inflow = parseFloat(row.inflow ?? row.cashIn ?? "0") || 0;
      const outflow = parseFloat(row.outflow ?? row.cashOut ?? "0") || 0;
      return {
        date: row.date,
        inflow,
        outflow,
      };
    });
    if (cashRange === "all") return mapped;
    const take = Number(cashRange);
    return mapped.slice(-take);
  }, [cashFlow, cashRange]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm lg:col-span-2">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Cash movement</CardTitle>
            <CardDescription>
              Daily bank inflows and outflows for the selected period
            </CardDescription>
          </div>
          <Select
            value={cashRange}
            onValueChange={(value) =>
              setCashRange(value as "7" | "14" | "30" | "all")
            }
          >
            <SelectTrigger className="h-9 w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="all">Full range</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {cashFlowData.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--erp-text-muted)]">
              No cash-flow activity in this range yet.
            </p>
          ) : (
            <ChartContainer config={cashFlowConfig} className="aspect-[2/1] w-full min-h-[220px] sm:aspect-[3/1]">
              <AreaChart data={cashFlowData} margin={{ left: 8, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="fillInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-inflow)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-inflow)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-outflow)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-outflow)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={moneyTick}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      labelFormatter={(value) =>
                        new Date(String(value)).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      }
                      formatter={(value) => formatMoney(Number(value))}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  dataKey="inflow"
                  type="monotone"
                  fill="url(#fillInflow)"
                  stroke="var(--color-inflow)"
                  strokeWidth={2}
                />
                <Area
                  dataKey="outflow"
                  type="monotone"
                  fill="url(#fillOutflow)"
                  stroke="var(--color-outflow)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm">
        <CardHeader>
          <CardTitle>Profit &amp; loss</CardTitle>
          <CardDescription>Interactive breakdown for the selected dates</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={pnlConfig} className="aspect-[4/3] w-full min-h-[240px]">
            <BarChart data={pnlData} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={moneyTick}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value) => formatMoney(Number(value))}
                  />
                }
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="var(--color-amount)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm">
        <CardHeader>
          <CardTitle>Stock by location</CardTitle>
          <CardDescription>
            {data.showroomCount} location{data.showroomCount === 1 ? "" : "s"} with inventory value
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stockData.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--erp-text-muted)]">
              No stock values to chart.
            </p>
          ) : (
            <ChartContainer config={stockConfig} className="aspect-[4/3] w-full min-h-[240px]">
              <BarChart
                data={stockData}
                layout="vertical"
                margin={{ left: 8, right: 12, top: 8 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={moneyTick}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatMoney(Number(value))}
                    />
                  }
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="var(--color-value)" />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle>Liquidity mix</CardTitle>
          <CardDescription>
            Account balances · Total{" "}
            {formatMoney(fin.totalLiquidity ?? fin.totalBankBalance)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {liquidityData.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--erp-text-muted)]">
              No account balances to chart.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
              <ChartContainer
                config={liquidityConfig}
                className="mx-auto aspect-square max-h-[280px] w-full"
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="name"
                        formatter={(value) => formatMoney(Number(value))}
                      />
                    }
                  />
                  <Pie
                    data={liquidityData}
                    dataKey="balance"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={96}
                    strokeWidth={2}
                  >
                    {liquidityData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <ul className="space-y-2 text-sm">
                {liquidityData.slice(0, 6).map((row, index) => (
                  <li
                    key={row.name}
                    className="flex items-center justify-between gap-3 border-b border-[var(--erp-border)]/70 py-1.5 last:border-0"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          background: PIE_COLORS[index % PIE_COLORS.length],
                        }}
                      />
                      <span className="truncate text-[var(--erp-text)]">
                        {row.name}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[var(--erp-text-muted)]">
                      {formatMoney(row.balance)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
