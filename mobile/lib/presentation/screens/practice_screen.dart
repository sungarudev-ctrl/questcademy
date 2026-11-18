import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/design/tokens.dart';
import '../../data/models/content_models.dart';
import '../../providers/node_state_provider.dart';
import '../../providers/session_provider.dart';
import '../render/item_renderer.dart';
import '../widgets/practice_feedback_sheet.dart';
import '../widgets/ask_ai_sheet.dart';

/// Interactive adaptive practice session screen.
/// Implements offline-tolerant attempt recording and Socratic inquiry.
class PracticeScreen extends ConsumerStatefulWidget {
  final String nodeId;

  const PracticeScreen({super.key, required this.nodeId});

  @override
  ConsumerState<PracticeScreen> createState() => _PracticeScreenState();
}

class _PracticeScreenState extends ConsumerState<PracticeScreen> {
  int _itemIndex = 0;
  int _correctCount = 0;
  String? _selectedOptionId;
  String? _numericValue;
  bool _isSubmitted = false;
  late DateTime _itemStartTime;

  // Curated adaptive item pool for practice
  late List<AssessmentItem> _items;

  @override
  void initState() {
    super.initState();
    _itemStartTime = DateTime.now();
    ref.read(sessionProvider.notifier).startSession(widget.nodeId);
    _loadItems();
  }

  void _loadItems() {
    _items = [
      AssessmentItem(
        itemId: 'ITEM-LIN-01',
        nodeId: widget.nodeId,
        type: 'mcq_single',
        difficultyTier: 1,
        difficultyElo: 1180.0,
        stem: 'Solve for x in the equation: 4x - 7 = 21.',
        hints: const [
          ItemHint(level: 1, content: 'Isolate the term containing x by adding 7 to both sides.'),
          ItemHint(level: 2, content: 'Divide the resulting total by 4.'),
        ],
        options: const [
          ItemOption(id: 'A', content: 'x = 3.5', correct: false),
          ItemOption(id: 'B', content: 'x = 7', correct: true),
          ItemOption(
            id: 'C',
            content: 'x = 3.5 (from 21 - 7)',
            correct: false,
            misconceptionId: 'MISC.SIGN.INVERSION',
            learnerFacingName: 'Sign Inversion on Transposition',
            explanation: 'When moving -7 to the right side, its sign becomes +7, not -7.',
          ),
          ItemOption(id: 'D', content: 'x = 14', correct: false),
        ],
      ),
      AssessmentItem(
        itemId: 'ITEM-NUM-01',
        nodeId: widget.nodeId,
        type: 'numeric_input',
        difficultyTier: 2,
        difficultyElo: 1240.0,
        stem: 'If 3(2x + 4) = 42, what is the value of x?',
        hints: const [
          ItemHint(level: 1, content: 'Divide both sides by 3 first: 2x + 4 = 14.'),
          ItemHint(level: 2, content: 'Subtract 4, then divide by 2.'),
        ],
        payload: const {'correct_answer': '5'},
      ),
      AssessmentItem(
        itemId: 'ITEM-LIN-02',
        nodeId: widget.nodeId,
        type: 'mcq_single',
        difficultyTier: 2,
        difficultyElo: 1260.0,
        stem: 'For which value of k does the equation 2x + 6 = 2x + k have infinitely many solutions?',
        hints: const [
          ItemHint(level: 1, content: 'Infinitely many solutions occur when both sides are identical identities for all x.'),
        ],
        options: const [
          ItemOption(id: 'A', content: 'k = 0', correct: false),
          ItemOption(id: 'B', content: 'k = 6', correct: true),
          ItemOption(
            id: 'C',
            content: 'k = -6',
            correct: false,
            misconceptionId: 'MISC.IDENTITY.OPPOSITE',
            learnerFacingName: 'Additive Opposite Assumption',
            explanation: 'An identity requires exact equality on both sides, so k must equal 6, not its opposite.',
          ),
          ItemOption(id: 'D', content: 'No such value exists', correct: false),
        ],
      ),
    ];
  }

  AssessmentItem get _currentItem => _items[_itemIndex % _items.length];

  void _handleSubmit() {
    if (_isSubmitted) return;

    final latencyMs = DateTime.now().difference(_itemStartTime).inMilliseconds;
    final item = _currentItem;

    bool isCorrect = false;
    String? misconceptionName;
    String? explanation;

    if (item.type == 'numeric_input') {
      final expected = item.payload['correct_answer']?.toString().trim();
      isCorrect = _numericValue?.trim() == expected;
    } else {
      final chosen = item.options.firstWhere(
        (o) => o.id == _selectedOptionId,
        orElse: () => const ItemOption(id: '', content: '', correct: false),
      );
      isCorrect = chosen.correct;
      misconceptionName = chosen.learnerFacingName;
      explanation = chosen.explanation;
    }

    if (isCorrect) {
      _correctCount++;
    }

    // Record attempt through authoritative state notifier
    ref.read(nodeStateProvider.notifier).recordAttempt(
          nodeId: item.nodeId,
          correct: isCorrect,
          hintsUsed: 0,
          tier: item.difficultyTier,
          latencyMs: latencyMs,
        );

    ref.read(sessionProvider.notifier).nextTurn();

    final nodeInfo = ref.read(nodeStateProvider)[item.nodeId];
    final currentElo = nodeInfo?.state.abilityElo ?? 1200.0;
    final eloDelta = isCorrect ? 16.0 : -12.0;

    setState(() {
      _isSubmitted = true;
    });

    // Show feedback sheet
    showModalBottomSheet(
      context: context,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: Colors.transparent,
      builder: (ctx) => PracticeFeedbackSheet(
        isCorrect: isCorrect,
        diagnosticMessage: explanation ??
            (isCorrect
                ? 'Excellent mastery shown on this concept!'
                : 'Review the steps carefully to strengthen your retrieval.'),
        misconceptionName: misconceptionName,
        currentElo: currentElo,
        eloDelta: eloDelta,
        onNext: () {
          Navigator.of(ctx).pop();
          _advanceToNextItem();
        },
        onAskAi: () {
          Navigator.of(ctx).pop();
          _openAskAiSheet();
        },
      ),
    );
  }

  void _advanceToNextItem() {
    setState(() {
      _itemIndex++;
      _selectedOptionId = null;
      _numericValue = null;
      _isSubmitted = false;
      _itemStartTime = DateTime.now();
    });
  }

  void _openAskAiSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AskAiSheet(item: _currentItem),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final item = _currentItem;

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: Text('Practice: ${widget.nodeId}'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            ref.read(sessionProvider.notifier).endSession();
            context.pop();
          },
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.bgElevated,
              borderRadius: AppRadii.brSm,
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Row(
              children: [
                const Icon(Icons.check, size: 14, color: AppColors.success),
                const SizedBox(width: 4),
                Text(
                  '$_correctCount/${session.turnIndex}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: ItemRenderer(
          item: item,
          isSubmitted: _isSubmitted,
          selectedOptionId: _selectedOptionId,
          numericValue: _numericValue,
          onSelectOption: (id) {
            setState(() {
              _selectedOptionId = id;
            });
          },
          onNumericChanged: (val) {
            setState(() {
              _numericValue = val;
            });
          },
          onSubmit: _handleSubmit,
          onAskAi: _openAskAiSheet,
        ),
      ),
    );
  }
}
