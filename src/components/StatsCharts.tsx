"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export type ChartEntry = { name: string; value: number; color?: string };

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border)",
  borderRadius: "8px",
  fontSize: "13px",
  color: "var(--c-text)",
  boxShadow: "none",
};

const PIE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#f97316",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#ef4444",
];

function HBarChart({ data }: { data: ChartEntry[] }) {
  const maxLabelLen = Math.max(...data.map((e) => e.name.length), 8);
  const labelWidth = Math.min(Math.max(maxLabelLen * 7, 80), 150);
  const height = Math.max(120, data.length * 30);

  return (
    <div style={{ height }} className="text-c-soft">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 4, right: 36, top: 4, bottom: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={labelWidth}
            tick={{ fontSize: 12, fill: "currentColor" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(99,102,241,0.08)" }}
            contentStyle={TOOLTIP_STYLE}
            itemStyle={{ color: "var(--c-text)" }}
            labelStyle={{ color: "var(--c-soft)", marginBottom: 2 }}
          />
          <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="value"
              position="right"
              style={{ fontSize: 11, fill: "currentColor" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DonutChart({ data }: { data: ChartEntry[] }) {
  return (
    <div style={{ height: 240 }} className="text-c-soft">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={entry.color ?? PIE_COLORS[i % PIE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            itemStyle={{ color: "var(--c-text)" }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "var(--c-soft)" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function SummaryList({ data }: { data: ChartEntry[] }) {
  return (
    <div>
      {data.map((entry) => (
        <div
          key={entry.name}
          className="flex justify-between items-center py-1.5 border-b border-c-border last:border-0"
        >
          <span className="text-sm text-c-text">{entry.name}</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-c-surface border border-c-border text-c-muted">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  title,
  data,
  children,
  noData,
}: {
  title: string;
  data: ChartEntry[];
  children: React.ReactNode;
  noData: string;
}) {
  return (
    <div className="bg-c-surface border border-c-border rounded-xl p-5">
      <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider mb-4">
        {title}
      </h2>
      {data.length === 0 ? (
        <p className="text-c-faint text-sm">{noData}</p>
      ) : data.length < 3 ? (
        <SummaryList data={data} />
      ) : (
        children
      )}
    </div>
  );
}

export function StatsCharts({
  byCountry,
  byStatus,
  byPlatform,
  byGenre,
  labels,
}: {
  byCountry: ChartEntry[];
  byStatus: ChartEntry[];
  byPlatform: ChartEntry[];
  byGenre: ChartEntry[];
  labels: {
    byCountry: string;
    byStatus: string;
    byPlatform: string;
    byGenre: string;
    noData: string;
  };
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <StatCard title={labels.byCountry} data={byCountry} noData={labels.noData}>
        <HBarChart data={byCountry} />
      </StatCard>
      <StatCard title={labels.byStatus} data={byStatus} noData={labels.noData}>
        <DonutChart data={byStatus} />
      </StatCard>
      <StatCard title={labels.byPlatform} data={byPlatform} noData={labels.noData}>
        <DonutChart data={byPlatform} />
      </StatCard>
      <StatCard title={labels.byGenre} data={byGenre} noData={labels.noData}>
        <HBarChart data={byGenre} />
      </StatCard>
    </div>
  );
}
