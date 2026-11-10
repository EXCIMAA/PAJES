import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import type { ChartDataPoint } from "../../types";

const CATEGORY_COLORS = [
  "#818cf8",
  "#60a5fa",
  "#34d399",
  "#22d3ee",
  "#f59e0b",
  "#a78bfa",
  "#f87171",
  "#fb923c",
];

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

function ChartCard({ title, subtitle, children, className }: ChartCardProps) {
  return (
    <div className={`card p-5 ${className || ""}`}>
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-200">{title}</h3>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "var(--color-chart-tooltip)",
    border: "1px solid var(--color-chart-tooltip-border)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "var(--color-text-primary)",
  },
  itemStyle: { color: "var(--color-text-secondary)" },
  labelStyle: { color: "var(--color-text-primary)", fontWeight: 600 },
};

interface ChartProps {
  data: ChartDataPoint[];
}

export function RevenueChart({ data }: ChartProps) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <ChartCard
        title={t("dashboard.charts.revenue.title")}
        subtitle={t("dashboard.charts.revenue.subtitle")}
      >
        <p className="text-sm text-slate-500 py-16 text-center">
          {t("dashboard.charts.noData")}
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={t("dashboard.charts.revenue.title")}
      subtitle={t("dashboard.charts.revenue.subtitle")}
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gradientCurrent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-chart-grid)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--color-chart-axis)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--color-chart-axis)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            {...tooltipStyle}
            formatter={(value) => [`${Number(value ?? 0)}%`, ""]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#818cf8"
            strokeWidth={2}
            fill="url(#gradientCurrent)"
            name={t("dashboard.charts.revenue.series")}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CategoryChart({ data }: ChartProps) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <ChartCard
        title={t("dashboard.charts.category.title")}
        subtitle={t("dashboard.charts.category.subtitle")}
      >
        <p className="text-sm text-slate-500 py-16 text-center">
          {t("dashboard.charts.noData")}
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={t("dashboard.charts.category.title")}
      subtitle={t("dashboard.charts.category.subtitle")}
    >
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              {...tooltipStyle}
              formatter={(value) => [String(Number(value ?? 0)), ""]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{
                  backgroundColor:
                    CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                }}
              />
              <span className="text-xs text-slate-400 flex-1 truncate">
                {item.name}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

export function FindingsTrendChart({ data }: ChartProps) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <ChartCard
        title={t("dashboard.charts.findings.title")}
        subtitle={t("dashboard.charts.findings.subtitle")}
      >
        <p className="text-sm text-slate-500 py-16 text-center">
          {t("dashboard.charts.noData")}
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={t("dashboard.charts.findings.title")}
      subtitle={t("dashboard.charts.findings.subtitle")}
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-chart-grid)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--color-chart-axis)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--color-chart-axis)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip {...tooltipStyle} />
          <Bar
            dataKey="value"
            fill="#818cf8"
            radius={[4, 4, 0, 0]}
            name={t("dashboard.charts.findings.series")}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
