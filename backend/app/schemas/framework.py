"""Pydantic schemas for Country and Curriculum Framework layer."""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CountryBase(BaseModel):
    country_code: str = Field(..., min_length=2, max_length=2, description="ISO-3166 alpha-2")
    name: str
    default_locale: str
    default_currency: str
    status: str = Field("active", description="planned | active | paused | sunset")


class CountryResponse(CountryBase):
    model_config = ConfigDict(from_attributes=True)


class GradeBandSchema(BaseModel):
    band_id: str
    ordinal: int
    typical_age: Optional[int] = None
    label_local: str


class CurriculumFrameworkCreate(BaseModel):
    framework_id: str
    country_code: str
    board: str
    subject: str
    version: str
    locale: str
    currency: str
    effective_from: date
    effective_until: Optional[date] = None
    grading_scale: List[Dict[str, Any]]
    exam_structure: Dict[str, Any]
    grade_bands: Optional[List[GradeBandSchema]] = None


class CurriculumFrameworkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    framework_id: str
    country_code: str
    board: str
    subject: str
    version: str
    locale: str
    currency: str
    effective_from: date
    effective_until: Optional[date] = None
    status: str
    grading_scale: List[Dict[str, Any]]
    exam_structure: Dict[str, Any]
    created_at: Optional[datetime] = None


class SyllabusObjectiveSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    objective_id: str
    framework_id: str
    code: str
    text: str
    grade_band: str
    term: Optional[int] = None
    exam_weight: Optional[float] = None
    coverage_status: str = "unmapped"


class ObjectiveMappingRequest(BaseModel):
    objective_id: str
    node_id: str
    actor: str


class CoverageReportResponse(BaseModel):
    framework_id: str
    total_objectives: int
    covered_objectives: int
    unmapped_objectives: int
    coverage_pct: float
    is_activatable: bool


class LocalizationBriefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    framework_id: str
    currency: str
    common_names: List[str]
    cities: List[str]
    foods: List[str]
    units_preferred: Dict[str, str]
    avoid: List[str]
    scenario_bank: List[Dict[str, Any]]
    updated_at: Optional[datetime] = None


class ChangeFrameworkRequest(BaseModel):
    to_framework_id: str
    reason: str = Field(..., description="country_change | board_change | superseded")
    actor: str


class PinMigrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    learner_id: str
    from_framework: Optional[str] = None
    to_framework: Optional[str] = None
    reason: str
    mastery_preserved: bool
    migrated_at: Optional[datetime] = None


class FrameworkCohortStatItem(BaseModel):
    framework_id: str
    snapshot_date: date
    active_learners: int
    mean_mastery_rate: float
    mean_retention_30d: float
    mean_success_band: float
    item_error_rate: float


class FrameworkCompareResponse(BaseModel):
    cohorts: List[FrameworkCohortStatItem]
