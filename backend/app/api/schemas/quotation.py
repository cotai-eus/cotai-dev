"""
Pydantic schemas for quotations and risk analysis.
"""
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union

from pydantic import BaseModel, Field, validator, root_validator

# Enum definitions that match the model's enums
class QuotationStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    AWARDED = "awarded"
    LOST = "lost"


class PriceSource(str, Enum):
    HISTORICAL = "historical"
    MARKET = "market"
    MANUAL = "manual"
    AI_SUGGESTED = "ai_suggested"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# Base schemas
class UserBase(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    email: str


# Tag schemas
class QuotationTagBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None


class QuotationTagCreate(QuotationTagBase):
    pass


class QuotationTag(QuotationTagBase):
    id: int

    class Config:
        orm_mode = True


# Item schemas
class QuotationItemBase(BaseModel):
    sku: Optional[str] = None
    name: str
    description: Optional[str] = None
    unit: Optional[str] = "unit"
    quantity: float = 1.0
    unit_cost: float = 0.0
    unit_price: float = 0.0
    tax_percentage: float = 0.0
    discount_percentage: float = 0.0
    price_source: PriceSource = PriceSource.MANUAL
    suggested_unit_price: Optional[float] = None
    market_average_price: Optional[float] = None


class QuotationItemCreate(QuotationItemBase):
    price_suggestion_data: Optional[Dict[str, Any]] = None


class QuotationItemUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[float] = None
    unit_cost: Optional[float] = None
    unit_price: Optional[float] = None
    tax_percentage: Optional[float] = None
    discount_percentage: Optional[float] = None
    price_source: Optional[PriceSource] = None
    suggested_unit_price: Optional[float] = None
    market_average_price: Optional[float] = None
    price_suggestion_data: Optional[Dict[str, Any]] = None


class QuotationItem(QuotationItemBase):
    id: int
    quotation_id: int
    total_cost: float
    total_price: float
    profit: float
    profit_margin_percentage: float
    competitiveness_score: Optional[float] = None
    is_competitive: Optional[bool] = None

    class Config:
        orm_mode = True


# Quotation schemas
class QuotationBase(BaseModel):
    reference_id: str
    title: str
    customer_id: int
    assigned_to_id: Optional[int] = None
    expiration_date: Optional[datetime] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    bid_document_id: Optional[int] = None
    currency: str = "BRL"
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    target_profit_margin: Optional[float] = None
    tag_ids: Optional[List[int]] = []


class QuotationCreate(QuotationBase):
    items: Optional[List[QuotationItemCreate]] = []


class QuotationUpdate(BaseModel):
    title: Optional[str] = None
    customer_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    expiration_date: Optional[datetime] = None
    status: Optional[QuotationStatus] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    bid_document_id: Optional[int] = None
    currency: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    target_profit_margin: Optional[float] = None
    tag_ids: Optional[List[int]] = None
    
    @validator('status')
    def status_cannot_be_draft_if_submitted(cls, v, values):
        if v == QuotationStatus.DRAFT and 'original_status' in values and values['original_status'] != QuotationStatus.DRAFT:
            raise ValueError("Cannot change back to draft once submitted")
        return v


class QuotationStatus(BaseModel):
    status: QuotationStatus


class Quotation(QuotationBase):
    id: int
    created_by_id: int
    status: QuotationStatus
    created_at: datetime
    updated_at: datetime
    submission_date: Optional[datetime] = None
    risk_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    risk_factors: Optional[Dict[str, Any]] = None
    actual_profit_margin: Optional[float] = None
    
    # Expanded relationships
    customer: UserBase
    created_by: UserBase
    assigned_to: Optional[UserBase] = None
    tags: List[QuotationTag] = []
    
    # Calculated values
    total_cost: float
    total_price: float
    profit: float
    profit_margin_percentage: float

    class Config:
        orm_mode = True


class QuotationDetail(Quotation):
    """Full quotation detail including all items"""
    items: List[QuotationItem] = []


# Historical price schemas
class HistoricalPriceBase(BaseModel):
    item_sku: Optional[str] = None
    item_name: str
    unit_price: float
    source: str
    unit: Optional[str] = None
    region: Optional[str] = None
    customer_type: Optional[str] = None
    bid_type: Optional[str] = None
    bid_result: Optional[str] = None
    quotation_item_id: Optional[int] = None


class HistoricalPriceCreate(HistoricalPriceBase):
    date_recorded: Optional[datetime] = None


class HistoricalPrice(HistoricalPriceBase):
    id: int
    date_recorded: datetime

    class Config:
        orm_mode = True


# Risk factor schemas
class RiskFactorBase(BaseModel):
    name: str
    description: Optional[str] = None
    weight: float = 1.0
    parameters: Optional[Dict[str, Any]] = None


class RiskFactorCreate(RiskFactorBase):
    pass


class RiskFactor(RiskFactorBase):
    id: int

    class Config:
        orm_mode = True


# Quotation history schemas
class QuotationHistoryEntryBase(BaseModel):
    quotation_id: int
    action: str
    details: Optional[Dict[str, Any]] = None


class QuotationHistoryEntryCreate(QuotationHistoryEntryBase):
    pass


class QuotationHistoryEntry(QuotationHistoryEntryBase):
    id: int
    user_id: int
    timestamp: datetime
    user: UserBase

    class Config:
        orm_mode = True


# Price suggestion schemas
class PriceSuggestionRequest(BaseModel):
    item_name: str
    sku: Optional[str] = None
    unit: Optional[str] = None
    quantity: float = 1.0
    unit_cost: float
    target_profit_margin: Optional[float] = None
    customer_type: Optional[str] = None
    region: Optional[str] = None
    competitive_level: Optional[str] = "medium"  # low, medium, high


class PriceSuggestionResponse(BaseModel):
    suggested_price: float
    price_source: PriceSource
    competitiveness_score: float
    historical_min: Optional[float] = None
    historical_max: Optional[float] = None
    historical_avg: Optional[float] = None
    market_price: Optional[float] = None
    profit_margin: float
    explanation: str


# Risk analysis schemas
class RiskAnalysisRequest(BaseModel):
    quotation_id: int


class RiskFactorResult(BaseModel):
    factor_id: int
    name: str
    score: float  # 0-100
    level: RiskLevel
    description: str
    details: Optional[Dict[str, Any]] = None


class RiskAnalysisResponse(BaseModel):
    quotation_id: int
    overall_risk_score: float  # 0-100
    risk_level: RiskLevel
    factors: List[RiskFactorResult]
    recommendations: List[str]


# Report schemas
class QuotationReportParams(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[List[QuotationStatus]] = None
    customer_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None
    include_items: bool = False
    format: str = "json"  # json, csv, pdf


class QuotationSummaryReport(BaseModel):
    total_quotations: int
    total_value: float
    average_value: float
    won_quotations: int
    won_value: float
    win_rate: float
    average_profit_margin: float
    status_distribution: Dict[str, int]
    risk_level_distribution: Dict[str, int]
    quotations: List[Quotation] = []


class QuotationComparisonRequest(BaseModel):
    quotation_ids: List[int]
