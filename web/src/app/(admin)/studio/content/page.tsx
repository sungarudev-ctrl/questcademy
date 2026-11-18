"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ReviewQueueTable } from "@/components/admin/ReviewQueueTable";

const DRAFT_CONTENTS = [
  {
    id: "content-1",
    title: "MATH.FRAC.ADD_UNLIKE — Lesson Draft (v1)",
    subtitle: "3 worked examples, Flesch-Kincaid Grade 4.2, 12 min read",
    status: "draft",
    tag: "MATH.FRAC.ADD_UNLIKE",
  },
  {
    id: "content-2",
    title: "MATH.FRAC.SUBTRACT — Lesson Draft (v1)",
    subtitle: "4 worked examples, Flesch-Kincaid Grade 5.0, 14 min read",
    status: "draft",
    tag: "MATH.FRAC.SUBTRACT",
  },
  {
    id: "content-3",
    title: "MATH.DEC.CONVERT_FRAC — Lesson Draft (v1)",
    subtitle: "3 worked examples, Flesch-Kincaid Grade 4.8, 11 min read",
    status: "draft",
    tag: "MATH.DEC.CONVERT_FRAC",
  },
];

export default function ContentReviewListPage() {
  const router = useRouter();

  const items = DRAFT_CONTENTS.map((c) => ({
    ...c,
    onReview: () => router.push(`/studio/content/${c.id}`),
  }));

  return (
    <div className="space-y-6">
      <ReviewQueueTable
        items={items}
        title="Lesson Content Draft Review Queue"
        filterOptions={["draft", "review", "published"]}
      />
    </div>
  );
}
