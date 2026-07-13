import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell.tsx";
import { BodyweightPage } from "../pages/BodyweightPage.tsx";
import { CompetitionPage } from "../pages/CompetitionPage.tsx";
import { DashboardPage } from "../pages/DashboardPage.tsx";
import { NutritionPage } from "../pages/NutritionPage.tsx";
import { RecoveryPage } from "../pages/RecoveryPage.tsx";
import { SettingsPage } from "../pages/SettingsPage.tsx";
import { TrainingPage } from "../pages/TrainingPage.tsx";

export function App() {
	return (
		<AppShell>
			<Routes>
				<Route path="/" element={<DashboardPage />} />
				<Route path="/weight" element={<BodyweightPage />} />
				<Route path="/nutrition" element={<NutritionPage />} />
				<Route path="/training" element={<TrainingPage />} />
				<Route path="/competition" element={<CompetitionPage />} />
				<Route path="/recovery" element={<RecoveryPage />} />
				<Route path="/settings" element={<SettingsPage />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</AppShell>
	);
}
