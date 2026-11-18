import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/design/tokens.dart';
import '../../core/engine/engine_models.dart';
import '../../providers/learner_provider.dart';
import '../../providers/node_state_provider.dart';

/// Personal progress and cognitive retention analytics screen.
/// Strictly conforms to dignity constraints: zero ranks, percentiles, or peer comparisons.
class ProgressScreen extends ConsumerWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final learner = ref.watch(learnerProvider);
    final nodeMap = ref.watch(nodeStateProvider);

    final masteredCount = nodeMap.values.where((i) => i.state.status == NodeStatus.mastered).length;
    final totalNodes = nodeMap.isNotEmpty ? nodeMap.length : 12;

    // Calculate average personal Elo
    final double avgElo = nodeMap.isNotEmpty
        ? nodeMap.values.map((i) => i.state.abilityElo).reduce((a, b) => a + b) / nodeMap.length
        : 1240.0;

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: const Text('Mastery & Retention Progress'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.space_4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Personal Mastery Overview Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.space_4),
              decoration: BoxDecoration(
                color: AppColors.bgSurface,
                borderRadius: AppRadii.brLg,
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Personal Competency Index',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        avgElo.round().toString(),
                        style: const TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Skill Rating',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primaryHover,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.space_4),
                  // Progress Bar
                  ClipRRect(
                    borderRadius: AppRadii.brFull,
                    child: LinearProgressIndicator(
                      value: masteredCount / totalNodes,
                      minHeight: 10,
                      backgroundColor: AppColors.bgElevated,
                      valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.space_3),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '$masteredCount of $totalNodes Concepts Mastered',
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                      Text(
                        '${((masteredCount / totalNodes) * 100).round()}%',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryHover,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.space_4),

            // Cognitive Memory & Spaced Repetition Section
            const Text(
              'Memory Retention & Interleaving',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.space_1),
            const Text(
              'Based on Ebbinghaus decay formulas, keeping retrieval strength high.',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
            const SizedBox(height: AppSpacing.space_3),
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.space_3),
                    decoration: BoxDecoration(
                      color: AppColors.bgSurface,
                      borderRadius: AppRadii.brMd,
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.history, color: AppColors.warning, size: 18),
                            SizedBox(width: 6),
                            Text('Due for Review', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          ],
                        ),
                        SizedBox(height: 8),
                        Text('3 Concepts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                        SizedBox(height: 2),
                        Text('Retrievability < 85%', style: TextStyle(fontSize: 11, color: AppColors.warning)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.space_3),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.space_3),
                    decoration: BoxDecoration(
                      color: AppColors.bgSurface,
                      borderRadius: AppRadii.brMd,
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.shuffle, color: AppColors.accentGlow, size: 18),
                            SizedBox(width: 6),
                            Text('Interleaving Lag', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          ],
                        ),
                        SizedBox(height: 8),
                        Text('Optimal (3.2)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                        SizedBox(height: 2),
                        Text('Low clustering risk', style: TextStyle(fontSize: 11, color: AppColors.success)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.space_4),

            // Weekly Focused Dose
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.space_4),
              decoration: BoxDecoration(
                color: AppColors.bgSurface,
                borderRadius: AppRadii.brMd,
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.calendar_today, size: 18, color: AppColors.accent),
                      const SizedBox(width: 8),
                      const Text(
                        'Weekly Focus Rhythm',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '${learner.streakDays} day streak',
                        style: const TextStyle(fontSize: 12, color: AppColors.warning, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.space_4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: ['M', 'T', 'W', 'T', 'F', 'S', 'S'].asMap().entries.map((e) {
                      final isCurrent = e.key <= 2; // sample active days
                      return Column(
                        children: [
                          Container(
                            width: 32,
                            height: 48,
                            decoration: BoxDecoration(
                              color: isCurrent ? AppColors.primary : AppColors.bgElevated,
                              borderRadius: AppRadii.brSm,
                              border: Border.all(
                                color: isCurrent ? AppColors.primaryHover : AppColors.borderSubtle,
                              ),
                            ),
                            alignment: Alignment.bottomCenter,
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Icon(
                              isCurrent ? Icons.check : null,
                              size: 14,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            e.value,
                            style: TextStyle(
                              fontSize: 12,
                              color: isCurrent ? AppColors.textPrimary : AppColors.textMuted,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.space_4),

            // Concept State Breakdown
            Container(
              padding: const EdgeInsets.all(AppSpacing.space_4),
              decoration: BoxDecoration(
                color: AppColors.bgSurface,
                borderRadius: AppRadii.brMd,
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Domain Skill Breakdown',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildDomainProgress('Algebra', 0.85, '1340 Elo'),
                  const SizedBox(height: 10),
                  _buildDomainProgress('Advanced Math', 0.65, '1260 Elo'),
                  const SizedBox(height: 10),
                  _buildDomainProgress('Data Analysis & Problem Solving', 0.50, '1210 Elo'),
                  const SizedBox(height: 10),
                  _buildDomainProgress('Geometry & Trigonometry', 0.40, '1190 Elo'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDomainProgress(String domain, double progress, String elo) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(domain, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
            Text(elo, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: AppRadii.brFull,
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 6,
            backgroundColor: AppColors.bgElevated,
            valueColor: const AlwaysStoppedAnimation(AppColors.primaryHover),
          ),
        ),
      ],
    );
  }
}
