import { Toaster as Sonner, toast } from "sonner";
import type { ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="system"
      position="top-right"
      richColors
      closeButton
      {...props}
    />
  );
}

export { toast };
