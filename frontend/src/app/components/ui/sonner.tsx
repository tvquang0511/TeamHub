import { Toaster as Sonner, toast } from "sonner";
import type { ToasterProps } from "sonner";
import { useTheme } from "../../providers/ThemeProvider";

export function Toaster(props: ToasterProps) {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as any}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className: "font-sans text-xs rounded-xl shadow-xl border border-border/80 backdrop-blur-md",
        style: {
          padding: "12px 16px",
        },
      }}
      {...props}
    />
  );
}

export { toast };
