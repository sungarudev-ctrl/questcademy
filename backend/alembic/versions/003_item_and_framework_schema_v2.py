"""003_item_and_framework_schema_v2

Revision ID: 003_schema_v2
Revises: 002_review_staging
Create Date: 2026-11-18 20:00:00.000000

Source of truth:
- docs/02-curriculum-framework-spec-v2.md §2, §3
- docs/05-assessment-item-spec-v2.md §2, §7, §8
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003_schema_v2"
down_revision: Union[str, None] = "002_review_staging"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update items table: drop locale_variants, add hint_variants and printable
    with op.batch_alter_table("items") as batch_op:
        batch_op.drop_column("locale_variants")
        batch_op.add_column(sa.Column("hint_variants", sa.JSON(), nullable=True))
        batch_op.add_column(
            sa.Column("printable", sa.Boolean(), nullable=False, server_default=sa.true())
        )

    # 2. Update curriculum_frameworks table: add framework_type, make exam_structure nullable
    with op.batch_alter_table("curriculum_frameworks") as batch_op:
        batch_op.add_column(
            sa.Column(
                "framework_type",
                sa.String(50),
                nullable=False,
                server_default="standards_aligned",
            )
        )
        batch_op.create_check_constraint(
            "check_curriculum_frameworks_type",
            "framework_type IN ('exam_board', 'standards_aligned')",
        )
        batch_op.alter_column("exam_structure", nullable=True)

    # 3. Update framework_grade_bands table: update ordinal check constraint to -1..12
    with op.batch_alter_table("framework_grade_bands") as batch_op:
        batch_op.drop_constraint("check_grade_bands_ordinal", type_="check")
        batch_op.create_check_constraint(
            "check_grade_bands_ordinal",
            "ordinal BETWEEN -1 AND 12",
        )


def downgrade() -> None:
    # 3. Revert framework_grade_bands ordinal
    with op.batch_alter_table("framework_grade_bands") as batch_op:
        batch_op.drop_constraint("check_grade_bands_ordinal", type_="check")
        batch_op.create_check_constraint(
            "check_grade_bands_ordinal",
            "ordinal BETWEEN 1 AND 13",
        )

    # 2. Revert curriculum_frameworks
    with op.batch_alter_table("curriculum_frameworks") as batch_op:
        batch_op.drop_constraint("check_curriculum_frameworks_type", type_="check")
        batch_op.drop_column("framework_type")
        batch_op.alter_column("exam_structure", nullable=False)

    # 1. Revert items
    with op.batch_alter_table("items") as batch_op:
        batch_op.drop_column("printable")
        batch_op.drop_column("hint_variants")
        batch_op.add_column(sa.Column("locale_variants", sa.JSON(), nullable=True))
