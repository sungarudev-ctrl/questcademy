import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/design/tokens.dart';
import '../../data/models/content_models.dart';
import '../render/block_renderer.dart';

/// Content reading screen for a curriculum node.
/// Uses single-source BlockRenderer for structured presentation.
class NodeReaderScreen extends StatelessWidget {
  final String nodeId;

  const NodeReaderScreen({super.key, required this.nodeId});

  List<ContentBlock> _getSampleBlocksForNode(String id) {
    return [
      ContentBlock(
        blockId: 'b-h1',
        type: 'heading',
        payload: {
          'text': 'Linear Equations in One Variable',
          'level': 1,
        },
      ),
      ContentBlock(
        blockId: 'b-p1',
        type: 'paragraph',
        payload: {
          'text':
              'A linear equation in one variable is an equality involving a single unknown to the first power. The fundamental principle of solving equations is maintaining equality: any operation applied to the left-hand side must be applied identically to the right-hand side.',
        },
      ),
      ContentBlock(
        blockId: 'b-callout-1',
        type: 'callout',
        payload: {
          'title': 'The Balance Principle',
          'text':
              'Think of an equation as a balanced scale. Adding, subtracting, multiplying, or dividing both sides by the same non-zero quantity preserves exact balance.',
        },
      ),
      ContentBlock(
        blockId: 'b-math-1',
        type: 'math',
        payload: {
          'latex': 'ax + b = c \\implies ax = c - b \\implies x = \\frac{c - b}{a}',
        },
      ),
      ContentBlock(
        blockId: 'b-we-1',
        type: 'worked_example',
        payload: {
          'title': 'Solving 3x - 5 = 16',
          'steps': [
            'Add 5 to both sides of the equation: 3x - 5 + 5 = 16 + 5, yielding 3x = 21.',
            'Divide both sides by the coefficient 3: 3x / 3 = 21 / 3.',
            'Isolate x: x = 7.',
            'Substitute 7 back into the original equation to verify: 3(7) - 5 = 21 - 5 = 16 (Verified).',
          ],
          'final_answer': 'x = 7',
        },
      ),
      ContentBlock(
        blockId: 'b-ir-1',
        type: 'interactive',
        payload: {
          'prompt': 'What happens if the coefficient of x is negative, such as -2x = 10?',
          'revealed_text':
              'Divide both sides by -2: (-2x)/(-2) = 10/(-2), which gives x = -5. A negative divided by a positive yields a negative.',
        },
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final blocks = _getSampleBlocksForNode(nodeId);

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: Text(nodeId),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.space_4,
                  vertical: AppSpacing.space_2,
                ),
                itemCount: blocks.length,
                itemBuilder: (context, index) {
                  return BlockRenderer(block: blocks[index]);
                },
              ),
            ),
            Container(
              padding: const EdgeInsets.all(AppSpacing.space_4),
              decoration: const BoxDecoration(
                color: AppColors.bgSurface,
                border: Border(top: BorderSide(color: AppColors.borderSubtle)),
              ),
              child: ElevatedButton.icon(
                onPressed: () {
                  context.push('/practice/$nodeId');
                },
                icon: const Icon(Icons.fitness_center, size: 20),
                label: const Text('Practice This Concept'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  minimumSize: const Size(double.infinity, 48), // 6pm touch target
                  shape: RoundedRectangleBorder(borderRadius: AppRadii.brMd),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
