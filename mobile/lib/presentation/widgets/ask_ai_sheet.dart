import 'package:flutter/material.dart';
import '../../core/design/tokens.dart';
import '../../data/models/content_models.dart';

/// Interactive Socratic AI discussion sheet triggered from assessment or worked examples.
class AskAiSheet extends StatefulWidget {
  final AssessmentItem? item;
  final String? initialContext;

  const AskAiSheet({
    super.key,
    this.item,
    this.initialContext,
  });

  @override
  State<AskAiSheet> createState() => _AskAiSheetState();
}

class _AskAiSheetState extends State<AskAiSheet> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, String>> _messages = [];
  bool _isGenerating = false;

  final List<String> _starterPrompts = [
    'Where should I begin?',
    'Give me a guiding hint',
    'Why is my line of thought flawed?',
    'Can you explain the core formula?',
  ];

  @override
  void initState() {
    super.initState();
    final stemContext = widget.item != null ? ' regarding: "${widget.item!.stem}"' : '';
    _messages.add({
      'sender': 'tutor',
      'text':
          'Hello! I am your Socratic Study Partner. What part of this concept$stemContext would you like to explore together?',
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _sendMessage(String text) {
    if (text.trim().isEmpty) return;
    setState(() {
      _messages.add({'sender': 'learner', 'text': text.trim()});
      _isGenerating = true;
    });
    _controller.clear();

    // Socratic response simulator
    Future.delayed(const Duration(milliseconds: 650), () {
      if (!mounted) return;
      String reply;
      final query = text.toLowerCase();
      if (query.contains('begin') || query.contains('start')) {
        reply =
            'Consider the unknown variable first. Which terms can you isolate on one side of the relation?';
      } else if (query.contains('hint')) {
        reply =
            'Look closely at the denominators or grouping symbols. What common factor or LCD could simplify both terms?';
      } else if (query.contains('why') || query.contains('wrong') || query.contains('flaw')) {
        reply =
            'When operations are applied across fractions or terms, does distributing across addition preserve equivalence? Let\'s test with small integers.';
      } else {
        reply =
            'Great observation. If you apply that transformation to the left side, what happens to maintain balance on the right?';
      }

      setState(() {
        _messages.add({'sender': 'tutor', 'text': reply});
        _isGenerating = false;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.space_4, vertical: AppSpacing.space_3),
      decoration: const BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.borderStrong,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: AppSpacing.space_3),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withAlpha(40),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.psychology, color: AppColors.accentGlow, size: 22),
                ),
                const SizedBox(width: AppSpacing.space_3),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Socratic AI Tutor',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        'Guiding questions, never spoilers',
                        style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close, color: AppColors.textMuted),
                ),
              ],
            ),
            const Divider(color: AppColors.borderSubtle, height: 24),
            // Message stream
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.only(bottom: AppSpacing.space_3),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  final isLearner = msg['sender'] == 'learner';

                  return Align(
                    alignment: isLearner ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      constraints: BoxConstraints(
                        maxWidth: MediaQuery.of(context).size.width * 0.8,
                      ),
                      decoration: BoxDecoration(
                        color: isLearner ? AppColors.primary : AppColors.bgElevated,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(16),
                          topRight: const Radius.circular(16),
                          bottomLeft: Radius.circular(isLearner ? 16 : 4),
                          bottomRight: Radius.circular(isLearner ? 4 : 16),
                        ),
                        border: Border.all(
                          color: isLearner ? AppColors.primaryHover : AppColors.borderSubtle,
                        ),
                      ),
                      child: Text(
                        msg['text'] ?? '',
                        style: TextStyle(
                          fontSize: 14,
                          color: isLearner ? Colors.white : AppColors.textPrimary,
                          height: 1.4,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            if (_isGenerating) ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent),
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Thinking Socratic hint...',
                        style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            // Starter prompts
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(bottom: AppSpacing.space_3),
              child: Row(
                children: _starterPrompts.map((prompt) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ActionChip(
                      label: Text(prompt),
                      onPressed: () => _sendMessage(prompt),
                      backgroundColor: AppColors.bgElevated,
                      side: const BorderSide(color: AppColors.borderSubtle),
                      labelStyle: const TextStyle(fontSize: 12, color: AppColors.accentGlow),
                    ),
                  );
                }).toList(),
              ),
            ),
            // Text Input
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Ask a question or explain your thinking...',
                      hintStyle: const TextStyle(color: AppColors.textDisabled, fontSize: 13),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      fillColor: AppColors.bgInput,
                      filled: true,
                      border: OutlineInputBorder(
                        borderRadius: AppRadii.brMd,
                        borderSide: const BorderSide(color: AppColors.borderSubtle),
                      ),
                    ),
                    onSubmitted: _sendMessage,
                  ),
                ),
                const SizedBox(width: AppSpacing.space_2),
                Container(
                  width: 48, // 6pm test minimum touch target
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: AppRadii.brMd,
                  ),
                  child: IconButton(
                    onPressed: () => _sendMessage(_controller.text),
                    icon: const Icon(Icons.send, color: Colors.white, size: 20),
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
