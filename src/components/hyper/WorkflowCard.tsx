import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import {
  AtSign,
  Calendar,
  Clock,
  Copy,
  ExternalLink,
  Facebook,
  Film,
  Image as ImageIcon,
  Instagram,
  Layers,
  Loader2,
  MoreHorizontal,
  Play,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ACTION_LABELS,
  REPEAT_LABELS,
  TRIGGER_LABELS,
  type SocialConnection,
  type SocialProvider,
  type Workflow,
} from "@/lib/social.shared";

const PROVIDER_ICONS: Record<SocialProvider, typeof Facebook> = {
  facebook_page: Facebook,
  instagram: Instagram,
  threads: AtSign,
};

const PROVIDER_COLORS: Record<SocialProvider, string> = {
  facebook_page: "text-[#1877F2]",
  instagram: "text-[#E4405F]",
  threads: "text-foreground",
};

export interface WorkflowCardProps {
  workflow: Workflow;
  connections: SocialConnection[];
  isRunning?: boolean;
  onRun: (workflow: Workflow) => Promise<void>;
  onToggle: (workflow: Workflow, enabled: boolean) => Promise<void>;
  onDelete: (workflow: Workflow) => Promise<void>;
}

export function WorkflowCard({
  workflow,
  connections,
  isRunning = false,
  onRun,
  onToggle,
  onDelete,
}: WorkflowCardProps) {
  const navigate = useNavigate();
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Map connected social targets to their provider
  const targetAccounts = useMemo(() => {
    const map = new Map<string, SocialConnection>();
    for (const c of connections) {
      map.set(c.id, c);
    }
    return workflow.targets.map((id) => map.get(id)).filter(Boolean) as SocialConnection[];
  }, [connections, workflow.targets]);

  const isVideo = workflow.actionType === "publish_reel" || workflow.actionType === "crosspost";
  const isGenerating =
    workflow.runState === "rendering" ||
    workflow.runState === "requested" ||
    workflow.runState === "retry";

  // Formatted next run label
  const nextRunText = useMemo(() => {
    if (!workflow.enabled || workflow.triggerType !== "schedule" || !workflow.nextDueAt) {
      return null;
    }
    try {
      const date = new Date(workflow.nextDueAt);
      const isToday = new Date().toDateString() === date.toDateString();
      if (isToday) {
        return `Today at ${format(date, "h:mm a")}`;
      }
      return `${format(date, "MMM d")} at ${format(date, "h:mm a")}`;
    } catch {
      return null;
    }
  }, [workflow.enabled, workflow.triggerType, workflow.nextDueAt]);

  return (
    <>
      <div
        id={`workflow-card-${workflow.id}`}
        className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border transition-all duration-200 bg-surface px-4 py-3.5 ${
          isGenerating
            ? "border-spectral-3/60 ring-1 ring-spectral-3/20"
            : workflow.enabled
              ? "border-border hover:border-border-strong hover:bg-surface-2/40"
              : "border-border/50 opacity-70 hover:opacity-100"
        }`}
      >
        {/* Left side: Icon, Name, and Clean Metadata */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Action Squircle Icon */}
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-xl border border-border/70 ${
              isVideo ? "bg-surface-2 text-spectral-3" : "bg-surface-2 text-foreground"
            }`}
          >
            {isVideo ? (
              <Film className="size-4.5" strokeWidth={2} />
            ) : workflow.actionType === "publish_post" ? (
              <ImageIcon className="size-4.5" strokeWidth={2} />
            ) : (
              <Layers className="size-4.5" strokeWidth={2} />
            )}
          </div>

          {/* Optional Media Thumbnail */}
          {workflow.mediaUrl ? (
            <button
              type="button"
              onClick={() => setMediaModalOpen(true)}
              className="group/thumb relative size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2"
              title="Click to preview media"
            >
              {isVideo ? (
                <video src={workflow.mediaUrl} className="size-full object-cover" muted />
              ) : (
                <img src={workflow.mediaUrl} alt="" className="size-full object-cover" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                <Play className="size-3 fill-white text-white ml-0.5" />
              </div>
            </button>
          ) : null}

          {/* Title & Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[14px] font-semibold text-foreground">
                {workflow.name}
              </h3>

              {/* Status Indicator */}
              {isGenerating ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-spectral-3/15 px-2 py-0.5 text-[10px] font-bold text-spectral-3 animate-pulse">
                  <Loader2 className="size-2.5 animate-spin" />
                  Generating
                </span>
              ) : workflow.enabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Paused
                </span>
              )}
            </div>

            {/* Single clean metadata line */}
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
              {/* Trigger schedule / manual */}
              <span>
                {workflow.triggerType === "schedule" ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {REPEAT_LABELS[workflow.repeatRule]}
                    {workflow.timeSlots.length ? ` (${workflow.timeSlots.join(", ")})` : ""}
                  </span>
                ) : (
                  "Manual trigger"
                )}
              </span>

              <span>·</span>

              {/* Action type */}
              <span>{ACTION_LABELS[workflow.actionType]}</span>

              {/* Next due (if applicable) */}
              {nextRunText ? (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-foreground/80 font-medium">
                    <Calendar className="size-3 text-muted-foreground" />
                    Next: {nextRunText}
                  </span>
                </>
              ) : null}

              {/* Connected Platform Icons */}
              {targetAccounts.length > 0 ? (
                <>
                  <span>·</span>
                  <div className="flex items-center gap-1.5">
                    {targetAccounts.map((account) => {
                      const Icon = PROVIDER_ICONS[account.provider];
                      const colorClass = PROVIDER_COLORS[account.provider];
                      return (
                        <span
                          key={account.id}
                          title={`${account.displayName || account.externalId} (${account.provider})`}
                          className="flex items-center"
                        >
                          <Icon className={`size-3.5 ${colorClass}`} />
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <span>·</span>
                  <span className="text-[11px] text-amber-500/90 font-medium">
                    No destinations linked
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Quick Actions */}
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          {/* Quick Run Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isRunning || isGenerating}
            onClick={() => onRun(workflow)}
            className="h-8 px-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
            title="Trigger workflow run now"
          >
            {isRunning ? (
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <Play className="size-3.5 fill-current mr-1.5 text-spectral-3" />
            )}
            Run
          </Button>

          {/* Enabled Switch */}
          <div className="flex items-center px-1">
            <Switch
              checked={workflow.enabled}
              aria-label={workflow.enabled ? "Pause workflow" : "Activate workflow"}
              onCheckedChange={(enabled) => onToggle(workflow, enabled)}
            />
          </div>

          {/* Edit Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/workflows/create", search: { id: workflow.id } })}
            className="size-8 text-muted-foreground hover:text-foreground"
            title="Edit workflow"
          >
            <Settings className="size-4" />
          </Button>

          {/* More Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => onRun(workflow)}
                disabled={isRunning || isGenerating}
                className="cursor-pointer gap-2"
              >
                <Play className="size-4 text-spectral-3" />
                <span>Run Now</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate({ to: "/workflows/create", search: { id: workflow.id } })}
                className="cursor-pointer gap-2"
              >
                <Settings className="size-4" />
                <span>Edit Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(workflow.id);
                  toast.success("Workflow ID copied");
                }}
                className="cursor-pointer gap-2"
              >
                <Copy className="size-4" />
                <span>Copy ID</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteConfirmOpen(true)}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Media Lightbox Dialog */}
      {workflow.mediaUrl ? (
        <Dialog open={mediaModalOpen} onOpenChange={setMediaModalOpen}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border border-border">
            <DialogHeader className="p-4 border-b border-border">
              <DialogTitle className="text-base font-bold truncate">{workflow.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Media asset attached to this workflow
              </DialogDescription>
            </DialogHeader>
            <div className="aspect-video w-full bg-black flex items-center justify-center">
              {isVideo ? (
                <video
                  src={workflow.mediaUrl}
                  controls
                  autoPlay
                  className="max-h-[70vh] w-full object-contain"
                />
              ) : (
                <img
                  src={workflow.mediaUrl}
                  alt={workflow.name}
                  className="max-h-[70vh] w-full object-contain"
                />
              )}
            </div>
            <div className="p-3 bg-surface flex justify-between items-center text-xs text-muted-foreground">
              <span className="truncate max-w-sm">{workflow.mediaUrl}</span>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                <a href={workflow.mediaUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3 mr-1" /> Open
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Workflow</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">"{workflow.name}"</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={async () => {
                setIsDeleting(true);
                try {
                  await onDelete(workflow);
                  setDeleteConfirmOpen(false);
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
