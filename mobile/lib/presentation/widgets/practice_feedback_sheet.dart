import 'package:flutter/material.dart';
import '../../core/design/tokens.dart';

/// Modal bottom sheet showing feedback and personal mastery delta after an attempt.
/// Strict Dignity Constraint: Only personal mastery progress, zero peer comparisons or rank.
class PracticeFeedbackSheet extends StatelessWidget {
  final bool isCorrect;
  final String? diagnosticMessage;
  final String? misconceptionName;
  final double currentElo;
  final double eloDelta;
  final VoidCallback onNext;
  final VoidCallback? onAskAi;

  const PracticeFeedbackSheet({
    super.key,
    required this.isCorrect,
    this.diagnosticMessage,
    this.misconceptionName,
    required this.currentElo,
    required this.eloDelta,
    required this.onNext,
    this.onAskAi,
  });

  @override
  Widget build(BuildContext context) {
    final deltaText = eloDelta >= 0 ? '+${eloDelta.toStringAsFixed(1)}' : eloDelta.toStringAsFixed(1);
    final statusColor = isCorrect ? AppColors.success : AppColors.error;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.space_6),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(top: BorderSide(color: statusColor, width: 3)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isCorrect ? Icons.check_circle : Icons.error_outline,
                  color: statusColor,
                  size: 28,
                ),
                const SizedBox(width: AppSpacing.space_3),
                Text(
                  isCorrect ? 'Accurate Solution' : 'Opportunity to Master',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: statusColor,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.bgElevated,
                    borderRadius: AppRadii.brSm,
                    border: Border.all(color: AppColors.borderSubtle),
                  ),
                  child: Text(
                    'Skill: ${currentElo.round()} ($deltaText)',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
            if (misconceptionName != null) ...[
              const SizedBox(height: AppSpacing.space_3),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.space_3),
                decoration: BoxDecoration(
                  color: AppColors.error.withAlpha(25),
                  borderRadius: AppRadii.brSm,
                  border: Border.all(color: AppColors.error.withAlpha(80)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.psychology, size: 18, color: AppColors.error),
                    const SizedBox(width: AppSpacing.space_2),
                    Expanded(
                      child: Text(
                        'Targeting Misconception: $misconceptionName',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.error,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (diagnosticMessage != null && diagnosticMessage!.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.space_3),
              Text(
                diagnosticMessage!,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.space_6),
            Row(
              children: [
                if (onAskAi != null)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onAskAi,
                      icon: const Icon(Icons.chat_bubble_outline, size: 18),
                      label: const Text('Ask Socratic AI'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.accentGlow,
                        side: const BorderSide(color: AppColors.accent),
                        minimumSize: const Size(0, 48), // 6pm test minimum
                        shape: RoundedRectangleBorder(borderRadius: AppRadii.brMd),
                      ),
                    ),
                  ),
                if (onAskAi != null) const SizedBox(width: AppSpacing.space_3),
                Expanded(
                  child: ElevatedButton(
                    onPressed: onNext,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isCorrect ? AppColors.primary : AppColors.bgElevated,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(0, 48),
                      shape: RoundedRectangleBorder(borderRadius: AppRadii.brMd),
                    ),
                    child: const Text(
                      'Next Concept',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
