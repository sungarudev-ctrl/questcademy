import 'package:flutter_riverpod/flutter_riverpod.dart';

class SessionState {
  final String? activeNodeId;
  final int turnIndex;
  final int interleaveCounter;
  final int turnStartTimeMs;

  const SessionState({
    this.activeNodeId,
    this.turnIndex = 0,
    this.interleaveCounter = 0,
    this.turnStartTimeMs = 0,
  });

  bool get isReviewTurn => turnIndex > 0 && turnIndex % 4 == 3;

  SessionState copyWith({
    String? activeNodeId,
    int? turnIndex,
    int? interleaveCounter,
    int? turnStartTimeMs,
  }) {
    return SessionState(
      activeNodeId: activeNodeId ?? this.activeNodeId,
      turnIndex: turnIndex ?? this.turnIndex,
      interleaveCounter: interleaveCounter ?? this.interleaveCounter,
      turnStartTimeMs: turnStartTimeMs ?? this.turnStartTimeMs,
    );
  }
}

class SessionNotifier extends StateNotifier<SessionState> {
  SessionNotifier() : super(const SessionState());

  void startSession(String nodeId) {
    state = SessionState(
      activeNodeId: nodeId,
      turnIndex: 0,
      interleaveCounter: 0,
      turnStartTimeMs: DateTime.now().millisecondsSinceEpoch,
    );
  }

  int nextTurn() {
    final now = DateTime.now().millisecondsSinceEpoch;
    final latency = (now - state.turnStartTimeMs).clamp(500, 120000);
    state = state.copyWith(
      turnIndex: state.turnIndex + 1,
      interleaveCounter: (state.interleaveCounter + 1) % 4,
      turnStartTimeMs: now,
    );
    return latency;
  }

  void endSession() {
    state = const SessionState();
  }
}

final sessionProvider = StateNotifierProvider<SessionNotifier, SessionState>((ref) {
  return SessionNotifier();
});
