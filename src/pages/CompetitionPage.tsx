import React from "react";
import { daysRemainingUntil } from "../domain/competition.ts";
import { useAppData } from "../storage/appStorage.tsx";

export function CompetitionPage() {
	const { data } = useAppData();
	return (
		<React.Fragment>
			<div className="grid">
				<section className="card">
					<h2>{data.competition.name}</h2>
					<p>
						<strong>
							{daysRemainingUntil(data.competition.date)} days out
						</strong>
					</p>
					<p>{data.competition.location}</p>
					<p className="muted">
						Weigh-in: {data.competition.weighInDate},{" "}
						{data.competition.weighInWindow}
					</p>
					<p className="muted">Source: {data.competition.sourceUrl}</p>
				</section>
				<section className="grid two">
					{data.competition.events.map((event) => (
						<article className="card event-card" key={event.id}>
							<div className="split">
								<h3>{event.name}</h3>
								<span className="pill">{event.category}</span>
							</div>
							<p className="muted">
								{event.timeLimitSeconds
									? `${event.timeLimitSeconds}s limit`
									: ""}{" "}
								{event.distanceFt ? `· ${event.distanceFt} ft` : ""}{" "}
								{event.attempts ? `· ${event.attempts} attempts` : ""}
							</p>
							<strong>Rules</strong>
							<ul>
								{event.rules.map((rule) => (
									<li key={rule}>{rule}</li>
								))}
							</ul>
							<strong>Allowed</strong>
							<p>{event.allowedEquipment.join(", ")}</p>
							{event.prohibitedEquipment?.length ? (
								<>
									<strong>Prohibited</strong>
									<p>{event.prohibitedEquipment.join(", ")}</p>
								</>
							) : null}
							<p className="muted">
								Contest weight: {event.contestWeightLb ?? "TBA/edit later"}
							</p>
						</article>
					))}
				</section>
			</div>
		</React.Fragment>
	);
}
