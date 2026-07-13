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
import { MetricCard } from "../components/cards/MetricCard.tsx";
import { useAppData } from "../storage/appStorage.tsx";

type RecoveryChartKey =
	| "readinessScore"
	| "sleepScore"
	| "activityScore"
	| "steps"
	| "sleepHours"
	| "restingHeartRate"
	| "hrvMs"
	| "respiratoryRate"
	| "bodyTemperatureDeviation";

const scoreLines: Array<{
	key: RecoveryChartKey;
	name: string;
	color: string;
}> = [
	{ key: "readinessScore", name: "Readiness", color: "#7cf7c5" },
	{ key: "sleepScore", name: "Sleep", color: "#67e8f9" },
	{ key: "activityScore", name: "Activity", color: "#fbbf24" },
];

const vitalLines: Array<{
	key: RecoveryChartKey;
	name: string;
	color: string;
}> = [
	{ key: "hrvMs", name: "HRV", color: "#7cf7c5" },
	{ key: "restingHeartRate", name: "RHR", color: "#fb7185" },
	{ key: "sleepHours", name: "Sleep hours", color: "#67e8f9" },
	{ key: "respiratoryRate", name: "Resp", color: "#fbbf24" },
];

function RecoveryChart({
	data,
	lines,
	title,
}: {
	data: Array<Record<string, unknown>>;
	lines: Array<{ key: RecoveryChartKey; name: string; color: string }>;
	title: string;
}) {
	return (
		<section className="card" style={{ gridColumn: "1 / -1" }}>
			<h2>{title}</h2>
			{data.length === 0 ? (
				<p className="muted">No Oura recovery data yet.</p>
			) : (
				<div className="chart tall-chart">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart
							data={data}
							margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
						>
							<CartesianGrid
								stroke="rgba(148,163,184,0.18)"
								strokeDasharray="3 3"
							/>
							<XAxis dataKey="date" stroke="#93a4b7" />
							<YAxis stroke="#93a4b7" />
							<Tooltip
								contentStyle={{
									background: "#101b26",
									border: "1px solid rgba(148,163,184,0.22)",
									borderRadius: 14,
									color: "#e5edf5",
								}}
							/>
							{lines.map((line) => (
								<Line
									key={line.key}
									type="monotone"
									dataKey={line.key}
									name={line.name}
									stroke={line.color}
									strokeWidth={2.5}
									dot={false}
									connectNulls
								/>
							))}
						</LineChart>
					</ResponsiveContainer>
				</div>
			)}
		</section>
	);
}

export function RecoveryPage() {
	const { data, syncOuraNow, userEmail } = useAppData();
	const [syncMessage, setSyncMessage] = React.useState("");
	const [isSyncingOura, setIsSyncingOura] = React.useState(false);
	const sortedEntries = [...data.recoveryEntries].sort((a, b) =>
		a.date.localeCompare(b.date),
	);
	const latest = sortedEntries.at(-1);
	const chartData = sortedEntries.map((entry) => ({
		date: entry.date,
		readinessScore: entry.readinessScore,
		sleepScore: entry.sleepScore,
		activityScore: entry.activityScore,
		sleepHours: entry.sleepHours,
		steps: entry.steps,
		restingHeartRate: entry.restingHeartRate,
		hrvMs: entry.hrvMs,
		respiratoryRate: entry.respiratoryRate,
		bodyTemperatureDeviation: entry.bodyTemperatureDeviation,
	}));

	const handleManualSync = async () => {
		setIsSyncingOura(true);
		setSyncMessage("");
		try {
			await syncOuraNow();
			setSyncMessage("Oura synced successfully.");
		} catch (error) {
			setSyncMessage(
				error instanceof Error ? error.message : "Oura sync failed.",
			);
		} finally {
			setIsSyncingOura(false);
		}
	};

	return (
		<div className="grid">
			<section className="card">
				<div className="split">
					<div>
						<h2>Oura recovery</h2>
						<p className="muted">
							Oura sync runs every morning automatically. Manual sync requires
							sign-in.
						</p>
					</div>
					<button
						className="btn"
						disabled={!userEmail || isSyncingOura}
						onClick={handleManualSync}
					>
						{isSyncingOura ? "Syncing…" : "Sync Oura now"}
					</button>
				</div>
				{syncMessage ? <p className="muted">{syncMessage}</p> : null}
				{!userEmail ? (
					<p className="muted">Sign in under Settings to manually sync Oura.</p>
				) : null}
			</section>

			<div className="grid three">
				<MetricCard
					label="Readiness"
					value={latest?.readinessScore ?? "—"}
					detail={latest ? `${latest.date} · Oura` : "No Oura data yet"}
				/>
				<MetricCard
					label="Sleep"
					value={latest?.sleepHours ? `${latest.sleepHours}h` : "—"}
					detail={
						latest?.sleepScore
							? `Score ${latest.sleepScore}`
							: "Sleep score unavailable"
					}
				/>
				<MetricCard
					label="HRV / RHR"
					value={latest?.hrvMs ? `${latest.hrvMs} ms` : "—"}
					detail={
						latest?.restingHeartRate
							? `RHR ${latest.restingHeartRate}`
							: "Resting HR unavailable"
					}
				/>
				<MetricCard
					label="Steps"
					value={latest?.steps ? latest.steps.toLocaleString() : "—"}
					detail={latest ? `${latest.date} · Apple Health/Oura` : "No steps yet"}
				/>
			</div>

			<RecoveryChart
				data={chartData}
				lines={scoreLines}
				title="Oura scores over time"
			/>
			<RecoveryChart
				data={chartData}
				lines={vitalLines}
				title="Sleep and recovery vitals"
			/>
			<RecoveryChart
				data={chartData}
				lines={[{ key: "steps", name: "Steps", color: "#7cf7c5" }]}
				title="Steps over time"
			/>

			<section className="card" style={{ gridColumn: "1 / -1" }}>
				<h2>Recent recovery data</h2>
				<div className="list">
					{[...sortedEntries].reverse().map((entry) => (
						<div className="list-item" key={entry.id}>
							<strong>{entry.date}</strong>
							{entry.source ? (
								<span className="muted"> · {entry.source}</span>
							) : null}
							<br />
							<span className="muted">
								Readiness {entry.readinessScore ?? "—"} · Sleep score{" "}
								{entry.sleepScore ?? "—"} · Activity{" "}
								{entry.activityScore ?? "—"} · Steps{" "}
								{entry.steps?.toLocaleString() ?? "—"}
							</span>
							<br />
							<span className="muted">
								Sleep {entry.sleepHours ?? "—"}h · HRV {entry.hrvMs ?? "—"}ms ·
								RHR {entry.restingHeartRate ?? "—"}
								{entry.respiratoryRate
									? ` · Resp ${entry.respiratoryRate}`
									: ""}
								{entry.bodyTemperatureDeviation
									? ` · Temp ${entry.bodyTemperatureDeviation}`
									: ""}
							</span>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
