"""
Models for quotations and risk analysis.
"""
from datetime import datetime
from enum import Enum
import json
from typing import Dict, List, Optional, Any

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, 
    String, Text, Table, JSON, Enum as SQLAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property

from app.models.base import Base


class QuotationStatus(str, Enum):
    """Status of a quotation"""
    DRAFT = "draft"
    SUBMITTED = "submitted"  
    APPROVED = "approved"
    REJECTED = "rejected"
    AWARDED = "awarded"
    LOST = "lost"


class PriceSource(str, Enum):
    """Source of a price suggestion"""
    HISTORICAL = "historical"
    MARKET = "market"
    MANUAL = "manual"
    AI_SUGGESTED = "ai_suggested"


class RiskLevel(str, Enum):
    """Risk level for quotations"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# Association table for quotation tags
quotation_tag = Table(
    "quotation_tag", 
    Base.metadata,
    Column("quotation_id", Integer, ForeignKey("quotations.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("quotation_tags.id"), primary_key=True),
)


class QuotationTag(Base):
    """Tags for categorizing quotations"""
    __tablename__ = "quotation_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(String(200), nullable=True)
    color = Column(String(7), nullable=True)  # Hex color code
    
    # Relationships
    quotations = relationship(
        "Quotation", 
        secondary=quotation_tag,
        back_populates="tags"
    )
    
    def __repr__(self):
        return f"<QuotationTag {self.name}>"


class Quotation(Base):
    """Main quotation entity model"""
    __tablename__ = "quotations"
    
    id = Column(Integer, primary_key=True, index=True)
    reference_id = Column(String(50), nullable=False, unique=True, index=True)
    title = Column(String(200), nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submission_date = Column(DateTime, nullable=True)
    expiration_date = Column(DateTime, nullable=True)
    
    # Status and details
    status = Column(SQLAEnum(QuotationStatus), default=QuotationStatus.DRAFT, nullable=False)
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Document references
    bid_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    
    # Financial metadata
    currency = Column(String(3), default="BRL", nullable=False)
    payment_terms = Column(String(100), nullable=True)
    delivery_terms = Column(String(100), nullable=True)
    
    # Risk analysis
    risk_score = Column(Float, nullable=True)  
    risk_level = Column(SQLAEnum(RiskLevel), nullable=True)
    risk_factors = Column(JSON, nullable=True)  # JSON field to store risk factor details
    
    # Margins
    target_profit_margin = Column(Float, nullable=True)
    actual_profit_margin = Column(Float, nullable=True)
    
    # Relationships
    customer = relationship("User", foreign_keys=[customer_id], backref="customer_quotations")
    created_by = relationship("User", foreign_keys=[created_by_id], backref="created_quotations")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], backref="assigned_quotations")
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")
    bid_document = relationship("Document", foreign_keys=[bid_document_id])
    tags = relationship(
        "QuotationTag",
        secondary=quotation_tag,
        back_populates="quotations"
    )
    
    @hybrid_property
    def total_cost(self) -> float:
        """Calculate total cost of all items"""
        return sum(item.total_cost for item in self.items)
    
    @hybrid_property
    def total_price(self) -> float:
        """Calculate total price of all items"""
        return sum(item.total_price for item in self.items)
    
    @hybrid_property
    def profit(self) -> float:
        """Calculate total profit"""
        return self.total_price - self.total_cost
    
    @hybrid_property
    def profit_margin_percentage(self) -> float:
        """Calculate profit margin as a percentage"""
        if self.total_price > 0:
            return (self.profit / self.total_price) * 100
        return 0.0
    
    def __repr__(self):
        return f"<Quotation {self.reference_id} ({self.status.value})>"


class QuotationItem(Base):
    """Items within a quotation"""
    __tablename__ = "quotation_items"
    
    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    
    # Item details
    sku = Column(String(50), nullable=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    unit = Column(String(20), nullable=True, default="unit")  # unit, kg, hour, etc.
    quantity = Column(Float, nullable=False, default=1.0)
    
    # Financial details
    unit_cost = Column(Float, nullable=False, default=0.0)  # base cost per unit
    unit_price = Column(Float, nullable=False, default=0.0)  # selling price per unit
    tax_percentage = Column(Float, nullable=False, default=0.0)
    discount_percentage = Column(Float, nullable=False, default=0.0)
    
    # Price source and suggestion data
    price_source = Column(SQLAEnum(PriceSource), default=PriceSource.MANUAL, nullable=False)
    suggested_unit_price = Column(Float, nullable=True)
    price_suggestion_data = Column(JSON, nullable=True)  # Store details about price suggestion
    
    # Risk and competitiveness
    market_average_price = Column(Float, nullable=True)
    competitiveness_score = Column(Float, nullable=True)  # 0-100 score
    
    # Relationships
    quotation = relationship("Quotation", back_populates="items")
    
    @hybrid_property
    def total_cost(self) -> float:
        """Calculate total cost for this item"""
        return self.unit_cost * self.quantity
    
    @hybrid_property
    def total_price(self) -> float:
        """Calculate total price including tax and discount"""
        base_price = self.unit_price * self.quantity
        discount_amount = base_price * (self.discount_percentage / 100)
        price_after_discount = base_price - discount_amount
        tax_amount = price_after_discount * (self.tax_percentage / 100)
        return price_after_discount + tax_amount
    
    @hybrid_property
    def profit(self) -> float:
        """Calculate profit for this item"""
        return self.total_price - self.total_cost
    
    @hybrid_property
    def profit_margin_percentage(self) -> float:
        """Calculate profit margin as a percentage"""
        if self.total_price > 0:
            return (self.profit / self.total_price) * 100
        return 0.0
    
    @hybrid_property
    def is_competitive(self) -> bool:
        """Determine if the price is competitive compared to market average"""
        if self.market_average_price and self.unit_price:
            return self.unit_price <= self.market_average_price * 1.05  # Within 5% of market avg
        return None
    
    def __repr__(self):
        return f"<QuotationItem {self.name} (Qty: {self.quantity})>"


class HistoricalPrice(Base):
    """Historical prices for items to aid in price suggestions"""
    __tablename__ = "historical_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    item_sku = Column(String(50), nullable=True, index=True)
    item_name = Column(String(200), nullable=False, index=True)
    unit_price = Column(Float, nullable=False)
    date_recorded = Column(DateTime, default=datetime.utcnow, nullable=False)
    source = Column(String(50), nullable=False)  # e.g. "internal", "market", "competitor"
    
    # Additional metadata
    unit = Column(String(20), nullable=True)
    region = Column(String(50), nullable=True)
    customer_type = Column(String(50), nullable=True)  # e.g. "government", "private", "public"
    bid_type = Column(String(50), nullable=True)
    bid_result = Column(String(20), nullable=True)  # "won", "lost", "pending"
    
    # Optional link to a specific quotation item
    quotation_item_id = Column(Integer, ForeignKey("quotation_items.id"), nullable=True)
    
    def __repr__(self):
        return f"<HistoricalPrice {self.item_name} ${self.unit_price}>"


class RiskFactor(Base):
    """Predefined risk factors to evaluate quotations"""
    __tablename__ = "risk_factors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    weight = Column(Float, nullable=False, default=1.0)  # Weight in risk calculation
    
    # Risk calculation parameters stored as JSON
    parameters = Column(JSON, nullable=True)
    
    def __repr__(self):
        return f"<RiskFactor {self.name}>"


class QuotationHistoryEntry(Base):
    """Track changes to quotations over time"""
    __tablename__ = "quotation_history"
    
    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    action = Column(String(50), nullable=False)  # e.g. "created", "updated", "status_change"
    details = Column(JSON, nullable=True)  # JSON with specific changes
    
    # Relationships
    quotation = relationship("Quotation")
    user = relationship("User")
    
    def __repr__(self):
        return f"<QuotationHistoryEntry {self.action} on {self.quotation_id} by {self.user_id}>"
