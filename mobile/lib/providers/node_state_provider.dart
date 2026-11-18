import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/engine/engine_models.dart';
import '../core/engine/engine_binding.dart';

class ClientNodeInfo {
  final NodeState state;
  final String learnerTitle;
  final String topic;
  final List<String> prerequisites;
  final int estMinutes;

  const ClientNodeInfo({
    required this.state,
    required this.learnerTitle,
    required this.topic,
    required this.prerequisites,
    required this.estMinutes,
  });

  ClientNodeInfo copyWith({
    NodeState? state,
    String? learnerTitle,
    String? topic,
    List<String>? prerequisites,
    int? estMinutes,
  }) {
    return ClientNodeInfo(
      state: state ?? this.state,
      learnerTitle: learnerTitle ?? this.learnerTitle,
      topic: topic ?? this.topic,
      prerequisites: prerequisites ?? this.prerequisites,
      estMinutes: estMinutes ?? this.estMinutes,
    );
  }
}

final Map<String, ClientNodeInfo> initialCurriculumNodes = {
  'MATH.FRAC.EQUIV': ClientNodeInfo(
    state: const NodeState(
      learnerId: 'learner-mobile-01',
      nodeId: 'MATH.FRAC.EQUIV',
      status: NodeStatus.mastered,
      abilityElo: 1250.0,
      attemptsTotal: 5,
      recentWindow: [
        Attempt(
          attemptId: 'att-1',
          learnerId: 'learner-mobile-01',
          nodeId: 'MATH.FRAC.EQUIV',
          itemId: 'i-1',
          difficultyTier: 2,
          correct: true,
          latencyMs: 2000,
          hintsUsed: 0,
          sessionId: 's-1',
          occurredAt: '2026-09-10T12:00:00Z',
        ),
        Attempt(
          attemptId: 'att-2',
          learnerId: 'learner-mobile-01',
          nodeId: 'MATH.FRAC.EQUIV',
          itemId: 'i-2',
          difficultyTier: 3,
          correct: true,
          latencyMs: 2500,
          hintsUsed: 0,
          sessionId: 's-1',
          occurredAt: '2026-09-12T12:00:00Z',
        ),
      ],
      distinctDays: ['2026-09-10', '2026-09-12'],
      maxTierCorrect: 3,
      stability: 7.2,
      difficultyFsrs: 4.5,
      dueAt: '2026-09-20T00:00:00Z',
    ),
    learnerTitle: 'Equivalent Fractions',
    topic: 'Fractions & Decimals',
    prerequisites: [],
    estMinutes: 10,
  ),
  'MATH.FRAC.COMPARE': const ClientNodeInfo(
    state: NodeState(
      learnerId: 'learner-mobile-01',
      nodeId: 'MATH.FRAC.COMPARE',
      status: NodeStatus.mastered,
      abilityElo: 1260.0,
      attemptsTotal: 4,
      recentWindow: [],
      distinctDays: ['2026-09-11', '2026-09-13'],
      maxTierCorrect: 3,
      stability: 5.8,
      difficultyFsrs: 4.8,
      dueAt: '2026-09-19T00:00:00Z',
    ),
    learnerTitle: 'Comparing Fractions',
    topic: 'Fractions & Decimals',
    prerequisites: ['MATH.FRAC.EQUIV'],
    estMinutes: 12,
  ),
  'MATH.FRAC.ADD_UNLIKE': const ClientNodeInfo(
    state: NodeState(
      learnerId: 'learner-mobile-01',
      nodeId: 'MATH.FRAC.ADD_UNLIKE',
      status: NodeStatus.in_progress,
      abilityElo: 1240.0,
      attemptsTotal: 3,
      recentWindow: [],
      distinctDays: ['2026-09-15'],
      maxTierCorrect: 2,
      stability: 3.0,
      difficultyFsrs: 5.0,
      dueAt: '2026-09-16T00:00:00Z',
    ),
    learnerTitle: 'Adding Unlike Fractions',
    topic: 'Fractions & Decimals',
    prerequisites: ['MATH.FRAC.COMPARE'],
    estMinutes: 14,
  ),
  'MATH.FRAC.SUBTRACT': const ClientNodeInfo(
    state: NodeState(
      learnerId: 'learner-mobile-01',
      nodeId: 'MATH.FRAC.SUBTRACT',
      status: NodeStatus.available,
      abilityElo: 1200.0,
      attemptsTotal: 0,
      recentWindow: [],
      distinctDays: [],
      maxTierCorrect: 0,
      stability: 3.0,
      difficultyFsrs: 5.0,
    ),
    learnerTitle: 'Subtracting Unlike Fractions',
    topic: 'Fractions & Decimals',
    prerequisites: ['MATH.FRAC.ADD_UNLIKE'],
    estMinutes: 14,
  ),
  'MATH.ALG.LINEAR_ONE_VAR': const ClientNodeInfo(
    state: NodeState(
      learnerId: 'learner-mobile-01',
      nodeId: 'MATH.ALG.LINEAR_ONE_VAR',
      status: NodeStatus.locked,
      abilityElo: 1200.0,
      attemptsTotal: 0,
      recentWindow: [],
      distinctDays: [],
      maxTierCorrect: 0,
      stability: 3.0,
      difficultyFsrs: 5.5,
    ),
    learnerTitle: 'Linear Equations in One Variable',
    topic: 'Algebra & Equations',
    prerequisites: ['MATH.FRAC.ADD_UNLIKE', 'MATH.FRAC.SUBTRACT'],
    estMinutes: 18,
  ),
  'MATH.GEO.PYTHAGORAS': const ClientNodeInfo(
    state: NodeState(
      learnerId: 'learner-mobile-01',
      nodeId: 'MATH.GEO.PYTHAGORAS',
      status: NodeStatus.locked,
      abilityElo: 1200.0,
      attemptsTotal: 0,
      recentWindow: [],
      distinctDays: [],
      maxTierCorrect: 0,
      stability: 3.0,
      difficultyFsrs: 5.2,
    ),
    learnerTitle: 'Pythagorean Theorem',
    topic: 'Geometry & Measurement',
    prerequisites: ['MATH.ALG.LINEAR_ONE_VAR'],
    estMinutes: 20,
  ),
};

class NodeStateNotifier extends StateNotifier<Map<String, ClientNodeInfo>> {
  NodeStateNotifier() : super(Map.from(initialCurriculumNodes));

  void recordAttempt({
    required String nodeId,
    required bool correct,
    required int hintsUsed,
    required int tier,
    required int latencyMs,
  }) {
    final nodeInfo = state[nodeId];
    if (nodeInfo == null) return;

    final today = DateTime.now().toUtc().toIso8601String();
    final attempt = Attempt(
      attemptId: 'att-${DateTime.now().millisecondsSinceEpoch}',
      learnerId: nodeInfo.state.learnerId,
      nodeId: nodeId,
      itemId: 'item-$nodeId-$tier',
      difficultyTier: tier,
      correct: correct,
      latencyMs: latencyMs,
      hintsUsed: hintsUsed,
      sessionId: 'session-mobile',
      occurredAt: today,
    );

    final newWindow = [...nodeInfo.state.recentWindow, attempt];
    if (newWindow.length > 5) newWindow.removeAt(0);

    final newMaxTier = correct ? mathMax(nodeInfo.state.maxTierCorrect, tier) : nodeInfo.state.maxTierCorrect;

    // Update Elo through authoritative engine binding
    final updatedState = EngineBinding.updateElo(
      state: nodeInfo.state.copyWith(
        recentWindow: newWindow,
        maxTierCorrect: newMaxTier,
        status: nodeInfo.state.status == NodeStatus.available ? NodeStatus.in_progress : nodeInfo.state.status,
      ),
      attempt: attempt,
    );

    // Evaluate mastery via authoritative engine predicate
    final mastered = EngineBinding.isMastered(updatedState);
    final finalState = mastered
        ? updatedState.copyWith(
            status: NodeStatus.mastered,
            masteredAt: today,
            dueAt: DateTime.now().add(const Duration(days: 3)).toIso8601String(),
          )
        : updatedState;

    state = {
      ...state,
      nodeId: nodeInfo.copyWith(state: finalState),
    };
  }

  static int mathMax(int a, int b) => a > b ? a : b;
}

final nodeStateProvider = StateNotifierProvider<NodeStateNotifier, Map<String, ClientNodeInfo>>((ref) {
  return NodeStateNotifier();
});
