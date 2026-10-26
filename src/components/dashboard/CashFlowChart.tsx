
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type CashFlowPoint = {
  month: string;
  received: number;
  paid: number;
};

type CashFlowChartProps = {
  data: CashFlowPoint[];
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const chartConfig = {
  received: {
    label: "Cash received",
    color: "var(--chart-1)",
  },
  paid: {
    label: "Cash paid",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const formatAxisValue = (value: number) => {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }

  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(0)}k`;
  }

  return `₹${value}`;
};

export default function CashFlowChart({
  data,
}: CashFlowChartProps) {
  return (
    <div className="w-full min-w-0">
      {data.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground">
          No cash-flow transactions for this period.
        </div>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[280px] w-full sm:h-[320px]"
        >
          <BarChart
            accessibilityLayer
            data={data}
            margin={{
              top: 12,
              right: 12,
              left: 4,
              bottom: 4,
            }}
            barCategoryGap="35%"
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={20}
              tick={{
                fill: "var(--muted-foreground)",
                fontSize: 12,
              }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              width={60}
              tickMargin={8}
              tick={{
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
              tickFormatter={formatAxisValue}
            />

            <ChartTooltip
              cursor={{
                fill: "var(--muted)",
                opacity: 0.25,
              }}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex min-w-[140px] items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {name === "received"
                          ? "Cash received"
                          : "Cash paid"}
                      </span>

                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {currency(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />

            <Bar
              dataKey="received"
              fill="var(--color-received)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />

            <Bar
              dataKey="paid"
              fill="var(--color-paid)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
