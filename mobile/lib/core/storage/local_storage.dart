import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../engine/engine_models.dart';

/// Local persistence service for offline attempts, node scroll positions, and preferences.
class LocalStorage {
  static const String _keyAuthToken = 'quest_auth_token';
  static const String _keyLearnerId = 'quest_learner_id';
  static const String _keyOfflineAttempts = 'quest_offline_attempts';
  static const String _keyDyslexiaFont = 'quest_pref_dyslexia';
  static const String _keyReducedMotion = 'quest_pref_reduced_motion';
  static const String _keyFrameworkId = 'quest_pref_framework';
  static const String _keyCountryCode = 'quest_pref_country';

  static Future<void> saveAuthToken(String token, String learnerId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyAuthToken, token);
    await prefs.setString(_keyLearnerId, learnerId);
  }

  static Future<String?> getAuthToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyAuthToken);
  }

  static Future<String> getLearnerId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyLearnerId) ?? 'learner-mobile-01';
  }

  static Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyAuthToken);
    await prefs.remove(_keyLearnerId);
  }

  static Future<void> enqueueAttempt(Attempt attempt) async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_keyOfflineAttempts) ?? [];
    list.add(jsonEncode(attempt.toJson()));
    await prefs.setStringList(_keyOfflineAttempts, list);
  }

  static Future<List<Attempt>> getQueuedAttempts() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_keyOfflineAttempts) ?? [];
    return list.map((s) {
      final map = jsonDecode(s) as Map<String, dynamic>;
      return Attempt(
        attemptId: map['attempt_id'] as String,
        learnerId: map['learner_id'] as String,
        nodeId: map['node_id'] as String,
        itemId: map['item_id'] as String,
        difficultyTier: (map['difficulty_tier'] as num).toInt(),
        correct: map['correct'] as bool,
        latencyMs: (map['latency_ms'] as num).toInt(),
        hintsUsed: (map['hints_used'] as num).toInt(),
        sessionId: map['session_id'] as String,
        occurredAt: map['occurred_at'] as String,
        isReview: map['is_review'] as bool? ?? false,
        isExam: map['is_exam'] as bool? ?? false,
      );
    }).toList();
  }

  static Future<void> clearQueuedAttempts() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyOfflineAttempts);
  }
}
