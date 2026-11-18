"use client";

import React, { useState } from "react";
import { SkillGraphTree } from "@/components/admin/SkillGraphTree";
import { SkillNode } from "@/types";

const INITIAL_NODES: SkillNode[] = [
  {
    node_id: "MATH.FRAC.ADD_UNLIKE",
    subject: "mathematics",
    topic: "fractions",
    title: "Add Unlike Fractions",
    learner_title: "Adding Different Fractions",
    description: "Find a common denominator, convert equivalent fractions, and sum the numerators.",
    est_minutes: 12,
    difficulty_elo: 1250,
    status: "live",
    prerequisites: ["MATH.FRAC.LCD", "MATH.FRAC.EQUIV"],
  },
  {
    node_id: "MATH.FRAC.LCD",
    subject: "mathematics",
    topic: "fractions",
    title: "Least Common Denominator",
    learner_title: "Finding Common Denominators",
    description: "Determine the least common multiple of two denominators.",
    est_minutes: 10,
    difficulty_elo: 1180,
    status: "live",
    prerequisites: ["MATH.NUM.LCM"],
  },
  {
    node_id: "MATH.FRAC.SUBTRACT",
    subject: "mathematics",
    topic: "fractions",
    title: "Subtract Unlike Fractions",
    learner_title: "Subtracting Different Fractions",
    description: "Subtract fractions with differing denominators using LCD conversion.",
    est_minutes: 14,
    difficulty_elo: 1290,
    status: "review",
    prerequisites: ["MATH.FRAC.ADD_UNLIKE"],
  },
  {
    node_id: "MATH.DEC.CONVERT_FRAC",
    subject: "mathematics",
    topic: "decimals",
    title: "Convert Fractions to Decimals",
    learner_title: "Fractions to Decimals",
    description: "Convert a rational fraction to a terminating or recurring decimal.",
    est_minutes: 11,
    difficulty_elo: 1220,
    status: "draft",
    prerequisites: ["MATH.NUM.DIVISION"],
  },
];

export default function SkillGraphPage() {
  const [nodes, setNodes] = useState<SkillNode[]>(INITIAL_NODES);
  const [notification, setNotification] = useState<string | null>(null);

  const handleGenerateContent = async (nodeId: string) => {
    setNotification(`Enqueued content generation job for node: ${nodeId}`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeprecateNode = async (nodeId: string, reason: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.node_id === nodeId ? { ...n, status: "deprecated" } : n))
    );
    setNotification(`Node ${nodeId} deprecated with reason: "${reason}"`);
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-3.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs shadow-lg animate-in fade-in">
          {notification}
        </div>
      )}

      <SkillGraphTree
        nodes={nodes}
        onGenerateContent={handleGenerateContent}
        onDeprecateNode={handleDeprecateNode}
      />
    </div>
  );
}
