import 'package:flutter/material.dart';
import '../../core/design/tokens.dart';
import '../../data/models/content_models.dart';
import '../widgets/numeric_keypad.dart';

/// Single-source Flutter ItemRenderer conforming to shared/renderer-fixtures/
class ItemRenderer extends StatefulWidget {
  final AssessmentItem item;
  final bool isSubmitted;
  final String? selectedOptionId;
  final Set<String>? selectedMultiOptionIds;
  final String? numericValue;
  final ValueChanged<String>? onSelectOption;
  final ValueChanged<Set<String>>? onSelectMultiOption;
  final ValueChanged<String>? onNumericChanged;
  final VoidCallback? onSubmit;
  final VoidCallback? onAskAi;

  const ItemRenderer({
    super.key,
    required this.item,
    this.isSubmitted = false,
    this.selectedOptionId,
    this.selectedMultiOptionIds,
    this.numericValue,
    this.onSelectOption,
    this.onSelectMultiOption,
    this.onNumericChanged,
    this.onSubmit,
    this.onAskAi,
  });

  @override
  State<ItemRenderer> createState() => _ItemRendererState();
}

class _ItemRendererState extends State<ItemRenderer> {
  int _hintsRevealed = 0;
  late Set<String> _multiSelections;
  String _internalNumeric = '';

  @override
  void initState() {
    super.initState();
    _multiSelections = widget.selectedMultiOptionIds != null
        ? Set.from(widget.selectedMultiOptionIds!)
        : {};
    _internalNumeric = widget.numericValue ?? '';
  }

  @override
  void didUpdateWidget(covariant ItemRenderer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.item.itemId != oldWidget.item.itemId) {
      _hintsRevealed = 0;
      _multiSelections = widget.selectedMultiOptionIds != null
          ? Set.from(widget.selectedMultiOptionIds!)
          : {};
      _internalNumeric = widget.numericValue ?? '';
    }
  }

  bool get _isNumericType =>
      widget.item.type == 'numeric_input' || widget.item.type == 'fraction_input';

  bool get _isMultiSelect =>
      widget.item.type == 'mcq_multi' || widget.item.type == 'multi_select';

  @override
  Widget build(BuildContext context) {
    final item = widget.item;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.space_4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildStem(item),
          if (item.hints.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.space_3),
            _buildHints(item),
          ],
          const SizedBox(height: AppSpacing.space_4),
          if (_isNumericType)
            _buildNumericEntry(item)
          else
            _buildOptions(item),
          const SizedBox(height: AppSpacing.space_6),
          if (!widget.isSubmitted)
            _buildSubmitButton()
          else
            _buildPostSubmitActions(),
        ],
      ),
    );
  }

  Widget _buildStem(AssessmentItem item) {
    return Container(
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
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(35),
                  borderRadius: AppRadii.brSm,
                ),
                child: Text(
                  'Tier ${item.difficultyTier}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryHover,
                  ),
                ),
              ),
              const Spacer(),
              if (widget.onAskAi != null)
                TextButton.icon(
                  onPressed: widget.onAskAi,
                  icon: const Icon(Icons.psychology_outlined, size: 16),
                  label: const Text('Ask Socratic AI'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.accentGlow,
                    padding: EdgeInsets.zero,
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.space_3),
          Text(
            item.stem,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHints(AssessmentItem item) {
    final hints = item.hints;
    final total = hints.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_hintsRevealed < total && !widget.isSubmitted)
          TextButton.icon(
            onPressed: () {
              setState(() {
                _hintsRevealed++;
              });
            },
            icon: const Icon(Icons.lightbulb_outline, size: 16),
            label: Text('Need a hint? (${_hintsRevealed + 1} of $total)'),
            style: TextButton.styleFrom(
              foregroundColor: AppColors.warning,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
          ),
        ...List.generate(_hintsRevealed, (index) {
          final hint = hints[index];
          return Container(
            width: double.infinity,
            margin: const EdgeInsets.only(top: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.bgElevated,
              borderRadius: AppRadii.brSm,
              border: Border(
                left: BorderSide(color: AppColors.warning.withAlpha(180), width: 3),
              ),
            ),
            child: Text(
              'Hint ${hint.level}: ${hint.content}',
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildOptions(AssessmentItem item) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    return Column(
      children: List.generate(item.options.length, (index) {
        final option = item.options[index];
        final letter = index < letters.length ? letters[index] : '${index + 1}';
        final isSelected = _isMultiSelect
            ? _multiSelections.contains(option.id)
            : widget.selectedOptionId == option.id;

        Color cardBg = AppColors.bgSurface;
        Color borderColor = AppColors.borderSubtle;
        Color badgeBg = AppColors.bgElevated;
        Color badgeFg = AppColors.textSecondary;

        if (widget.isSubmitted) {
          if (option.correct) {
            cardBg = AppColors.success.withAlpha(30);
            borderColor = AppColors.success;
            badgeBg = AppColors.success;
            badgeFg = Colors.white;
          } else if (isSelected && !option.correct) {
            cardBg = AppColors.error.withAlpha(30);
            borderColor = AppColors.error;
            badgeBg = AppColors.error;
            badgeFg = Colors.white;
          }
        } else if (isSelected) {
          cardBg = AppColors.primary.withAlpha(35);
          borderColor = AppColors.primaryHover;
          badgeBg = AppColors.primary;
          badgeFg = Colors.white;
        }

        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.space_3),
          child: Material(
            color: cardBg,
            borderRadius: AppRadii.brMd,
            child: InkWell(
              onTap: widget.isSubmitted
                  ? null
                  : () {
                      if (_isMultiSelect) {
                        setState(() {
                          if (_multiSelections.contains(option.id)) {
                            _multiSelections.remove(option.id);
                          } else {
                            _multiSelections.add(option.id);
                          }
                        });
                        widget.onSelectMultiOption?.call(_multiSelections);
                      } else {
                        widget.onSelectOption?.call(option.id);
                      }
                    },
              borderRadius: AppRadii.brMd,
              child: Container(
                constraints: const BoxConstraints(minHeight: 48), // 6pm test minimum
                padding: const EdgeInsets.all(AppSpacing.space_3),
                decoration: BoxDecoration(
                  borderRadius: AppRadii.brMd,
                  border: Border.all(color: borderColor, width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: badgeBg,
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            letter,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: badgeFg,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.space_3),
                        Expanded(
                          child: Text(
                            option.content,
                            style: const TextStyle(
                              fontSize: 15,
                              color: AppColors.textPrimary,
                              height: 1.35,
                            ),
                          ),
                        ),
                        if (widget.isSubmitted && option.correct)
                          const Icon(Icons.check_circle, color: AppColors.success, size: 22),
                        if (widget.isSubmitted && isSelected && !option.correct)
                          const Icon(Icons.cancel, color: AppColors.error, size: 22),
                      ],
                    ),
                    if (widget.isSubmitted &&
                        isSelected &&
                        !option.correct &&
                        (option.learnerFacingName != null || option.explanation != null)) ...[
                      const SizedBox(height: AppSpacing.space_2),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(AppSpacing.space_2),
                        decoration: BoxDecoration(
                          color: AppColors.error.withAlpha(20),
                          borderRadius: AppRadii.brSm,
                          border: Border.all(color: AppColors.error.withAlpha(70)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (option.learnerFacingName != null)
                              Text(
                                'Misconception: ${option.learnerFacingName}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.error,
                                ),
                              ),
                            if (option.explanation != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text(
                                  option.explanation!,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildNumericEntry(AssessmentItem item) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          decoration: BoxDecoration(
            color: AppColors.bgSurface,
            borderRadius: AppRadii.brMd,
            border: Border.all(color: AppColors.primaryHover, width: 1.5),
          ),
          child: Row(
            children: [
              const Text(
                'Answer: ',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted,
                ),
              ),
              Expanded(
                child: Text(
                  _internalNumeric.isEmpty ? 'Tap keys below to enter' : _internalNumeric,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: _internalNumeric.isEmpty
                        ? AppColors.textDisabled
                        : AppColors.textPrimary,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.space_3),
        if (!widget.isSubmitted)
          NumericKeypad(
            onKeyPress: (key) {
              setState(() {
                _internalNumeric += key;
              });
              widget.onNumericChanged?.call(_internalNumeric);
            },
            onBackspace: () {
              if (_internalNumeric.isNotEmpty) {
                setState(() {
                  _internalNumeric =
                      _internalNumeric.substring(0, _internalNumeric.length - 1);
                });
                widget.onNumericChanged?.call(_internalNumeric);
              }
            },
            onSubmit: widget.onSubmit,
          ),
      ],
    );
  }

  Widget _buildSubmitButton() {
    final hasSelection = _isNumericType
        ? _internalNumeric.trim().isNotEmpty
        : _isMultiSelect
            ? _multiSelections.isNotEmpty
            : widget.selectedOptionId != null;

    return ElevatedButton(
      onPressed: hasSelection ? widget.onSubmit : null,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        disabledBackgroundColor: AppColors.bgHover,
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(borderRadius: AppRadii.brMd),
      ),
      child: const Text(
        'Submit Answer',
        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildPostSubmitActions() {
    return Column(
      children: [
        if (widget.onAskAi != null)
          OutlinedButton.icon(
            onPressed: widget.onAskAi,
            icon: const Icon(Icons.psychology, size: 20),
            label: const Text('Discuss with Socratic AI Tutor'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.accentGlow,
              side: const BorderSide(color: AppColors.accent),
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(borderRadius: AppRadii.brMd),
            ),
          ),
      ],
    );
  }
}
