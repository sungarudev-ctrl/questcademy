import 'package:flutter/material.dart';
import '../../core/design/tokens.dart';

/// Full-screen Socratic AI Tutor dialogue interface.
/// Provides voice input stub (§11.7), starter questions, and scaffolded guiding inquiry.
class TutorScreen extends StatefulWidget {
  const TutorScreen({super.key});

  @override
  State<TutorScreen> createState() => _TutorScreenState();
}

class _TutorScreenState extends State<TutorScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isGenerating = false;
  bool _isRecordingVoice = false;

  final List<String> _starters = [
    'How do I approach complex word problems?',
    'Explain the quadratic formula intuitively',
    'Help me understand standard deviation',
    'Quiz me on linear systems',
  ];

  @override
  void initState() {
    super.initState();
    _messages.add({
      'sender': 'tutor',
      'text':
          'Welcome to your Socratic Study Partner. I will help you build deep conceptual understanding by asking guiding questions and breaking down tricky ideas. What would you like to explore today?',
      'time': DateTime.now(),
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage(String text) {
    if (text.trim().isEmpty) return;

    setState(() {
      _messages.add({
        'sender': 'learner',
        'text': text.trim(),
        'time': DateTime.now(),
      });
      _isGenerating = true;
    });
    _controller.clear();
    _scrollToBottom();

    // Socratic dialogue generator simulation
    Future.delayed(const Duration(milliseconds: 700), () {
      if (!mounted) return;
      final q = text.toLowerCase();
      String response;
      if (q.contains('word problem')) {
        response =
            'When unpacking word problems, the first step is assigning distinct variable names to each unknown quantity. What is the specific question asking you to determine in your problem?';
      } else if (q.contains('quadratic')) {
        response =
            'Think of a parabola y = ax^2 + bx + c. The vertex lies at x = -b/(2a). Notice how the full formula adds and subtracts sqrt(b^2 - 4ac)/(2a) from that exact center? What does the quantity under the radical tell you about where it intersects the x-axis?';
      } else if (q.contains('standard deviation')) {
        response =
            'Standard deviation is simply the typical distance that data points sit away from the mean. If a dataset has standard deviation 0, what does every single data value look like?';
      } else if (q.contains('quiz') || q.contains('linear')) {
        response =
            'Here is a quick check: Suppose 3x + 2y = 12 and 3x + 2y = 18. Without graphing, how many intersection points does this system have?';
      } else {
        response =
            'That is a thoughtful inquiry. To build an intuition for it, what is the simplest concrete case or number we could test first?';
      }

      setState(() {
        _messages.add({
          'sender': 'tutor',
          'text': response,
          'time': DateTime.now(),
        });
        _isGenerating = false;
      });
      _scrollToBottom();
    });
  }

  void _toggleVoiceRecording() {
    setState(() {
      _isRecordingVoice = !_isRecordingVoice;
    });

    if (_isRecordingVoice) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Listening... (Voice recording active)'),
          backgroundColor: AppColors.accent,
          duration: Duration(seconds: 2),
        ),
      );
      // Simulate voice capture
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted && _isRecordingVoice) {
          setState(() {
            _isRecordingVoice = false;
          });
          _sendMessage('Can you give me a hint on solving systems of equations by substitution?');
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.psychology, color: AppColors.accentGlow, size: 22),
            SizedBox(width: 8),
            Text('Socratic AI Tutor'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.textMuted),
            tooltip: 'Clear session',
            onPressed: () {
              setState(() {
                _messages.clear();
                _messages.add({
                  'sender': 'tutor',
                  'text': 'Fresh session started. What concept would you like to master next?',
                  'time': DateTime.now(),
                });
              });
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(AppSpacing.space_4),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  final isLearner = msg['sender'] == 'learner';

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      mainAxisAlignment:
                          isLearner ? MainAxisAlignment.end : MainAxisAlignment.start,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (!isLearner) ...[
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppColors.accent.withAlpha(40),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.psychology,
                              color: AppColors.accentGlow,
                              size: 16,
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
                        Flexible(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: isLearner ? AppColors.primary : AppColors.bgSurface,
                              borderRadius: BorderRadius.only(
                                topLeft: const Radius.circular(16),
                                topRight: const Radius.circular(16),
                                bottomLeft: Radius.circular(isLearner ? 16 : 4),
                                bottomRight: Radius.circular(isLearner ? 4 : 16),
                              ),
                              border: Border.all(
                                color: isLearner
                                    ? AppColors.primaryHover
                                    : AppColors.borderSubtle,
                              ),
                            ),
                            child: Text(
                              msg['text'] as String,
                              style: TextStyle(
                                fontSize: 14,
                                color: isLearner ? Colors.white : AppColors.textPrimary,
                                height: 1.45,
                              ),
                            ),
                          ),
                        ),
                        if (isLearner) const SizedBox(width: 8),
                      ],
                    ),
                  );
                },
              ),
            ),
            if (_isGenerating)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                child: Row(
                  children: [
                    SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent),
                    ),
                    SizedBox(width: 10),
                    Text(
                      'Formulating Socratic question...',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
            // Starter prompt chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.space_4, vertical: 4),
              child: Row(
                children: _starters.map((starter) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ActionChip(
                      label: Text(starter),
                      onPressed: () => _sendMessage(starter),
                      backgroundColor: AppColors.bgSurface,
                      side: const BorderSide(color: AppColors.borderSubtle),
                      labelStyle: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  );
                }).toList(),
              ),
            ),
            // Input row with voice recording support
            Container(
              padding: const EdgeInsets.all(AppSpacing.space_3),
              decoration: const BoxDecoration(
                color: AppColors.bgSurface,
                border: Border(top: BorderSide(color: AppColors.borderSubtle)),
              ),
              child: Row(
                children: [
                  // Voice recording button
                  Container(
                    width: 48, // 6pm touch target
                    height: 48,
                    decoration: BoxDecoration(
                      color: _isRecordingVoice ? AppColors.error : AppColors.bgElevated,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: _isRecordingVoice
                            ? AppColors.error
                            : AppColors.borderSubtle,
                      ),
                    ),
                    child: IconButton(
                      icon: Icon(
                        _isRecordingVoice ? Icons.mic : Icons.mic_none,
                        color: _isRecordingVoice ? Colors.white : AppColors.accentGlow,
                        size: 22,
                      ),
                      onPressed: _toggleVoiceRecording,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.space_2),
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: _isRecordingVoice
                            ? 'Listening to your voice...'
                            : 'Ask any math or concept question...',
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
                    width: 48, // 6pm touch target
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: AppRadii.brMd,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.send, color: Colors.white, size: 20),
                      onPressed: () => _sendMessage(_controller.text),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
