import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../presentation/screens/learn_screen.dart';
import '../../presentation/screens/node_reader_screen.dart';
import '../../presentation/screens/onboarding_screen.dart';
import '../../presentation/screens/practice_screen.dart';
import '../../presentation/screens/profile_screen.dart';
import '../../presentation/screens/progress_screen.dart';
import '../../presentation/screens/tests_screen.dart';
import '../../presentation/screens/tutor_screen.dart';
import '../design/tokens.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();
final GlobalKey<NavigatorState> _shellNavigatorKey = GlobalKey<NavigatorState>();

final GoRouter appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/learn',
  routes: [
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    ShellRoute(
      navigatorKey: _shellNavigatorKey,
      builder: (context, state, child) {
        return _AppScaffoldShell(child: child);
      },
      routes: [
        GoRoute(
          path: '/learn',
          pageBuilder: (context, state) => const NoTransitionPage(child: LearnScreen()),
        ),
        GoRoute(
          path: '/tutor',
          pageBuilder: (context, state) => const NoTransitionPage(child: TutorScreen()),
        ),
        GoRoute(
          path: '/tests',
          pageBuilder: (context, state) => const NoTransitionPage(child: TestsScreen()),
        ),
        GoRoute(
          path: '/progress',
          pageBuilder: (context, state) => const NoTransitionPage(child: ProgressScreen()),
        ),
        GoRoute(
          path: '/profile',
          pageBuilder: (context, state) => const NoTransitionPage(child: ProfileScreen()),
        ),
      ],
    ),
    GoRoute(
      parentNavigatorKey: _rootNavigatorKey,
      path: '/node/:node_id',
      builder: (context, state) {
        final nodeId = state.pathParameters['node_id'] ?? 'MATH.DEFAULT';
        return NodeReaderScreen(nodeId: nodeId);
      },
    ),
    GoRoute(
      parentNavigatorKey: _rootNavigatorKey,
      path: '/practice/:node_id',
      builder: (context, state) {
        final nodeId = state.pathParameters['node_id'] ?? 'MATH.DEFAULT';
        return PracticeScreen(nodeId: nodeId);
      },
    ),
  ],
);

class _AppScaffoldShell extends StatelessWidget {
  final Widget child;

  const _AppScaffoldShell({required this.child});

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/learn')) return 0;
    if (location.startsWith('/tutor')) return 1;
    if (location.startsWith('/tests')) return 2;
    if (location.startsWith('/progress')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/learn');
        break;
      case 1:
        context.go('/tutor');
        break;
      case 2:
        context.go('/tests');
        break;
      case 3:
        context.go('/progress');
        break;
      case 4:
        context.go('/profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _calculateSelectedIndex(context);

    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: selectedIndex,
        onTap: (index) => _onItemTapped(index, context),
        backgroundColor: AppColors.bgSurface,
        selectedItemColor: AppColors.primaryHover,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.school_outlined),
            activeIcon: Icon(Icons.school),
            label: 'Learn',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.psychology_outlined),
            activeIcon: Icon(Icons.psychology),
            label: 'AI Tutor',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.timer_outlined),
            activeIcon: Icon(Icons.timer),
            label: 'Tests',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.insights_outlined),
            activeIcon: Icon(Icons.insights),
            label: 'Progress',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}
