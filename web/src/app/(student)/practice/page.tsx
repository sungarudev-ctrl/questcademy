"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNodeStateStore } from "@/lib/stores/useNodeStateStore";

export default function PracticeIndexPage() {
  const router = useRouter();
  const { nodes } = useNodeStateStore();

  useEffect(() => {
    const nodeList = Object.values(nodes);
    const targetNode =
      nodeList.find((n) => n.status === "needs_review") ||
      nodeList.find((n) => n.status === "in_progress") ||
      nodeList.find((n) => n.status === "available") ||
      nodeList[0];

    const targetId = targetNode?.node_id || "MATH.FRAC.ADD_UNLIKE";
    router.replace(`/practice/${encodeURIComponent(targetId)}`);
  }, [nodes, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading your practice session...</p>
      </div>
    </div>
  );
}
