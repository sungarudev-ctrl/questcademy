import 'package:flutter/material.dart';
import '../../core/design/tokens.dart';

/// Custom in-app numeric keypad conforming to §11.6.
/// Never uses native virtual keyboards (preventing Android Go fraction corruption).
class NumericKeypad extends StatelessWidget {
  final ValueChanged<String> onKeyPress;
  final VoidCallback? onBackspace;
  final VoidCallback? onSubmit;

  const NumericKeypad({
    super.key,
    required this.onKeyPress,
    this.onBackspace,
    this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: const BoxDecoration(
        color: AppColors.bgSurface,
        border: Border(top: BorderSide(color: AppColors.borderSubtle)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildRow(['7', '8', '9'], backspace: true),
            const SizedBox(height: 8),
            _buildRow(['4', '5', '6', '/']),
            const SizedBox(height: 8),
            _buildRow(['1', '2', '3', '-']),
            const SizedBox(height: 8),
            _buildBottomRow(),
          ],
        ),
      ),
    );
  }

  Widget _buildRow(List<String> keys, {bool backspace = false}) {
    return Row(
      children: [
        ...keys.map((k) => Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: _buildKey(
                  label: k,
                  isAction: k == '/' || k == '-',
                  onTap: () => onKeyPress(k),
                ),
              ),
            )),
        if (backspace)
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: _buildKey(
                icon: Icons.backspace_outlined,
                isAction: true,
                onTap: onBackspace,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildBottomRow() {
    return Row(
      children: [
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: _buildKey(
              label: '0',
              onTap: () => onKeyPress('0'),
            ),
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: _buildKey(
              label: '.',
              isAction: true,
              onTap: () => onKeyPress('.'),
            ),
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: _buildKey(
              label: '^',
              isAction: true,
              onTap: () => onKeyPress('^'),
            ),
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: _buildKey(
              icon: Icons.check,
              isPrimary: true,
              onTap: onSubmit,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildKey({
    String? label,
    IconData? icon,
    bool isAction = false,
    bool isPrimary = false,
    VoidCallback? onTap,
  }) {
    Color bg = AppColors.bgElevated;
    Color fg = AppColors.textPrimary;
    BorderSide border = const BorderSide(color: AppColors.borderSubtle);

    if (isPrimary) {
      bg = AppColors.primary;
      fg = Colors.white;
      border = const BorderSide(color: AppColors.primaryHover);
    } else if (isAction) {
      bg = AppColors.bgHover;
      fg = AppColors.primaryHover;
    }

    return Material(
      color: bg,
      borderRadius: AppRadii.brMd,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadii.brMd,
        child: Container(
          height: 48, // 6pm test minimum touch target
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: AppRadii.brMd,
            border: Border.all(color: border.color),
          ),
          child: icon != null
              ? Icon(icon, size: 22, color: fg)
              : Text(
                  label ?? '',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: fg,
                  ),
                ),
        ),
      ),
    );
  }
}
