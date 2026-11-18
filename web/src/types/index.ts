/**
 * Content Studio Domain Types
 * Source of truth: docs/plan.md, docs/02-curriculum-framework-spec.md, docs/05-assessment-item-spec.md
 */

export type FrameworkRolloutPhase =
  | "planned"
  | "importing"
  | "mapping"
  | "authoring"
  | "reviewing"
  | "piloting"
  | "active"
  | "superseded";

export interface FrameworkRollout {
  id: string;
  framework_id: string;
  country_code: string;
  phase: FrameworkRolloutPhase;
  coverage_pct: number;
  blockers: string[];
  started_at: string;
  activated_at: string | null;
  superseded_at: string | null;
}

export interface CurriculumFramework {
  framework_id: string;
  country_code: string;
  board: string;
  subject: string;
  version: string;
  locale: string;
  currency: string;
  effective_from: string;
  effective_until?: string | null;
  status: string;
  grading_scale: Array<{ grade: string; min_score: number }>;
  exam_structure: Record<string, unknown>;
}

export interface Country {
  country_code: string;
  name: string;
  default_locale: string;
  default_currency: string;
  status: string;
}

export interface SyllabusObjective {
  objective_id: string;
  framework_id: string;
  code: string;
  text: string;
  grade_band: string;
  term?: number | null;
  coverage_status?: "full" | "partial" | "unmapped";
}

export interface ObjectiveNodeMapProposal {
  id: string;
  framework_id: string;
  objective_id: string;
  proposed_node: string;
  confidence: number;
  rationale?: string | null;
  review_status: "pending" | "approved" | "rejected";
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
}

export interface SkillNode {
  node_id: string;
  subject: string;
  topic: string;
  subtopic?: string | null;
  title: string;
  learner_title: string;
  description: string;
  grade_band_hint?: string | null;
  est_minutes: number;
  difficulty_elo: number;
  status: "draft" | "review" | "live" | "deprecated";
  prerequisites?: string[];
}

export interface ContentBlock {
  block_id: string;
  node_id?: string;
  ordinal?: number;
  type:
    | "text"
    | "paragraph"
    | "heading"
    | "math"
    | "callout"
    | "worked_example"
    | "table"
    | "image"
    | "code"
    | "interactive"
    | "definition"
    | "tip"
    | "warning"
    | "quote"
    | "list"
    | "divider";
  payload: Record<string, unknown>;
}

export interface SkillNodeContent {
  id: string;
  node_id: string;
  version: number;
  summary?: string | null;
  learning_objectives?: string[] | null;
  sections: ContentBlock[];
  worked_examples: Array<{
    problem: string;
    steps: string[];
    final_answer: string;
  }>;
  key_formulas?: Array<{ latex: string; description: string }> | null;
  analogies?: string[] | null;
  common_mistakes?: Array<{ misconception_id: string; correction: string }> | null;
  estimated_minutes: number;
  status: "draft" | "review" | "published" | "archived";
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  published_at?: string | null;
}

export interface ItemOption {
  id: string;
  option_id?: string;
  content: string;
  correct: boolean;
  is_correct?: boolean;
  misconception_id?: string;
  learner_facing_name?: string;
  misconception?: {
    misconception_id: string;
    learner_facing_name: string;
    explanation?: string;
  };
  explanation?: string;
}

export interface ItemHint {
  level: number;
  tier?: number;
  content?: string;
  text?: string;
}

export interface AssessmentItem {
  item_id: string;
  node_id: string;
  type: string;
  difficulty_tier: 1 | 2 | 3;
  difficulty_elo?: number;
  discrimination_band?: string;
  stem?: Record<string, unknown> | string;
  prompt?: string;
  payload?: {
    options?: ItemOption[];
    [key: string]: unknown;
  };
  options?: ItemOption[];
  hints?: ItemHint[];
  worked_solution?: {
    text?: string;
    [key: string]: unknown;
  };
  solution_steps?: string[];
  reading_level?: number;
  media_bytes?: number;
  media_urls?: string[];
  status?:
    | "draft"
    | "generated"
    | "tagged"
    | "reviewed"
    | "piloting"
    | "live"
    | "calibrating"
    | "calibrated"
    | "revision"
    | "retired"
    | string;
  authoring_status?: string;
  review_status?: string;
}

export interface LocalizationOverride {
  id: string;
  kind: "item" | "content";
  framework_id: string;
  stem_override?: string | null;
  payload_override?: Record<string, unknown> | null;
  section_overrides?: ContentBlock[] | null;
  review_status: "pending" | "approved" | "rejected";
  created_at?: string | null;
}

export interface GenerationJob {
  job_id: string;
  framework_id?: string;
  job_type: string;
  target_id: string;
  status: "queued" | "running" | "completed" | "failed";
  attempts?: number;
  cost_usd?: number;
  error?: string | null;
  started_at?: string;
  created_at?: string;
  completed_at?: string | null;
}

export interface CoverageReport {
  framework_id: string;
  total_objectives: number;
  covered_objectives: number;
  partial_objectives: number;
  unmapped_objectives: number;
  coverage_pct: number;
  eligible_for_activation: boolean;
  objective_details: Array<{
    objective_id: string;
    code: string;
    text: string;
    grade_band: string;
    mapped_nodes: string[];
    nodes_meeting_threshold: string[];
    coverage_status: "full" | "partial" | "unmapped";
  }>;
}
