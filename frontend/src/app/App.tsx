import { RouterProvider } from "react-router-dom";
import { QueryProvider } from "./providers/QueryProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";

export default function App() {
	return (
		<QueryProvider>
			<AuthProvider>
				<RouterProvider router={router} />
				<Toaster />
			</AuthProvider>
		</QueryProvider>
	);
}