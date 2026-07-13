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
		<React.Fragment>
			<div className="chart">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart
						data={data}
						margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
					>
						<CartesianGrid
							stroke="rgba(148,163,184,0.18)"
							strokeDasharray="3 3"
						/>
						<XAxis dataKey="date" hide={data.length > 8} stroke="#93a4b7" />
						<YAxis domain={["dataMin - 3", "dataMax + 3"]} stroke="#93a4b7" />
						<Tooltip
							contentStyle={{
								background: "#101b26",
								border: "1px solid rgba(148,163,184,0.22)",
								borderRadius: 14,
								color: "#e5edf5",
							}}
						/>
						<Line
							type="monotone"
							dataKey="weightLb"
							name="Daily"
							stroke="#67e8f9"
							strokeWidth={2}
							dot={false}
						/>
						<Line
							type="monotone"
							dataKey="sevenDayAverageLb"
							name="7-day avg"
							stroke="#7cf7c5"
							strokeWidth={3}
							dot={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</React.Fragment>
	);
}
