import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layers, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { pageHead } from "@/lib/seo";
import { StudioLayout } from "@/components/hyper/StudioLayout";
import { WorkflowCard } from "@/components/hyper/WorkflowCard";
import { Button } from "@/components/ui/button";
import { listSocialConnections } from "@/lib/social.functions";
import {
  deleteWorkflow,
  listWorkflows,
  runWorkflowNow,
  setWorkflowEnabled,
} from "@/lib/workflows.functions";
import type { SocialConnection, Workflow } from "@/lib/social.shared";

export const Route = createFileRoute("/_authenticated/workflows/")({
  head: () =>
    pageHead({
      path: "/workflows",
      title: "Workflows — Schedule & Publish Social Content",
      description:
        "Automated publishing workflows: generate videos on a schedule and publish them to Facebook, Instagram and Threads.",
      noindex: true,
      keywords: ["social media automation", "post scheduling", "reel publishing", "cross-posting"],
    }),
  component: WorkflowsPage,
});

type FilterTab = "all" | "active" | "scheduled" | "paused";

export function WorkflowsPage() {
  const fetchWorkflows = useServerFn(listWorkflows);
  const fetchConnections = useServerFn(listSocialConnections);
  const remove = useServerFn(deleteWorkflow);
  const run = useServerFn(runWorkflowNow);
  const toggle = useServerFn(setWorkflowEnabled);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [runningId, setRunningId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const workflows = useQuery({
    queryKey: ["workflows"],
    queryFn: () => fetchWorkflows(),
    refetchInterval: (query) =>
      (query.state.data ?? []).some((w) => w.runState && w.runState !== "idle") ? 15_000 : false,
  });

  const connections = useQuery({
    queryKey: ["social-connections"],
    queryFn: () => fetchConnections(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["workflows"] });

  const rawItems: Workflow[] = useMemo(() => workflows.data ?? [], [workflows.data]);
  const socialList: SocialConnection[] = useMemo(() => connections.data ?? [], [connections.data]);

  // Clean filter and search
  const filteredItems = useMemo(() => {
    let list = [...rawItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.caption?.toLowerCase().includes(q) ||
          w.hookTitle?.toLowerCase().includes(q),
      );
    }

    if (filterTab === "active") {
      list = list.filter((w) => w.enabled);
    } else if (filterTab === "paused") {
      list = list.filter((w) => !w.enabled);
    } else if (filterTab === "scheduled") {
      list = list.filter((w) => w.triggerType === "schedule");
    }

    return list;
  }, [rawItems, searchQuery, filterTab]);

  const handleRun = async (workflow: Workflow) => {
    setRunningId(workflow.id);
    try {
      await run({ data: { id: workflow.id } });
      toast.success(`Run started for "${workflow.name}"`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Run failed to start");
    } finally {
      setRunningId(null);
    }
  };

  const handleToggle = async (workflow: Workflow, enabled: boolean) => {
    try {
      await toggle({ data: { id: workflow.id, enabled } });
      toast.success(enabled ? `"${workflow.name}" activated` : `"${workflow.name}" paused`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update workflow");
    }
  };

  const handleDelete = async (workflow: Workflow) => {
    try {
      await remove({ data: { id: workflow.id } });
      toast.success("Workflow deleted");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete workflow");
    }
  };

  return (
    <StudioLayout className="max-w-4xl">
      <div className="w-full space-y-4 pb-16 pt-1">
        {/* Clean Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Workflows
              </h1>
              {rawItems.length > 0 ? (
                <span className="rounded-full bg-surface-2 border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {rawItems.length}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Automated video creation and scheduled publishing across Meta channels.
            </p>
          </div>

          <Button
            asChild
            className="rounded-full h-9 px-4 gap-1.5 font-semibold text-[13px] shrink-0 self-start sm:self-auto"
          >
            <Link to="/workflows/create">
              <Plus className="size-4" />
              <span>New Workflow</span>
            </Link>
          </Button>
        </header>

        {/* Toolbar: Search and Filter Chips */}
        {rawItems.length > 0 ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "active", label: "Active" },
                  { id: "scheduled", label: "Scheduled" },
                  { id: "paused", label: "Paused" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                    filterTab === tab.id
                      ? "bg-foreground text-background font-semibold"
                      : "border border-border bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Compact Search Input */}
            <div className="relative min-w-[200px] sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workflows..."
                className="w-full rounded-full border border-border bg-surface pl-8 pr-7 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-border-strong"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Workflows List */}
        {workflows.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <div className="max-w-sm mx-auto space-y-2">
              <Layers className="size-8 mx-auto text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm font-medium text-foreground">
                {rawItems.length === 0 ? "No workflows created yet." : "No matching workflows."}
              </p>
              <p className="text-xs text-muted-foreground">
                {rawItems.length === 0
                  ? "Create a workflow to generate AI videos and auto-publish them."
                  : "Try clearing your search or switching filter tabs."}
              </p>
              <div className="pt-2">
                {rawItems.length === 0 ? (
                  <Button asChild size="sm" className="rounded-full text-xs">
                    <Link to="/workflows/create">Create workflow</Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterTab("all");
                    }}
                    className="rounded-full text-xs"
                  >
                    Reset filters
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredItems.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                connections={socialList}
                isRunning={runningId === workflow.id}
                onRun={handleRun}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </StudioLayout>
  );
}
