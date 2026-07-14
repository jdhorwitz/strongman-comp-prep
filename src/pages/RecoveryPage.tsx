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

type TimeRange = "7d" | "30d" | "90d" | "all";

const timeRanges: Array<{ value: TimeRange; label: string; days?: number }> = [
	{ value: "7d", label: "1W", days: 7 },
	{ value: "30d", label: "1M", days: 30 },
	{ value: "90d", label: "3M", days: 90 },
	{ value: "all", label: "All" },
];

function dateDaysBefore(dateString: string, days: number) {
	const date = new Date(`${dateString}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() - days + 1);
	return date.toISOString().slice(0, 10);
}

function valueIsPresent(value: unknown) {
	return typeof value === "number" && Number.isFinite(value);
}

function RecoveryChart({
	data,
	lines,
	title,
}: {
	data: Array<Record<string, unknown>>;
	lines: Array<{ key: RecoveryChartKey; name: string; color: string }>;
	title: string;
}) {
	const visibleData = data.filter((row) =>
		lines.some((line) => valueIsPresent(row[line.key])),
	);
	return (
		<section className="card" style={{ gridColumn: "1 / -1" }}>
			<h2>{title}</h2>
			{visibleData.length === 0 ? (
				<p className="muted">No data for this range yet.</p>
			) : (
				<div className="chart tall-chart">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart
							data={visibleData}
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
	const [timeRange, setTimeRange] = React.useState<TimeRange>("30d");
	const sortedEntries = [...data.recoveryEntries].sort((a, b) =>
		a.date.localeCompare(b.date),
	);
	const latestReadiness = [...sortedEntries]
		.reverse()
		.find((entry) => entry.readinessScore !== undefined);
	const latestSleep = [...sortedEntries]
		.reverse()
		.find(
			(entry) =>
				entry.sleepHours !== undefined || entry.sleepScore !== undefined,
		);
	const latestHrv = [...sortedEntries]
		.reverse()
		.find(
			(entry) =>
				entry.hrvMs !== undefined || entry.restingHeartRate !== undefined,
		);
	const latestSteps = [...sortedEntries]
		.reverse()
		.find((entry) => entry.steps !== undefined);
	const activeRange = timeRanges.find((range) => range.value === timeRange);
	const latestChartDate = sortedEntries.at(-1)?.date;
	const startDate =
		activeRange?.days && latestChartDate
			? dateDaysBefore(latestChartDate, activeRange.days)
			: undefined;
	const filteredEntries = startDate
		? sortedEntries.filter((entry) => entry.date >= startDate)
		: sortedEntries;
	const chartData = filteredEntries.map((entry) => ({
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
					value={latestReadiness?.readinessScore ?? "—"}
					detail={
						latestReadiness
							? `${latestReadiness.date} · Oura`
							: "No Oura data yet"
					}
				/>
				<MetricCard
					label="Sleep"
					value={latestSleep?.sleepHours ? `${latestSleep.sleepHours}h` : "—"}
					detail={
						latestSleep?.sleepScore
							? `Score ${latestSleep.sleepScore} · ${latestSleep.date}`
							: "Sleep score unavailable"
					}
				/>
				<MetricCard
					label="HRV / RHR"
					value={latestHrv?.hrvMs ? `${latestHrv.hrvMs} ms` : "—"}
					detail={
						latestHrv?.restingHeartRate
							? `RHR ${latestHrv.restingHeartRate} · ${latestHrv.date}`
							: "Resting HR unavailable"
					}
				/>
				<MetricCard
					label="Steps"
					value={latestSteps?.steps ? latestSteps.steps.toLocaleString() : "—"}
					detail={
						latestSteps ? `${latestSteps.date} · Apple Health` : "No steps yet"
					}
				/>
			</div>

			<section className="card compact-card" style={{ gridColumn: "1 / -1" }}>
				<div className="split">
					<div>
						<h2>Chart range</h2>
						<p className="muted">
							Showing {activeRange?.label ?? "1M"} of recovery and steps data.
						</p>
					</div>
					<div className="button-row range-buttons">
						{timeRanges.map((range) => (
							<button
								className={`btn secondary${timeRange === range.value ? " active" : ""}`}
								key={range.value}
								onClick={() => setTimeRange(range.value)}
								type="button"
							>
								{range.label}
							</button>
						))}
					</div>
				</div>
			</section>

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
