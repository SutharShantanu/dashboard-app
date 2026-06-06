import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-6">
      <div className="flex flex-col items-center space-y-2 text-center">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-3xl font-bold tracking-tight">404 - Page Not Found</h2>
        <p className="text-muted-foreground max-w-[500px]">
          The page you are looking for doesn't exist or has been moved.
        </p>
      </div>
      <Link href="/">
        <Button variant="default">Return Home</Button>
      </Link>
    </div>
  );
}
