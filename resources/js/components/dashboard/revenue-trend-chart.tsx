import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';
import { Area, AreaChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';

interface RevenuePoint {
    date: string;
    revenue: number;
}

const chartConfig = {
    revenue: {
        label: 'Revenue',
        color: 'var(--chart-1)',
    },
} satisfies ChartConfig;

function formatShortDate(value: string) {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCompactCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value);
}

export function RevenueTrendChart({ data }: { data: RevenuePoint[] }) {
    const lastIndex = data.length - 1;

    return (
        <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
            <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval={1}
                    tickFormatter={formatShortDate}
                    className="fill-muted-foreground text-xs"
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={64}
                    tickFormatter={formatCompactCurrency}
                    className="fill-muted-foreground text-xs"
                />
                <ChartTooltip
                    cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                    content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                            <div className="grid min-w-[10rem] gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                <div className="font-medium text-foreground">{formatShortDate(label as string)}</div>
                                <div className="flex items-center gap-2">
                                    <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: 'var(--color-revenue)' }} />
                                    <span className="text-muted-foreground">Revenue</span>
                                    <span className="ml-auto font-mono font-medium text-foreground tabular-nums">
                                        {formatCurrency(payload[0].value as number)}
                                    </span>
                                </div>
                            </div>
                        );
                    }}
                />
                <Area
                    dataKey="revenue"
                    type="monotone"
                    fill="url(#revenue-fill)"
                    stroke="var(--color-revenue)"
                    strokeWidth={2}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--background)' }}
                >
                    <LabelList
                        dataKey="revenue"
                        position="top"
                        offset={12}
                        className="fill-foreground text-xs font-medium"
                        content={(props) => {
                            const { index, x, y, value } = props;
                            if (index !== lastIndex || typeof x !== 'number' || typeof y !== 'number' || typeof value !== 'number') {
                                return null;
                            }
                            return (
                                <text x={x} y={y - 12} textAnchor="middle" className="fill-foreground text-xs font-medium">
                                    {formatCompactCurrency(value)}
                                </text>
                            );
                        }}
                    />
                </Area>
            </AreaChart>
        </ChartContainer>
    );
}
