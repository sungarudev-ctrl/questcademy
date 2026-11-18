import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/design/tokens.dart';
import '../../providers/learner_provider.dart';
import '../../providers/sync_provider.dart';

/// Learner profile, accessibility, and offline synchronization screen.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final learner = ref.watch(learnerProvider);
    final syncState = ref.watch(syncProvider);

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: const Text('Learner Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.space_4),
        children: [
          // Target Exam Card
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
                  'Milestone Goal',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.school_outlined, color: AppColors.accent, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      learner.frameworkId,
                      style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.event, color: AppColors.primaryHover, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Exam Date: ${learner.examDate ?? "Not set"}',
                      style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.space_4),

          // Offline Synchronization Card
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
                Row(
                  children: [
                    Icon(
                      syncState.isOnline ? Icons.cloud_done : Icons.cloud_off,
                      color: syncState.isOnline ? AppColors.success : AppColors.warning,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Offline Engine Synchronization',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  syncState.isOnline
                      ? 'Connected to cloud. Attempts synchronize immediately.'
                      : 'Offline mode active. Attempts are safely queued locally.',
                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.bgElevated,
                    borderRadius: AppRadii.brSm,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Pending Offline Queue',
                        style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                      Text(
                        '${syncState.pendingCount} attempts',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: syncState.pendingCount > 0
                              ? AppColors.warning
                              : AppColors.success,
                        ),
                      ),
                    ],
                  ),
                ),
                if (syncState.pendingCount > 0 && syncState.isOnline) ...[
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: () async {
                      await ref.read(syncProvider.notifier).triggerSync();
                    },
                    icon: const Icon(Icons.sync, size: 18),
                    label: const Text('Synchronize Pending Attempts Now'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      minimumSize: const Size(double.infinity, 44),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.space_4),

          // Accessibility Preferences
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
                  'Accessibility (WCAG 2.1 AA)',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('OpenDyslexic Font Option', style: TextStyle(fontSize: 14)),
                  subtitle: const Text(
                    'Specialized letterforms for reading comfort',
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                  value: learner.preferences.dyslexiaFont,
                  onChanged: (val) {
                    ref.read(learnerProvider.notifier).updatePreferences(dyslexiaFont: val);
                  },
                ),
                const Divider(color: AppColors.borderSubtle),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Reduced Motion Preference', style: TextStyle(fontSize: 14)),
                  subtitle: const Text(
                    'Minimizes animations across transitions',
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                  value: learner.preferences.reducedMotion,
                  onChanged: (val) {
                    ref.read(learnerProvider.notifier).updatePreferences(reducedMotion: val);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.space_6),

          // Dignity Commitment Notice
          Container(
            padding: const EdgeInsets.all(AppSpacing.space_3),
            decoration: BoxDecoration(
              color: AppColors.bgElevated,
              borderRadius: AppRadii.brSm,
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: const Row(
              children: [
                Icon(Icons.verified_user_outlined, size: 18, color: AppColors.accentGlow),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Dignity Guarantee: Questcademy never ranks you, displays percentiles, or compares you to others.',
                    style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
