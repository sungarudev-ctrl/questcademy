import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/design/tokens.dart';
import '../../providers/learner_provider.dart';

/// Onboarding screen: Framework selection, target exam date, study plan.
/// Strictly enforces zero grade levels, zero percentiles, and zero peer comparisons.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  String _selectedFramework = 'US_SAT';
  DateTime _selectedExamDate = DateTime.now().add(const Duration(days: 90));
  int _dailyGoalMinutes = 45;

  final List<Map<String, String>> _frameworks = [
    {
      'id': 'US_SAT',
      'country': 'US',
      'title': 'Digital SAT',
      'subtitle': 'Math & Reading and Writing domains',
    },
    {
      'id': 'UK_GCSE',
      'country': 'GB',
      'title': 'UK GCSE',
      'subtitle': 'Higher & Foundation Mathematics',
    },
    {
      'id': 'AUS_HSC',
      'country': 'AU',
      'title': 'AUS HSC',
      'subtitle': 'Mathematics Advanced & Standard',
    },
    {
      'id': 'IB_DIPLOMA',
      'country': 'INT',
      'title': 'IB Diploma',
      'subtitle': 'Analysis & Approaches / Applications',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: const Text('Design Your Study Path'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.space_6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Welcome to Questcademy',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.space_2),
              const Text(
                'Adaptive, mastery-based practice tailored to your target milestone.',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: AppSpacing.space_6),
              const Text(
                'Target Examination Framework',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.space_3),
              ..._frameworks.map((fw) {
                final isSelected = _selectedFramework == fw['id'];
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.space_3),
                  child: Material(
                    color: isSelected
                        ? AppColors.primary.withAlpha(40)
                        : AppColors.bgSurface,
                    borderRadius: AppRadii.brMd,
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _selectedFramework = fw['id']!;
                        });
                      },
                      borderRadius: AppRadii.brMd,
                      child: Container(
                        constraints: const BoxConstraints(minHeight: 56),
                        padding: const EdgeInsets.all(AppSpacing.space_4),
                        decoration: BoxDecoration(
                          borderRadius: AppRadii.brMd,
                          border: Border.all(
                            color: isSelected
                                ? AppColors.primaryHover
                                : AppColors.borderSubtle,
                            width: 1.5,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              isSelected
                                  ? Icons.radio_button_checked
                                  : Icons.radio_button_off,
                              color: isSelected
                                  ? AppColors.primaryHover
                                  : AppColors.textMuted,
                            ),
                            const SizedBox(width: AppSpacing.space_3),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    fw['title']!,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  Text(
                                    fw['subtitle']!,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              }),
              const SizedBox(height: AppSpacing.space_6),
              const Text(
                'Target Milestone Date',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.space_3),
              Material(
                color: AppColors.bgSurface,
                borderRadius: AppRadii.brMd,
                child: InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _selectedExamDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 730)),
                    );
                    if (picked != null) {
                      setState(() {
                        _selectedExamDate = picked;
                      });
                    }
                  },
                  borderRadius: AppRadii.brMd,
                  child: Container(
                    height: 52,
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.space_4),
                    decoration: BoxDecoration(
                      borderRadius: AppRadii.brMd,
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.event, color: AppColors.accent),
                        const SizedBox(width: AppSpacing.space_3),
                        Text(
                          '${_selectedExamDate.year}-${_selectedExamDate.month.toString().padLeft(2, '0')}-${_selectedExamDate.day.toString().padLeft(2, '0')}',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const Spacer(),
                        const Text(
                          'Change',
                          style: TextStyle(fontSize: 13, color: AppColors.accentGlow),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.space_6),
              const Text(
                'Daily Focused Practice',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.space_3),
              Row(
                children: [20, 30, 45, 60].map((mins) {
                  final isChosen = _dailyGoalMinutes == mins;
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Material(
                        color: isChosen ? AppColors.primary : AppColors.bgSurface,
                        borderRadius: AppRadii.brMd,
                        child: InkWell(
                          onTap: () {
                            setState(() {
                              _dailyGoalMinutes = mins;
                            });
                          },
                          borderRadius: AppRadii.brMd,
                          child: Container(
                            height: 48, // 6pm test minimum
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              borderRadius: AppRadii.brMd,
                              border: Border.all(
                                color: isChosen
                                    ? AppColors.primaryHover
                                    : AppColors.borderSubtle,
                              ),
                            ),
                            child: Text(
                              '$mins m',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: isChosen ? Colors.white : AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.space_8),
              ElevatedButton(
                onPressed: () {
                  final fwObj = _frameworks.firstWhere((f) => f['id'] == _selectedFramework);
                  ref.read(learnerProvider.notifier).setFramework(
                        _selectedFramework,
                        fwObj['country'] ?? 'US',
                      );
                  final dateStr =
                      '${_selectedExamDate.year}-${_selectedExamDate.month.toString().padLeft(2, '0')}-${_selectedExamDate.day.toString().padLeft(2, '0')}';
                  ref.read(learnerProvider.notifier).setExamDate(dateStr);
                  if (mounted) {
                    context.go('/learn');
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  minimumSize: const Size(double.infinity, 52), // 6pm test
                  shape: RoundedRectangleBorder(borderRadius: AppRadii.brMd),
                ),
                child: const Text(
                  'Launch Study Path',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(height: AppSpacing.space_4),
            ],
          ),
        ),
      ),
    );
  }
}
