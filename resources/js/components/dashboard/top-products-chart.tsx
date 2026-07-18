import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';

interface ProductPoint {
    id: string;
    name: string;
    quantity_sold: number;
}

const chartConfig = {
    quantity_sold: {
        label: 'Qty Sold',
        color: 'var(--chart-1)',
    },
} satisfies ChartConfig;

export function TopProductsChart({ data }: { data: ProductPoint[] }) {
    return (
        <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 0, bottom: 4 }}>
                <XAxis type="number" hide />
                <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={112}
                    tickFormatter={(value: string) => (value.length > 16 ? `${value.slice(0, 15)}…` : value)}
                    className="fill-muted-foreground text-xs"
                />
                <ChartTooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                    content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const point = payload[0].payload as ProductPoint;
                        return (
                            <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                <div className="font-medium text-foreground">{point.name}</div>
                                <div className="flex items-center gap-2">
                                    <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: 'var(--color-quantity_sold)' }} />
                                    <span className="text-muted-foreground">Qty sold</span>
                                    <span className="ml-auto font-mono font-medium text-foreground tabular-nums">{point.quantity_sold}</span>
                                </div>
                            </div>
                        );
                    }}
                />
                <Bar dataKey="quantity_sold" fill="var(--color-quantity_sold)" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    <LabelList dataKey="quantity_sold" position="right" offset={8} className="fill-foreground text-xs font-medium" />
                </Bar>
            </BarChart>
        </ChartContainer>
    );
}
