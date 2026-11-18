import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/design/tokens.dart';

/// Timer badge for timed mock exams with pause/resume support.
class MockExamTimer extends StatefulWidget {
  final int totalSeconds;
  final VoidCallback onTimeExpired;
  final ValueChanged<int>? onTick;

  const MockExamTimer({
    super.key,
    required this.totalSeconds,
    required this.onTimeExpired,
    this.onTick,
  });

  @override
  State<MockExamTimer> createState() => _MockExamTimerState();
}

class _MockExamTimerState extends State<MockExamTimer> {
  late int _secondsRemaining;
  Timer? _timer;
  bool _isPaused = false;

  @override
  void initState() {
    super.initState();
    _secondsRemaining = widget.totalSeconds;
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!_isPaused) {
        if (_secondsRemaining > 0) {
          setState(() {
            _secondsRemaining--;
          });
          widget.onTick?.call(_secondsRemaining);
        } else {
          timer.cancel();
          widget.onTimeExpired();
        }
      }
    });
  }

  void _togglePause() {
    setState(() {
      _isPaused = !_isPaused;
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _formatTime(int totalSecs) {
    final minutes = totalSecs ~/ 60;
    final seconds = totalSecs % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    Color timerColor = AppColors.textPrimary;
    Color bgColor = AppColors.bgElevated;

    if (_secondsRemaining <= 60) {
      timerColor = AppColors.error;
      bgColor = AppColors.error.withAlpha(30);
    } else if (_secondsRemaining <= 300) {
      timerColor = AppColors.warning;
      bgColor = AppColors.warning.withAlpha(30);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: AppRadii.brMd,
        border: Border.all(
          color: _isPaused ? AppColors.warning : AppColors.borderSubtle,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _isPaused ? Icons.pause_circle_outline : Icons.timer_outlined,
            size: 18,
            color: _isPaused ? AppColors.warning : timerColor,
          ),
          const SizedBox(width: 6),
          Text(
            _formatTime(_secondsRemaining),
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              fontFamily: 'monospace',
              color: _isPaused ? AppColors.warning : timerColor,
            ),
          ),
          const SizedBox(width: 4),
          InkWell(
            onTap: _togglePause,
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Icon(
                _isPaused ? Icons.play_arrow : Icons.pause,
                size: 16,
                color: AppColors.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
