import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/design/theme.dart';
import 'core/design/tokens.dart';
import 'core/router/app_router.dart';
import 'core/storage/local_storage.dart';
import 'providers/learner_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalStorage.init();

  runApp(
    const ProviderScope(
      child: QuestcademyApp(),
    ),
  );
}

class QuestcademyApp extends ConsumerWidget {
  const QuestcademyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final learner = ref.watch(learnerProvider);

    ThemeData theme = AppTheme.darkTheme;
    if (learner.preferences.dyslexiaFont) {
      theme = theme.copyWith(
        textTheme: theme.textTheme.apply(
          fontFamily: 'OpenDyslexic',
        ),
      );
    }

    return MaterialApp.router(
      title: 'Questcademy',
      debugShowCheckedModeBanner: false,
      theme: theme,
      routerConfig: appRouter,
    );
  }
}
