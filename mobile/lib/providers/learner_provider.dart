import 'package:flutter_riverpod/flutter_riverpod.dart';

class LearnerPreferences {
  final bool dyslexiaFont;
  final bool reducedMotion;
  final double textScale;

  const LearnerPreferences({
    this.dyslexiaFont = false,
    this.reducedMotion = false,
    this.textScale = 1.0,
  });

  LearnerPreferences copyWith({
    bool? dyslexiaFont,
    bool? reducedMotion,
    double? textScale,
  }) {
    return LearnerPreferences(
      dyslexiaFont: dyslexiaFont ?? this.dyslexiaFont,
      reducedMotion: reducedMotion ?? this.reducedMotion,
      textScale: textScale ?? this.textScale,
    );
  }
}

class LearnerState {
  final String learnerId;
  final String frameworkId;
  final String countryCode;
  final String? examDate;
  final int streakDays;
  final double weeklyMinutes;
  final LearnerPreferences preferences;

  const LearnerState({
    required this.learnerId,
    required this.frameworkId,
    required this.countryCode,
    this.examDate,
    this.streakDays = 4,
    this.weeklyMinutes = 65.0,
    this.preferences = const LearnerPreferences(),
  });

  LearnerState copyWith({
    String? frameworkId,
    String? countryCode,
    String? examDate,
    int? streakDays,
    double? weeklyMinutes,
    LearnerPreferences? preferences,
  }) {
    return LearnerState(
      learnerId: learnerId,
      frameworkId: frameworkId ?? this.frameworkId,
      countryCode: countryCode ?? this.countryCode,
      examDate: examDate ?? this.examDate,
      streakDays: streakDays ?? this.streakDays,
      weeklyMinutes: weeklyMinutes ?? this.weeklyMinutes,
      preferences: preferences ?? this.preferences,
    );
  }
}

class LearnerNotifier extends StateNotifier<LearnerState> {
  LearnerNotifier()
      : super(const LearnerState(
          learnerId: 'learner-mobile-01',
          frameworkId: 'GH-BECE-2024',
          countryCode: 'GH',
          examDate: '2026-06-15',
          streakDays: 4,
          weeklyMinutes: 65.0,
        ));

  void setFramework(String frameworkId, String countryCode) {
    state = state.copyWith(frameworkId: frameworkId, countryCode: countryCode);
  }

  void setExamDate(String? date) {
    state = state.copyWith(examDate: date);
  }

  void addMinutes(double mins) {
    state = state.copyWith(weeklyMinutes: state.weeklyMinutes + mins);
  }

  void updatePreferences({bool? dyslexiaFont, bool? reducedMotion, double? textScale}) {
    state = state.copyWith(
      preferences: state.preferences.copyWith(
        dyslexiaFont: dyslexiaFont,
        reducedMotion: reducedMotion,
        textScale: textScale,
      ),
    );
  }
}

final learnerProvider = StateNotifierProvider<LearnerNotifier, LearnerState>((ref) {
  return LearnerNotifier();
});
