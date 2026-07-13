import React from "react";

export function MetricCard({
	label,
	value,
	detail,
	tone,
}: {
	label: string;
	value: string | number;
	detail?: string;
	tone?: "danger" | "success";
}) {
	return (
		<section className="card metric">
			<span className="muted">{label}</span>
			<strong className={tone}>{value}</strong>
			{detail ? <span className="muted">{detail}</span> : null}
		</section>
	);
}
