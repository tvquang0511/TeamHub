import { RouterProvider } from "react-router-dom";
import { QueryProvider } from "./providers/QueryProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";

export default function App() {
	return (
		<QueryProvider>
			<ThemeProvider defaultTheme="system" storageKey="teamhub-theme">
				<AuthProvider>
					<RouterProvider router={router} />
					<Toaster />
				</AuthProvider>
			</ThemeProvider>
		</QueryProvider>
	);
}