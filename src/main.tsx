import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./app/App.tsx";
import { AppDataProvider } from "./storage/appStorage.tsx";
import "./styles.css";

const rootElement = (
	globalThis as typeof globalThis & {
		document: { getElementById: (id: string) => HTMLElement | null };
	}
).document.getElementById("root");

ReactDOM.createRoot(rootElement!).render(
	<React.StrictMode>
		<HashRouter>
			<AppDataProvider>
				<App />
			</AppDataProvider>
		</HashRouter>
	</React.StrictMode>,
);
