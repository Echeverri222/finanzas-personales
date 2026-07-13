import { Label } from "@/components/ui/label";

/** Label + control wrapper for compact form rows. */
export function Field({ label, htmlFor, children, className }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5 block">
        {label}
      </Label>
      {children}
    </div>
  );
}
