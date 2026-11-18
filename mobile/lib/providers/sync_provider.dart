import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../core/network/api_client.dart';
import '../core/storage/local_storage.dart';

class SyncState {
  final bool isOnline;
  final int pendingCount;
  final bool isSyncing;

  const SyncState({
    this.isOnline = true,
    this.pendingCount = 0,
    this.isSyncing = false,
  });

  SyncState copyWith({
    bool? isOnline,
    int? pendingCount,
    bool? isSyncing,
  }) {
    return SyncState(
      isOnline: isOnline ?? this.isOnline,
      pendingCount: pendingCount ?? this.pendingCount,
      isSyncing: isSyncing ?? this.isSyncing,
    );
  }
}

class SyncNotifier extends StateNotifier<SyncState> {
  final ApiClient _apiClient;

  SyncNotifier(this._apiClient) : super(const SyncState()) {
    _init();
  }

  Future<void> _init() async {
    final queued = await LocalStorage.getQueuedAttempts();
    final results = await Connectivity().checkConnectivity();
    final online = !results.contains(ConnectivityResult.none);

    state = state.copyWith(
      isOnline: online,
      pendingCount: queued.length,
    );

    Connectivity().onConnectivityChanged.listen((results) async {
      final online = !results.contains(ConnectivityResult.none);
      state = state.copyWith(isOnline: online);
      if (online && state.pendingCount > 0) {
        await triggerSync();
      }
    });
  }

  Future<void> refreshPendingCount() async {
    final queued = await LocalStorage.getQueuedAttempts();
    state = state.copyWith(pendingCount: queued.length);
  }

  Future<void> triggerSync() async {
    if (state.isSyncing) return;
    state = state.copyWith(isSyncing: true);

    await _apiClient.replayOfflineAttempts();
    final queued = await LocalStorage.getQueuedAttempts();

    state = state.copyWith(
      isSyncing: false,
      pendingCount: queued.length,
    );
  }
}

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

final syncProvider = StateNotifierProvider<SyncNotifier, SyncState>((ref) {
  final client = ref.watch(apiClientProvider);
  return SyncNotifier(client);
});
