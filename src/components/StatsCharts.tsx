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
import { Link } from "@/i18n/navigation";

export type ChartEntry = { name: string; value: number; color?: string };
export type StudioRank = { slug: string; name: string; count: number };

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

function VBarChart({ data }: { data: ChartEntry[] }) {
  return (
    <div style={{ height: 240 }} className="text-c-soft">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -12, right: 4, top: 16, bottom: 4 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "currentColor" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "currentColor" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(99,102,241,0.08)" }}
            contentStyle={TOOLTIP_STYLE}
            itemStyle={{ color: "var(--c-text)" }}
            labelStyle={{ color: "var(--c-soft)", marginBottom: 2 }}
          />
          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
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
            formatter={(value, entry) => {
              const count = (entry as unknown as { payload?: { value?: number } })
                ?.payload?.value;
              return count !== undefined ? `${value} (${count})` : String(value);
            }}
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

function TopStudiosList({
  studios,
  emptyLabel,
}: {
  studios: StudioRank[];
  emptyLabel: string;
}) {
  if (studios.length === 0) {
    return <p className="text-c-faint text-sm">{emptyLabel}</p>;
  }
  return (
    <div>
      {studios.map((s, i) => (
        <div
          key={s.slug}
          className="flex items-center gap-3 py-1.5 border-b border-c-border last:border-0"
        >
          <span className="text-xs font-medium text-c-faint w-5 text-end">
            {i + 1}
          </span>
          <Link
            href={`/studios/${s.slug}`}
            className="text-sm text-c-text hover:text-indigo-500 transition-colors flex-1 truncate"
          >
            {s.name}
          </Link>
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-c-surface border border-c-border text-c-muted">
            {s.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-c-surface border border-c-border rounded-xl p-5">
      <h2 className="text-xs font-semibold text-c-faint uppercase tracking-wider mb-4">
        {title}
      </h2>
      {children}
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
    <Card title={title}>
      {data.length === 0 ? (
        <p className="text-c-faint text-sm">{noData}</p>
      ) : data.length < 3 ? (
        <SummaryList data={data} />
      ) : (
        children
      )}
    </Card>
  );
}

function CounterRow({
  counters,
  labels,
}: {
  counters: { games: number; studios: number; communities: number };
  labels: { totalGames: string; totalStudios: string; totalCommunities: string };
}) {
  const items = [
    { value: counters.games, label: labels.totalGames, href: "/" as const },
    { value: counters.studios, label: labels.totalStudios, href: "/?tab=studios" as const },
    { value: counters.communities, label: labels.totalCommunities, href: "/?tab=communities" as const },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="bg-c-surface border border-c-border rounded-xl p-5 hover:border-indigo-500/50 transition-colors block"
        >
          <div className="text-3xl font-bold text-c-text leading-none">
            {item.value}
          </div>
          <div className="text-xs font-semibold text-c-faint uppercase tracking-wider mt-2">
            {item.label}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function StatsCharts({
  counters,
  topStudios,
  byCountry,
  byStatus,
  byPlatform,
  byGenre,
  byReleaseYear,
  labels,
}: {
  counters: { games: number; studios: number; communities: number };
  topStudios: StudioRank[];
  byCountry: ChartEntry[];
  byStatus: ChartEntry[];
  byPlatform: ChartEntry[];
  byGenre: ChartEntry[];
  byReleaseYear: ChartEntry[];
  labels: {
    totalGames: string;
    totalStudios: string;
    totalCommunities: string;
    topStudios: string;
    byCountry: string;
    byStatus: string;
    byPlatform: string;
    byGenre: string;
    byReleaseYear: string;
    noData: string;
    noStudios: string;
  };
}) {
  return (
    <>
      <CounterRow
        counters={counters}
        labels={{
          totalGames: labels.totalGames,
          totalStudios: labels.totalStudios,
          totalCommunities: labels.totalCommunities,
        }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title={labels.byCountry} data={byCountry} noData={labels.noData}>
          <HBarChart data={byCountry} />
        </StatCard>
        <StatCard title={labels.byStatus} data={byStatus} noData={labels.noData}>
          <DonutChart data={byStatus} />
        </StatCard>
        <StatCard title={labels.byPlatform} data={byPlatform} noData={labels.noData}>
          <HBarChart data={byPlatform} />
        </StatCard>
        <StatCard title={labels.byGenre} data={byGenre} noData={labels.noData}>
          <HBarChart data={byGenre} />
        </StatCard>
        <Card title={labels.topStudios}>
          <TopStudiosList studios={topStudios} emptyLabel={labels.noStudios} />
        </Card>
        <StatCard
          title={labels.byReleaseYear}
          data={byReleaseYear}
          noData={labels.noData}
        >
          <VBarChart data={byReleaseYear} />
        </StatCard>
      </div>
    </>
  );
}
