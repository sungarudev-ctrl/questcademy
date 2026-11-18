/// Shared content and item models for Questcademy Mobile.
/// Strictly conforming to docs/05-assessment-item-spec.md and shared fixtures.

class ContentBlock {
  final String blockId;
  final String type;
  final Map<String, dynamic> payload;

  const ContentBlock({
    required this.blockId,
    required this.type,
    required this.payload,
  });

  factory ContentBlock.fromJson(Map<String, dynamic> json) {
    return ContentBlock(
      blockId: json['block_id'] as String? ?? '',
      type: json['type'] as String? ?? 'text',
      payload: (json['payload'] as Map<String, dynamic>?) ?? {},
    );
  }

  Map<String, dynamic> toJson() => {
    'block_id': blockId,
    'type': type,
    'payload': payload,
  };
}

class ItemOption {
  final String id;
  final String content;
  final bool correct;
  final String? misconceptionId;
  final String? learnerFacingName;
  final String? explanation;

  const ItemOption({
    required this.id,
    required this.content,
    required this.correct,
    this.misconceptionId,
    this.learnerFacingName,
    this.explanation,
  });

  factory ItemOption.fromJson(Map<String, dynamic> json) {
    return ItemOption(
      id: (json['id'] ?? json['option_id'] ?? '') as String,
      content: json['content'] as String? ?? '',
      correct: (json['correct'] ?? json['is_correct'] ?? false) as bool,
      misconceptionId: json['misconception_id'] as String?,
      learnerFacingName: json['learner_facing_name'] as String?,
      explanation: json['explanation'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'content': content,
    'correct': correct,
    'misconception_id': misconceptionId,
    'learner_facing_name': learnerFacingName,
    'explanation': explanation,
  };
}

class ItemHint {
  final int level;
  final String content;

  const ItemHint({
    required this.level,
    required this.content,
  });

  factory ItemHint.fromJson(Map<String, dynamic> json) {
    return ItemHint(
      level: (json['level'] ?? json['tier'] ?? 1) as int,
      content: (json['content'] ?? json['text'] ?? '') as String,
    );
  }

  Map<String, dynamic> toJson() => {
    'level': level,
    'content': content,
  };
}

class AssessmentItem {
  final String itemId;
  final String nodeId;
  final String type;
  final int difficultyTier;
  final double difficultyElo;
  final String stem;
  final List<ItemOption> options;
  final List<ItemHint> hints;
  final Map<String, dynamic> payload;

  const AssessmentItem({
    required this.itemId,
    required this.nodeId,
    required this.type,
    required this.difficultyTier,
    required this.difficultyElo,
    required this.stem,
    this.options = const [],
    this.hints = const [],
    this.payload = const {},
  });

  factory AssessmentItem.fromJson(Map<String, dynamic> json) {
    final payloadMap = (json['payload'] as Map<String, dynamic>?) ?? {};
    final rawOptions = (payloadMap['options'] as List<dynamic>?) ??
        (json['options'] as List<dynamic>?) ??
        [];
    final rawHints = (json['hints'] as List<dynamic>?) ?? [];

    final stemRaw = json['stem'];
    final stemStr = stemRaw is String
        ? stemRaw
        : stemRaw is Map
            ? (stemRaw['text'] ?? stemRaw['content'] ?? '') as String
            : '';

    return AssessmentItem(
      itemId: json['item_id'] as String? ?? '',
      nodeId: json['node_id'] as String? ?? '',
      type: json['type'] as String? ?? 'mcq_single',
      difficultyTier: (json['difficulty_tier'] as num?)?.toInt() ?? 1,
      difficultyElo: (json['difficulty_elo'] as num?)?.toDouble() ?? 1200.0,
      stem: stemStr,
      options: rawOptions
          .map((o) => ItemOption.fromJson(o as Map<String, dynamic>))
          .toList(),
      hints: rawHints
          .map((h) => ItemHint.fromJson(h as Map<String, dynamic>))
          .toList(),
      payload: payloadMap,
    );
  }

  Map<String, dynamic> toJson() => {
    'item_id': itemId,
    'node_id': nodeId,
    'type': type,
    'difficulty_tier': difficultyTier,
    'difficulty_elo': difficultyElo,
    'stem': stem,
    'options': options.map((o) => o.toJson()).toList(),
    'hints': hints.map((h) => h.toJson()).toList(),
    'payload': payload,
  };
}
