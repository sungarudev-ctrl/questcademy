/// Core learning engine contracts for Questcademy Mobile.
/// Source of truth: docs/04-learning-engine-spec.md §2

enum NodeStatus {
  locked,
  available,
  in_progress,
  mastered,
  needs_review,
  relearning,
}

class Attempt {
  final String attemptId;
  final String learnerId;
  final String nodeId;
  final String itemId;
  final int difficultyTier; // 1, 2, 3
  final bool correct;
  final double partialCredit;
  final String? selectedOption;
  final String? misconceptionId;
  final int latencyMs;
  final int hintsUsed; // 0, 1, 2, 3
  final String sessionId;
  final String occurredAt; // ISO-8601
  final bool isReview;
  final bool isPlacement;
  final bool isExam;

  const Attempt({
    required this.attemptId,
    required this.learnerId,
    required this.nodeId,
    required this.itemId,
    required this.difficultyTier,
    required this.correct,
    this.partialCredit = 0.0,
    this.selectedOption,
    this.misconceptionId,
    required this.latencyMs,
    required this.hintsUsed,
    required this.sessionId,
    required this.occurredAt,
    this.isReview = false,
    this.isPlacement = false,
    this.isExam = false,
  });

  bool get isQualifying => !isPlacement && !isExam;

  Map<String, dynamic> toJson() => {
    'attempt_id': attemptId,
    'learner_id': learnerId,
    'node_id': nodeId,
    'item_id': itemId,
    'difficulty_tier': difficultyTier,
    'correct': correct,
    'partial_credit': partialCredit,
    'selected_option': selectedOption,
    'misconception_id': misconceptionId,
    'latency_ms': latencyMs,
    'hints_used': hintsUsed,
    'session_id': sessionId,
    'occurred_at': occurredAt,
    'is_review': isReview,
    'is_placement': isPlacement,
    'is_exam': isExam,
  };
}

class NodeState {
  final String learnerId;
  final String nodeId;
  final NodeStatus status;
  final double abilityElo;
  final int attemptsTotal;
  final List<Attempt> recentWindow;
  final List<String> distinctDays;
  final int maxTierCorrect; // 0, 1, 2, 3
  final String? masteredAt;
  final double stability;
  final double difficultyFsrs;
  final String? dueAt;
  final int lapses;

  const NodeState({
    required this.learnerId,
    required this.nodeId,
    required this.status,
    required this.abilityElo,
    required this.attemptsTotal,
    required this.recentWindow,
    required this.distinctDays,
    required this.maxTierCorrect,
    this.masteredAt,
    required this.stability,
    required this.difficultyFsrs,
    this.dueAt,
    this.lapses = 0,
  });

  NodeState copyWith({
    NodeStatus? status,
    double? abilityElo,
    int? attemptsTotal,
    List<Attempt>? recentWindow,
    List<String>? distinctDays,
    int? maxTierCorrect,
    String? masteredAt,
    double? stability,
    double? difficultyFsrs,
    String? dueAt,
    int? lapses,
  }) {
    return NodeState(
      learnerId: learnerId,
      nodeId: nodeId,
      status: status ?? this.status,
      abilityElo: abilityElo ?? this.abilityElo,
      attemptsTotal: attemptsTotal ?? this.attemptsTotal,
      recentWindow: recentWindow ?? this.recentWindow,
      distinctDays: distinctDays ?? this.distinctDays,
      maxTierCorrect: maxTierCorrect ?? this.maxTierCorrect,
      masteredAt: masteredAt ?? this.masteredAt,
      stability: stability ?? this.stability,
      difficultyFsrs: difficultyFsrs ?? this.difficultyFsrs,
      dueAt: dueAt ?? this.dueAt,
      lapses: lapses ?? this.lapses,
    );
  }
}

class EngineItem {
  final String itemId;
  final String nodeId;
  final int difficultyTier;
  final double difficultyElo;

  const EngineItem({
    required this.itemId,
    required this.nodeId,
    required this.difficultyTier,
    required this.difficultyElo,
  });
}

class EngineDecision {
  final String action; // serve_item | serve_remediation
  final String nodeId;
  final String? itemId;
  final String? misconceptionId;
  final String reason;

  const EngineDecision({
    required this.action,
    required this.nodeId,
    this.itemId,
    this.misconceptionId,
    required this.reason,
  });
}
