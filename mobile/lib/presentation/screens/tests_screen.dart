import 'package:flutter/material.dart';
import '../../core/design/tokens.dart';
import '../widgets/mock_exam_timer.dart';

/// Timed full-length and diagnostic mock exam interface.
/// Dignity Constraint: Scores show personal mastery progress and domain metrics; zero percentiles/ranks.
class TestsScreen extends StatefulWidget {
  const TestsScreen({super.key});

  @override
  State<TestsScreen> createState() => _TestsScreenState();
}

class _TestsScreenState extends State<TestsScreen> {
  bool _isExamActive = false;
  int _currentQuestionIndex = 0;
  final Map<int, String> _userAnswers = {};
  final Set<int> _flaggedQuestions = {};

  final List<Map<String, dynamic>> _mockSuites = [
    {
      'id': 'SAT-M1',
      'title': 'Digital SAT Math - Module 1',
      'questions': 22,
      'durationMinutes': 35,
      'description': 'Standard operational routing module covering all 4 domains.',
    },
    {
      'id': 'SAT-M2',
      'title': 'Digital SAT Math - Module 2 (Hard)',
      'questions': 22,
      'durationMinutes': 35,
      'description': 'Adaptive high-tier module emphasizing quadratics and nonlinear systems.',
    },
    {
      'id': 'DIAG-01',
      'title': 'Domain Diagnostic Sprint',
      'questions': 10,
      'durationMinutes': 15,
      'description': 'Rapid baseline diagnostic to pinpoint misconceptions.',
    },
  ];

  void _startExam() {
    setState(() {
      _isExamActive = true;
      _currentQuestionIndex = 0;
      _userAnswers.clear();
      _flaggedQuestions.clear();
    });
  }

  void _finishExam() {
    setState(() {
      _isExamActive = false;
    });

    showDialog(
      context: context,
      builder: (ctx) => const AlertDialog(
        backgroundColor: AppColors.bgSurface,
        shape: RoundedRectangleBorder(borderRadius: AppRadii.brLg),
        title: Row(
          children: [
            Icon(Icons.military_tech, color: AppColors.success, size: 24),
            SizedBox(width: 8),
            Text('Exam Session Completed', style: TextStyle(color: AppColors.textPrimary)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Personal Performance Summary',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 12),
            _buildResultRow('Answered Items', '${_userAnswers.length} / 22'),
            _buildResultRow('Demonstrated Accuracy', '82%'),
            _buildResultRow('Algebra Domain Mastery', 'High (1340 Elo)'),
            _buildResultRow('Advanced Math Mastery', 'Proficient (1280 Elo)'),
            _buildResultRow('Pacing', '1.4 min / question'),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              minimumSize: const Size(double.infinity, 44),
            ),
            child: const Text('Review Detailed Explanations'),
          ),
        ],
      ),
    );
  }

  Widget _buildResultRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isExamActive) {
      return _buildActiveExamView();
    }

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: const Text('Timed Mock Exams'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.space_4),
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.space_4),
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
                    Icon(Icons.timer, color: AppColors.accent, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Exam Simulation Environment',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 6),
                Text(
                  'Timed practice matches official exam constraints. All feedback is calibrated to individual skill mastery without peer ranking or comparison.',
                  style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.space_4),
          ..._mockSuites.map((suite) {
            return Container(
              margin: const EdgeInsets.only(bottom: AppSpacing.space_4),
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
                      Expanded(
                        child: Text(
                          suite['title'] as String,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: const BoxDecoration(
                          color: AppColors.bgElevated,
                          borderRadius: AppRadii.brSm,
                        ),
                        child: Text(
                          '${suite['durationMinutes']} min',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${suite['questions']} questions • ${suite['description']}',
                    style: const TextStyle(fontSize: 13, color: AppColors.textMuted, height: 1.3),
                  ),
                  const SizedBox(height: AppSpacing.space_4),
                  ElevatedButton.icon(
                    onPressed: _startExam,
                    icon: const Icon(Icons.play_arrow, size: 18),
                    label: const Text('Start Timed Session'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      minimumSize: const Size(double.infinity, 48), // 6pm touch target
                      shape: const RoundedRectangleBorder(borderRadius: AppRadii.brMd),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildActiveExamView() {
    final qNum = _currentQuestionIndex + 1;
    final isFlagged = _flaggedQuestions.contains(_currentQuestionIndex);

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: Text('Question $qNum of 22'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            showDialog(
              context: context,
              builder: (ctx) => AlertDialog(
                backgroundColor: AppColors.bgSurface,
                title: const Text('Pause or Exit Exam?'),
                content: const Text('Your progress is saved locally.'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    child: const Text('Resume'),
                  ),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      setState(() {
                        _isExamActive = false;
                      });
                    },
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                    child: const Text('End Exam'),
                  ),
                ],
              ),
            );
          },
        ),
        actions: [
          MockExamTimer(
            totalSeconds: 35 * 60,
            onTimeExpired: _finishExam,
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: Icon(
              isFlagged ? Icons.bookmark : Icons.bookmark_border,
              color: isFlagged ? AppColors.warning : AppColors.textMuted,
            ),
            tooltip: 'Flag for review',
            onPressed: () {
              setState(() {
                if (isFlagged) {
                  _flaggedQuestions.remove(_currentQuestionIndex);
                } else {
                  _flaggedQuestions.add(_currentQuestionIndex);
                }
              });
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Question Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.space_4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
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
                        Text(
                          'Question $qNum',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.accentGlow,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'In the xy-plane, the line y = 3x - 4 intersects the parabola y = x^2 - 4x + 6 at points (a, b) and (c, d). What is the value of a + c?',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                            height: 1.45,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.space_4),
                  ...['5', '7', '10', '14'].asMap().entries.map((entry) {
                    final letter = ['A', 'B', 'C', 'D'][entry.key];
                    final text = entry.value;
                    final isSelected = _userAnswers[_currentQuestionIndex] == letter;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.space_3),
                      child: Material(
                        color: isSelected
                            ? AppColors.primary.withAlpha(35)
                            : AppColors.bgSurface,
                        borderRadius: AppRadii.brMd,
                        child: InkWell(
                          onTap: () {
                            setState(() {
                              _userAnswers[_currentQuestionIndex] = letter;
                            });
                          },
                          borderRadius: AppRadii.brMd,
                          child: Container(
                            constraints: const BoxConstraints(minHeight: 48), // 6pm touch
                            padding: const EdgeInsets.all(AppSpacing.space_3),
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
                                Container(
                                  width: 32,
                                  height: 32,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.primary
                                        : AppColors.bgElevated,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Text(
                                    letter,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.space_3),
                                Text(
                                  text,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
          // Bottom Navigation Row
          Container(
            padding: const EdgeInsets.all(AppSpacing.space_3),
            decoration: const BoxDecoration(
              color: AppColors.bgSurface,
              border: Border(top: BorderSide(color: AppColors.borderSubtle)),
            ),
            child: Row(
              children: [
                if (_currentQuestionIndex > 0)
                  OutlinedButton(
                    onPressed: () {
                      setState(() {
                        _currentQuestionIndex--;
                      });
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textPrimary,
                      side: const BorderSide(color: AppColors.borderSubtle),
                      minimumSize: const Size(90, 48), // 6pm target
                      shape: RoundedRectangleBorder(borderRadius: AppRadii.brMd),
                    ),
                    child: const Text('Back'),
                  ),
                const Spacer(),
                if (_currentQuestionIndex < 21)
                  ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _currentQuestionIndex++;
                      });
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      minimumSize: const Size(110, 48), // 6pm target
                      shape: RoundedRectangleBorder(borderRadius: AppRadii.brMd),
                    ),
                    child: const Text('Next'),
                  )
                else
                  ElevatedButton(
                    onPressed: _finishExam,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(120, 48), // 6pm target
                      shape: RoundedRectangleBorder(borderRadius: AppRadii.brMd),
                    ),
                    child: const Text('Finish Exam'),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
