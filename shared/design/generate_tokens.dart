import 'dart:convert';
import 'dart:io';

void main() {
  final tokenFile = File('shared/design/tokens.json');
  if (!tokenFile.existsSync()) {
    stderr.writeln('Error: shared/design/tokens.json not found.');
    exit(1);
  }

  final jsonStr = tokenFile.readAsStringSync();
  final Map<String, dynamic> data = jsonDecode(jsonStr);

  final colors = data['colors'] as Map<String, dynamic>;
  final primary = colors['primary'] as Map<String, dynamic>;
  final accent = colors['accent'] as Map<String, dynamic>;
  final semantic = colors['semantic'] as Map<String, dynamic>;
  final neutral = colors['neutral_dark'] as Map<String, dynamic>;
  final subjects = colors['subjects'] as Map<String, dynamic>;
  final spacing = data['spacing'] as Map<String, dynamic>;
  final radii = data['radii'] as Map<String, dynamic>;

  String toColorConst(String hex) {
    final clean = hex.replaceAll('#', '');
    return 'Color(0xFF${clean.toUpperCase()})';
  }

  final tokensBuffer = StringBuffer();
  tokensBuffer.writeln('// GENERATED FILE - DO NOT EDIT MANUALLY');
  tokensBuffer.writeln('// Source: shared/design/tokens.json');
  tokensBuffer.writeln('import \'package:flutter/material.dart\';');
  tokensBuffer.writeln('');
  tokensBuffer.writeln('class AppColors {');
  tokensBuffer.writeln('  // Primary Palette');
  tokensBuffer.writeln('  static const Color primary = ${toColorConst(primary['default'])};');
  tokensBuffer.writeln('  static const Color primaryHover = ${toColorConst(primary['hover'])};');
  tokensBuffer.writeln('  static const Color primaryDeep = ${toColorConst(primary['deep'])};');
  tokensBuffer.writeln('');
  tokensBuffer.writeln('  // Accent Palette');
  tokensBuffer.writeln('  static const Color accent = ${toColorConst(accent['default'])};');
  tokensBuffer.writeln('  static const Color accentGlow = ${toColorConst(accent['glow'])};');
  tokensBuffer.writeln('');
  tokensBuffer.writeln('  // Semantic Palette');
  tokensBuffer.writeln('  static const Color success = ${toColorConst(semantic['success'])};');
  tokensBuffer.writeln('  static const Color warning = ${toColorConst(semantic['warning'])};');
  tokensBuffer.writeln('  static const Color error = ${toColorConst(semantic['error'])};');
  tokensBuffer.writeln('  static const Color info = ${toColorConst(semantic['info'])};');
  tokensBuffer.writeln('');
  tokensBuffer.writeln('  // Dark-First Neutral Scale');
  tokensBuffer.writeln('  static const Color bgCanvas = ${toColorConst(neutral['bg_canvas'])};');
  tokensBuffer.writeln('  static const Color bgSurface = ${toColorConst(neutral['bg_surface'])};');
  tokensBuffer.writeln('  static const Color bgElevated = ${toColorConst(neutral['bg_elevated'])};');
  tokensBuffer.writeln('  static const Color bgHover = ${toColorConst(neutral['bg_hover'])};');
  tokensBuffer.writeln('  static const Color bgInput = ${toColorConst(neutral['bg_input'])};');
  tokensBuffer.writeln('  static const Color borderSubtle = ${toColorConst(neutral['border_subtle'])};');
  tokensBuffer.writeln('  static const Color borderStrong = ${toColorConst(neutral['border_strong'])};');
  tokensBuffer.writeln('  static const Color textPrimary = ${toColorConst(neutral['text_primary'])};');
  tokensBuffer.writeln('  static const Color textSecondary = ${toColorConst(neutral['text_secondary'])};');
  tokensBuffer.writeln('  static const Color textMuted = ${toColorConst(neutral['text_muted'])};');
  tokensBuffer.writeln('  static const Color textDisabled = ${toColorConst(neutral['text_disabled'])};');
  tokensBuffer.writeln('');
  tokensBuffer.writeln('  // Subject Color Coding');
  for (final entry in subjects.entries) {
    tokensBuffer.writeln('  static const Color subject${entry.key[0].toUpperCase()}${entry.key.substring(1)} = ${toColorConst(entry.value)};');
  }
  tokensBuffer.writeln('}');
  tokensBuffer.writeln('');

  tokensBuffer.writeln('class AppSpacing {');
  for (final entry in spacing.entries) {
    final name = entry.key; // e.g. space_4
    tokensBuffer.writeln('  static const double $name = ${entry.value}.0;');
  }
  tokensBuffer.writeln('}');
  tokensBuffer.writeln('');

  tokensBuffer.writeln('class AppRadii {');
  for (final entry in radii.entries) {
    tokensBuffer.writeln('  static const double ${entry.key} = ${entry.value}.0;');
    tokensBuffer.writeln('  static const Radius r${entry.key[0].toUpperCase()}${entry.key.substring(1)} = Radius.circular(${entry.value}.0);');
    tokensBuffer.writeln('  static const BorderRadius br${entry.key[0].toUpperCase()}${entry.key.substring(1)} = BorderRadius.all(Radius.circular(${entry.value}.0));');
  }
  tokensBuffer.writeln('}');

  final outDir = Directory('mobile/lib/core/design');
  if (!outDir.existsSync()) {
    outDir.createSync(recursive: true);
  }

  File('mobile/lib/core/design/tokens.dart').writeAsStringSync(tokensBuffer.toString());
  print('Successfully generated mobile/lib/core/design/tokens.dart');
}
