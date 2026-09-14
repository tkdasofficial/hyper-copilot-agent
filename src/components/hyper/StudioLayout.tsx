import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BackgroundTasks } from "./BackgroundTasks";
import { usePrefetchRoutes } from "./usePrefetchRoutes";
import { cn } from "@/lib/utils";

export type StudioFeature = { id: string; label: string; icon: LucideIcon };

export function StudioLayout({ children, className }: { children: ReactNode; className?: string }) {
  usePrefetchRoutes();

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <Sidebar />
      <div className="lg:pl-[248px]">
        <TopBar />
        <main className={cn("mx-auto max-w-3xl px-4 pb-16 pt-5 lg:px-8", className)}>
          {children}
        </main>
      </div>
      <BackgroundTasks />
    </div>
  );
}
