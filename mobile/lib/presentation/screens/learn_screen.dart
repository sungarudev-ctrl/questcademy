import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/design/tokens.dart';
import '../../core/engine/engine_models.dart';
import '../../providers/learner_provider.dart';
import '../../providers/node_state_provider.dart';

/// Primary curriculum and learning navigation screen.
/// Strict Dignity Constraint: Focuses on concept mastery, spaced repetition, zero ranks/grades.
class LearnScreen extends ConsumerWidget {
  const LearnScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final learner = ref.watch(learnerProvider);
    final nodeMap = ref.watch(nodeStateProvider);

    final examDateParsed = learner.examDate != null ? DateTime.tryParse(learner.examDate!) : null;
    final daysUntilExam = examDateParsed != null
        ? examDateParsed.difference(DateTime.now()).inDays
        : 90;

    // Group curriculum nodes by topic
    final Map<String, List<MapEntry<String, ClientNodeInfo>>> groupedByTopic = {};
    for (final entry in nodeMap.entries) {
      final topic = entry.value.topic;
      groupedByTopic.putIfAbsent(topic, () => []).add(entry);
    }

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: const Text('Questcademy'),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.bgElevated,
              borderRadius: AppRadii.brSm,
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Row(
              children: [
                const Icon(Icons.local_fire_department, color: AppColors.warning, size: 18),
                const SizedBox(width: 4),
                Text(
                  '${learner.streakDays} Day Streak',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.space_4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Card: Milestone Target
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.space_4),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primaryDeep, AppColors.primary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: AppRadii.brLg,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withAlpha(50),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withAlpha(40),
                          borderRadius: AppRadii.brSm,
                        ),
                        child: Text(
                          learner.frameworkId,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '$daysUntilExam days to milestone',
                        style: const TextStyle(fontSize: 12, color: Colors.white70),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.space_3),
                  const Text(
                    'Next Adaptive Session',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Interleaved retrieval on Unlike Fractions & Linear Equations',
                    style: TextStyle(fontSize: 13, color: Colors.white70),
                  ),
                  const SizedBox(height: AppSpacing.space_4),
                  ElevatedButton.icon(
                    onPressed: () {
                      context.push('/practice/MATH.FRAC.EQUIV');
                    },
                    icon: const Icon(Icons.play_arrow, size: 20),
                    label: const Text('Start Adaptive Practice (15 min)'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppColors.primaryDeep,
                      minimumSize: const Size(double.infinity, 48), // 6pm touch target
                      shape: RoundedRectangleBorder(borderRadius: AppRadii.brMd),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.space_6),
            const Text(
              'Curriculum Mastery Map',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.space_1),
            const Text(
              'Each node tracks your personal retention and mastery.',
              style: TextStyle(fontSize: 13, color: AppColors.textMuted),
            ),
            const SizedBox(height: AppSpacing.space_4),
            ...groupedByTopic.entries.map((topicEntry) {
              final topicTitle = topicEntry.key;
              final nodes = topicEntry.value;

              return Container(
                margin: const EdgeInsets.only(bottom: AppSpacing.space_4),
                decoration: BoxDecoration(
                  color: AppColors.bgSurface,
                  borderRadius: AppRadii.brMd,
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(AppSpacing.space_3),
                      child: Row(
                        children: [
                          const Icon(Icons.school, color: AppColors.accentGlow, size: 20),
                          const SizedBox(width: AppSpacing.space_2),
                          Text(
                            topicTitle,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Divider(color: AppColors.borderSubtle, height: 1),
                    ...nodes.map((n) {
                      final nodeId = n.key;
                      final nodeInfo = n.value;
                      final state = nodeInfo.state;

                      final isMastered = state.status == NodeStatus.mastered;
                      final elo = state.abilityElo.round();
                      final attempts = state.attemptsTotal;

                      Color statusColor = AppColors.textDisabled;
                      String statusText = 'Available';
                      if (isMastered) {
                        statusColor = AppColors.success;
                        statusText = 'Mastered';
                      } else if (state.status == NodeStatus.in_progress) {
                        statusColor = AppColors.primaryHover;
                        statusText = 'In Progress';
                      } else if (state.status == NodeStatus.locked) {
                        statusColor = AppColors.textDisabled;
                        statusText = 'Locked';
                      }

                      return Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: state.status == NodeStatus.locked
                              ? null
                              : () {
                                  context.push('/node/$nodeId');
                                },
                          child: Container(
                            constraints: const BoxConstraints(minHeight: 56), // 6pm touch
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.space_3,
                              vertical: AppSpacing.space_2,
                            ),
                            decoration: const BoxDecoration(
                              border: Border(
                                bottom: BorderSide(color: AppColors.borderSubtle, width: 0.5),
                              ),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        nodeInfo.learnerTitle,
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: state.status == NodeStatus.locked
                                              ? AppColors.textMuted
                                              : AppColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Skill $elo • $attempts attempts',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: statusColor.withAlpha(25),
                                    borderRadius: AppRadii.brSm,
                                    border: Border.all(color: statusColor.withAlpha(80)),
                                  ),
                                  child: Text(
                                    statusText,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: statusColor,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  state.status == NodeStatus.locked
                                      ? Icons.lock_outline
                                      : Icons.chevron_right,
                                  size: 18,
                                  color: AppColors.textMuted,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
