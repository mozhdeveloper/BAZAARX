import { FallbackProps } from "react-error-boundary";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";

export function AppErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div
            role="alert"
            className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center"
        >
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
                {error instanceof Error ? error.message : "An unexpected error occurred."}
            </p>
            <Button onClick={resetErrorBoundary}>Try again</Button>
        </div>
    );
}
