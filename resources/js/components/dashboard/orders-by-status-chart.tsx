import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { CheckCircle2, Clock, XCircle, type LucideIcon } from 'lucide-react';
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts';

interface StatusPoint {
    status: 'pending' | 'completed' | 'cancelled';
    label: string;
    count: number;
}

const statusMeta: Record<StatusPoint['status'], { color: string; icon: LucideIcon }> = {
    pending: { color: 'var(--color-status-warning)', icon: Clock },
    completed: { color: 'var(--color-status-good)', icon: CheckCircle2 },
    cancelled: { color: 'var(--color-status-critical)', icon: XCircle },
};

const chartConfig = {
    count: { label: 'Orders' },
} satisfies ChartConfig;

export function OrdersByStatusChart({ data }: { data: StatusPoint[] }) {
    return (
        <div>
            <ChartContainer config={chartConfig} className="aspect-auto h-[160px] w-full">
                <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 0, bottom: 4 }} barCategoryGap="24%">
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={80} className="fill-muted-foreground text-xs" />
                    <ChartTooltip
                        cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const point = payload[0].payload as StatusPoint;
                            return (
                                <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                            style={{ backgroundColor: statusMeta[point.status].color }}
                                        />
                                        <span className="text-muted-foreground">{point.label}</span>
                                        <span className="ml-auto font-mono font-medium text-foreground tabular-nums">{point.count}</span>
                                    </div>
                                </div>
                            );
                        }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                        {data.map((entry) => (
                            <Cell key={entry.status} fill={statusMeta[entry.status].color} />
                        ))}
                        <LabelList dataKey="count" position="right" offset={8} className="fill-foreground text-xs font-medium" />
                    </Bar>
                </BarChart>
            </ChartContainer>
            <div className="mt-2 flex items-center justify-center gap-4">
                {data.map((entry) => {
                    const Icon = statusMeta[entry.status].icon;
                    return (
                        <div key={entry.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Icon className="h-3 w-3" style={{ color: statusMeta[entry.status].color }} />
                            <span>{entry.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
