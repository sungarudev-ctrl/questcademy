import 'package:flutter/material.dart';
import '../../core/design/tokens.dart';
import '../../data/models/content_models.dart';

/// Single-source Flutter BlockRenderer conforming to shared/renderer-fixtures/
class BlockRenderer extends StatefulWidget {
  final ContentBlock block;

  const BlockRenderer({super.key, required this.block});

  @override
  State<BlockRenderer> createState() => _BlockRendererState();
}

class _BlockRendererState extends State<BlockRenderer> {
  int _workedExampleRevealedSteps = 1;
  bool _interactiveRevealed = false;

  @override
  Widget build(BuildContext context) {
    final block = widget.block;
    switch (block.type) {
      case 'heading':
        return _buildHeading(block.payload);
      case 'paragraph':
      case 'text':
        return _buildParagraph(block.payload);
      case 'math':
        return _buildMath(block.payload);
      case 'callout':
        return _buildCallout(block.payload);
      case 'worked_example':
        return _buildWorkedExample(block.payload);
      case 'interactive':
        return _buildInteractive(block.payload);
      case 'table':
        return _buildTable(block.payload);
      default:
        return _buildFallback(block);
    }
  }

  Widget _buildHeading(Map<String, dynamic> payload) {
    final text = payload['text'] as String? ?? '';
    final level = (payload['level'] as num?)?.toInt() ?? 1;

    double fontSize;
    FontWeight fontWeight;
    switch (level) {
      case 1:
        fontSize = 26;
        fontWeight = FontWeight.w700;
        break;
      case 2:
        fontSize = 20;
        fontWeight = FontWeight.w600;
        break;
      case 3:
      default:
        fontSize = 17;
        fontWeight = FontWeight.w600;
        break;
    }

    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.space_4, bottom: AppSpacing.space_2),
      child: Text(
        text,
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: fontWeight,
          color: AppColors.textPrimary,
          height: 1.3,
        ),
      ),
    );
  }

  Widget _buildParagraph(Map<String, dynamic> payload) {
    final text = payload['text'] as String? ?? '';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.space_2),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 15,
          color: AppColors.textSecondary,
          height: 1.5,
        ),
      ),
    );
  }

  Widget _buildMath(Map<String, dynamic> payload) {
    final latex = payload['latex'] as String? ?? '';
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.space_3),
      padding: const EdgeInsets.all(AppSpacing.space_4),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: AppRadii.brMd,
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.functions, size: 18, color: AppColors.accent),
              const SizedBox(width: AppSpacing.space_2),
              Flexible(
                child: Text(
                  latex,
                  style: const TextStyle(
                    fontFamily: 'serif',
                    fontStyle: FontStyle.italic,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    letterSpacing: 0.5,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCallout(Map<String, dynamic> payload) {
    final title = payload['title'] as String? ?? 'Note';
    final text = payload['text'] as String? ?? '';
    final titleLower = title.toLowerCase();

    Color accentColor = AppColors.info;
    IconData icon = Icons.info_outline;
    if (titleLower.contains('warning') || titleLower.contains('caution')) {
      accentColor = AppColors.warning;
      icon = Icons.warning_amber_rounded;
    } else if (titleLower.contains('tip') || titleLower.contains('key') || titleLower.contains('rule')) {
      accentColor = AppColors.accent;
      icon = Icons.lightbulb_outline;
    }

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.space_3),
      padding: const EdgeInsets.all(AppSpacing.space_4),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: AppRadii.brMd,
        border: Border(
          left: BorderSide(color: accentColor, width: 4),
          top: const BorderSide(color: AppColors.borderSubtle),
          right: const BorderSide(color: AppColors.borderSubtle),
          bottom: const BorderSide(color: AppColors.borderSubtle),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: accentColor),
              const SizedBox(width: AppSpacing.space_2),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: accentColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.space_2),
          Text(
            text,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWorkedExample(Map<String, dynamic> payload) {
    final title = payload['title'] as String? ?? 'Worked Example';
    final rawSteps = payload['steps'] as List<dynamic>? ?? [];
    final steps = rawSteps.map((s) => s.toString()).toList();
    final finalAnswer = payload['final_answer'] as String?;

    final totalSteps = steps.length;
    final shownCount = _workedExampleRevealedSteps.clamp(1, totalSteps);

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.space_3),
      padding: const EdgeInsets.all(AppSpacing.space_4),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: AppRadii.brMd,
        border: Border.all(color: AppColors.primary.withAlpha(80)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(40),
                  borderRadius: AppRadii.brSm,
                ),
                child: const Text(
                  'Worked Example',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryHover,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                'Step $shownCount of $totalSteps',
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.space_3),
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: AppSpacing.space_3),
          ...List.generate(shownCount, (index) {
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.space_2),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.bgElevated,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: Text(
                      '${index + 1}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.space_2),
                  Expanded(
                    child: Text(
                      steps[index],
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
          if (shownCount < totalSteps) ...[
            const SizedBox(height: AppSpacing.space_2),
            OutlinedButton.icon(
              onPressed: () {
                setState(() {
                  _workedExampleRevealedSteps++;
                });
              },
              icon: const Icon(Icons.unfold_more, size: 16),
              label: const Text('Show next step'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primaryHover,
                side: const BorderSide(color: AppColors.primary),
                minimumSize: const Size(double.infinity, 44),
                shape: RoundedRectangleBorder(borderRadius: AppRadii.brSm),
              ),
            ),
          ] else if (finalAnswer != null) ...[
            const SizedBox(height: AppSpacing.space_3),
            Container(
              padding: const EdgeInsets.all(AppSpacing.space_3),
              decoration: BoxDecoration(
                color: AppColors.success.withAlpha(25),
                borderRadius: AppRadii.brSm,
                border: Border.all(color: AppColors.success.withAlpha(80)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline, size: 18, color: AppColors.success),
                  const SizedBox(width: AppSpacing.space_2),
                  Text(
                    'Result: $finalAnswer',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.success,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInteractive(Map<String, dynamic> payload) {
    final prompt = payload['prompt'] as String? ?? 'Tap to reveal';
    final revealedText = payload['revealed_text'] as String? ?? '';

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.space_3),
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
                  prompt,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              IconButton(
                onPressed: () {
                  setState(() {
                    _interactiveRevealed = !_interactiveRevealed;
                  });
                },
                icon: Icon(
                  _interactiveRevealed ? Icons.visibility_off : Icons.visibility,
                  color: AppColors.accent,
                ),
              ),
            ],
          ),
          if (_interactiveRevealed) ...[
            const Divider(color: AppColors.borderSubtle),
            const SizedBox(height: AppSpacing.space_2),
            Text(
              revealedText,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.accentGlow,
                height: 1.4,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTable(Map<String, dynamic> payload) {
    final rawHeaders = payload['headers'] as List<dynamic>? ?? [];
    final headers = rawHeaders.map((h) => h.toString()).toList();
    final rawRows = payload['rows'] as List<dynamic>? ?? [];

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.space_3),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: AppRadii.brMd,
        border: Border.all(color: AppColors.borderSubtle),
      ),
      clipBehavior: Clip.antiAlias,
      child: Table(
        border: TableBorder.all(color: AppColors.borderSubtle, width: 0.5),
        children: [
          if (headers.isNotEmpty)
            TableRow(
              decoration: const BoxDecoration(color: AppColors.bgElevated),
              children: headers
                  .map((h) => Padding(
                        padding: const EdgeInsets.all(AppSpacing.space_3),
                        child: Text(
                          h,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ))
                  .toList(),
            ),
          ...rawRows.map((row) {
            final cells = (row as List<dynamic>).map((c) => c.toString()).toList();
            return TableRow(
              children: cells
                  .map((c) => Padding(
                        padding: const EdgeInsets.all(AppSpacing.space_3),
                        child: Text(
                          c,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ))
                  .toList(),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildFallback(ContentBlock block) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.space_2),
      padding: const EdgeInsets.all(AppSpacing.space_3),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: AppRadii.brSm,
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Text(
        '[${block.type} block: ${block.blockId}]',
        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
      ),
    );
  }
}
