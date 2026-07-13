import React from "react";
import {
	Activity,
	Dumbbell,
	HeartPulse,
	Home,
	Scale,
	Settings,
	Trophy,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const nav = [
	{ to: "/", label: "Home", icon: Home },
	{ to: "/weight", label: "Weight", icon: Scale },
	{ to: "/nutrition", label: "Food", icon: Activity },
	{ to: "/training", label: "Train", icon: Dumbbell },
	{ to: "/competition", label: "Comp", icon: Trophy },
	{ to: "/recovery", label: "Recover", icon: HeartPulse },
	{ to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
	return (
		<React.Fragment>
			<div className="app-shell">
				<header className="topbar">
					<p className="eyebrow">
						Great Lakes Strongest Man VIII · Masters 220
					</p>
					<h1>Competition Command Center</h1>
					<p className="topbar-subtitle">
						Weight cut, event prep, recovery, and PR tracking in one place.
					</p>
				</header>
				<main className="page">{children}</main>
				<nav className="bottom-nav">
					{nav.map(({ to, label, icon: Icon }) => (
						<NavLink key={to} to={to} end={to === "/"}>
							<Icon size={18} />
							<span>{label}</span>
						</NavLink>
					))}
				</nav>
			</div>
		</React.Fragment>
	);
}
