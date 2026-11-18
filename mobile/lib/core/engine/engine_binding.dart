import 'dart:math' as math;
import 'engine_models.dart';

/// Authoritative Engine Binding for Questcademy Mobile.
/// Single source of truth mirroring pure deterministic engine rules (doc 04 §4, §5, §6, §8).
class EngineBinding {
  static const double eloMin = 400.0;
  static const double eloMax = 2800.0;
  static const double eloBase = 1200.0;

  /// Round to 4 decimal places per doc 04 §5.2.
  static double round4(double value) {
    return (value * 10000).roundToDouble() / 10000;
  }

  /// Authoritative Mastery Predicate (doc 04 §4):
  ///   - |recent_window| >= 4
  ///   - count(correct && hints_used == 0) >= 4
  ///   - max_tier_correct >= 3
  ///   - distinct_dates >= 2
  ///   - (max_day - min_day) >= 2 days (non-consecutive spacing rule)
  static bool isMastered(NodeState node) {
    final window = node.recentWindow.where((a) => a.isQualifying).toList();
    if (window.length < 4) return false;

    final unhintedCorrect = window.where((a) => a.correct && a.hintsUsed == 0).toList();
    if (unhintedCorrect.length < 4) return false;
    if (node.maxTierCorrect < 3) return false;

    final dates = unhintedCorrect
        .map((a) => a.occurredAt.split('T')[0])
        .toSet()
        .toList()
      ..sort();

    if (dates.length < 2) return false;

    final firstDate = DateTime.tryParse(dates.first);
    final lastDate = DateTime.tryParse(dates.last);
    if (firstDate == null || lastDate == null) return false;

    final diffDays = lastDate.difference(firstDate).inDays;
    return diffDays >= 2;
  }

  /// Evaluates Elo update per doc 04 §5.2.
  static NodeState updateElo({
    required NodeState state,
    required Attempt attempt,
    double nodeElo = eloBase,
    int itemResponseCount = 100,
  }) {
    final tierOffset = {1: -285.0, 2: -115.0, 3: 20.0}[attempt.difficultyTier] ?? 0.0;
    final itemDifficulty = nodeElo + tierOffset;
    final ability = state.abilityElo;

    // Expected score
    final expected = 1.0 / (1.0 + math.pow(10.0, (itemDifficulty - ability) / 400.0));

    // Actual score
    double score = 0.0;
    if (attempt.correct && attempt.hintsUsed == 0) {
      score = 1.0;
    } else if (attempt.correct && attempt.hintsUsed > 0) {
      score = 0.5;
    }

    // Learner K factor
    double k = 16.0;
    if (state.attemptsTotal < 10) {
      k = 40.0;
    } else if (state.attemptsTotal < 30) {
      k = 24.0;
    }

    if (attempt.isReview || attempt.isExam) {
      k *= 0.5;
    }

    final newAbility = (ability + k * (score - expected)).clamp(eloMin, eloMax);

    return state.copyWith(
      abilityElo: round4(newAbility),
      attemptsTotal: state.attemptsTotal + 1,
    );
  }

  /// Calculates memory retrievability per FSRS power law:
  ///   R = (1 + 19 * elapsedDays / stability)^(-0.5)
  static double retrievability(double stability, double elapsedDays) {
    if (stability <= 0) return 0.0;
    return math.pow(1.0 + 19.0 * (elapsedDays / stability), -0.5).toDouble();
  }

  /// Selects next practice item candidate (doc 04 §6).
  static EngineDecision selectNextItem({
    required NodeState node,
    required List<EngineItem> items,
    required int itemsSinceReview,
    EngineItem? reviewItem,
  }) {
    // 1. Interleaving check: every 4th turn
    if (itemsSinceReview >= 3 && reviewItem != null) {
      return EngineDecision(
        action: 'serve_item',
        nodeId: reviewItem.nodeId,
        itemId: reviewItem.itemId,
        reason: 'interleave_review',
      );
    }

    if (items.isEmpty) {
      return EngineDecision(
        action: 'serve_item',
        nodeId: node.nodeId,
        itemId: null,
        reason: 'pool_exhausted',
      );
    }

    // 2. Select closest item to target band (ability - 200)
    final targetElo = node.abilityElo - 200.0;
    EngineItem best = items.first;
    double bestDiff = (best.difficultyElo - targetElo).abs();

    for (final item in items) {
      final diff = (item.difficultyElo - targetElo).abs();
      if (diff < bestDiff) {
        bestDiff = diff;
        best = item;
      }
    }

    return EngineDecision(
      action: 'serve_item',
      nodeId: node.nodeId,
      itemId: best.itemId,
      reason: 'target_band',
    );
  }
}
