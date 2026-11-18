import 'package:dio/dio.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../storage/local_storage.dart';
import '../engine/engine_models.dart';

class ApiClient {
  static const String baseUrl = 'http://localhost:8000';
  late final Dio dio;

  ApiClient() {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await LocalStorage.getAuthToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          options.headers['Content-Type'] = 'application/json';
          handler.next(options);
        },
      ),
    );
  }

  Future<bool> isConnected() async {
    final results = await Connectivity().checkConnectivity();
    return !results.contains(ConnectivityResult.none);
  }

  /// Submits an attempt; if offline or fails, enqueues to LocalStorage.
  Future<bool> submitAttempt(Attempt attempt) async {
    final online = await isConnected();
    if (!online) {
      await LocalStorage.enqueueAttempt(attempt);
      return true; // Successfully queued offline
    }

    try {
      final res = await dio.post('/api/learners/attempts', data: attempt.toJson());
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      // Network drop: fallback to offline queue
      await LocalStorage.enqueueAttempt(attempt);
      return true;
    }
  }

  /// Replays queued offline attempts to the backend.
  Future<int> replayOfflineAttempts() async {
    final queue = await LocalStorage.getQueuedAttempts();
    if (queue.isEmpty) return 0;

    int replayed = 0;
    try {
      for (final attempt in queue) {
        // Submit in sequence
        await dio.post('/api/learners/attempts', data: attempt.toJson()).catchError((_) {});
        replayed++;
      }
      await LocalStorage.clearQueuedAttempts();
    } catch (_) {
      // Keep remaining attempts
    }
    return replayed;
  }
}
