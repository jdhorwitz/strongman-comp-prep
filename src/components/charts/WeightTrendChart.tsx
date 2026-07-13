import React from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { BodyweightEntry } from "../../types/domain.ts";
import { calculateSevenDayRollingAverage } from "../../domain/weight.ts";

export function WeightTrendChart({ entries }: { entries: BodyweightEntry[] }) {
	const data = calculateSevenDayRollingAverage(entries);
	if (data.length === 0)
		return <p className="muted">No bodyweight data yet.</p>;
	return (
		<div className="chart">
			<ResponsiveContainer width="100%" height="100%">
				<LineChart
					data={data}
					margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
				>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="date" hide={data.length > 8} />
					<YAxis domain={["dataMin - 3", "dataMax + 3"]} />
					<Tooltip />
					<Line
						type="monotone"
						dataKey="weightLb"
						name="Daily"
						stroke="#c33"
						strokeWidth={2}
						dot={false}
					/>
					<Line
						type="monotone"
						dataKey="sevenDayAverageLb"
						name="7-day avg"
						stroke="#17201a"
						strokeWidth={3}
						dot={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
