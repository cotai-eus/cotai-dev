"""
Repository for quotation operations in the database.
"""
from datetime import datetime
from typing import Dict, List, Optional, Any, Union, Tuple
from sqlalchemy import select, update, delete, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.db.repositories import BaseRepository
from app.models.quotation import (
    Quotation, QuotationItem, QuotationTag, 
    HistoricalPrice, RiskFactor, QuotationHistoryEntry
)


class QuotationRepository(BaseRepository[Quotation]):
    """
    Repository for quotation operations.
    """
    
    async def create_quotation(
        self, 
        db_session: AsyncSession, 
        quotation_data: Dict[str, Any],
        items_data: List[Dict[str, Any]] = None,
        tag_ids: List[int] = None,
        user_id: int = None
    ) -> Quotation:
        """
        Creates a new quotation with items and tags.
        """
        # Create quotation
        quotation = Quotation(**quotation_data)
        db_session.add(quotation)
        await db_session.flush()  # Flush to get the ID
        
        # Add items if provided
        if items_data:
            for item_data in items_data:
                item = QuotationItem(**item_data, quotation_id=quotation.id)
                db_session.add(item)
        
        # Add tags if provided
        if tag_ids:
            tag_query = select(QuotationTag).where(QuotationTag.id.in_(tag_ids))
            result = await db_session.execute(tag_query)
            tags = result.scalars().all()
            quotation.tags = tags
        
        # Create history entry for creation
        if user_id:
            history_entry = QuotationHistoryEntry(
                quotation_id=quotation.id,
                user_id=user_id,
                action="created",
                details={"status": quotation.status}
            )
            db_session.add(history_entry)
        
        await db_session.commit()
        await db_session.refresh(quotation)
        return quotation
    
    async def get_quotation_by_id(
        self, 
        db_session: AsyncSession, 
        quotation_id: int, 
        include_items: bool = False,
        include_tags: bool = False,
        include_history: bool = False
    ) -> Optional[Quotation]:
        """
        Gets a quotation by ID with optional relationships.
        """
        query = select(Quotation).where(Quotation.id == quotation_id)
        
        # Include relationships as requested
        if include_items:
            query = query.options(selectinload(Quotation.items))
        
        if include_tags:
            query = query.options(selectinload(Quotation.tags))
            
        if include_history:
            query = query.options(selectinload(Quotation.history_entries))
        
        result = await db_session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_quotation_by_reference(
        self, 
        db_session: AsyncSession, 
        reference_id: str
    ) -> Optional[Quotation]:
        """
        Gets a quotation by its reference ID.
        """
        query = select(Quotation).where(Quotation.reference_id == reference_id)
        result = await db_session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_quotations(
        self, 
        db_session: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[int] = None,
        created_by_id: Optional[int] = None,
        assigned_to_id: Optional[int] = None,
        status: Optional[List[str]] = None,
        tag_ids: Optional[List[int]] = None,
        search_term: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        include_items: bool = False,
        include_tags: bool = False,
    ) -> Tuple[List[Quotation], int]:
        """
        Gets quotations with pagination and filtering.
        """
        # Base query
        query = select(Quotation)
        
        # Apply filters
        filters = []
        if customer_id:
            filters.append(Quotation.customer_id == customer_id)
        
        if created_by_id:
            filters.append(Quotation.created_by_id == created_by_id)
            
        if assigned_to_id:
            filters.append(Quotation.assigned_to_id == assigned_to_id)
            
        if status:
            filters.append(Quotation.status.in_(status))
            
        if from_date:
            filters.append(Quotation.created_at >= from_date)
            
        if to_date:
            filters.append(Quotation.created_at <= to_date)
            
        if search_term:
            search_filter = or_(
                Quotation.reference_id.ilike(f"%{search_term}%"),
                Quotation.title.ilike(f"%{search_term}%"),
                Quotation.description.ilike(f"%{search_term}%")
            )
            filters.append(search_filter)
            
        # Apply all filters
        if filters:
            query = query.where(and_(*filters))
            
        # Handle tag filtering
        if tag_ids:
            query = query.join(Quotation.tags).filter(QuotationTag.id.in_(tag_ids)).distinct()
        
        # Include relationships as requested
        if include_items:
            query = query.options(selectinload(Quotation.items))
        
        if include_tags:
            query = query.options(selectinload(Quotation.tags))
            
        # Count total before pagination
        count_query = select(func.count()).select_from(query.subquery())
        total_count = await db_session.execute(count_query)
        total = total_count.scalar_one()
        
        # Apply pagination and order
        query = query.order_by(Quotation.created_at.desc()).offset(skip).limit(limit)
        
        # Execute query
        result = await db_session.execute(query)
        quotations = result.scalars().all()
        
        return list(quotations), total
    
    async def update_quotation(
        self,
        db_session: AsyncSession,
        quotation_id: int,
        update_data: Dict[str, Any],
        items_data: Optional[List[Dict[str, Any]]] = None,
        tag_ids: Optional[List[int]] = None,
        user_id: Optional[int] = None,
        quotation_obj: Optional[Quotation] = None
    ) -> Optional[Quotation]:
        """
        Updates a quotation.
        """
        # Get the quotation if not provided
        if quotation_obj is None:
            quotation = await self.get_quotation_by_id(db_session, quotation_id, include_items=True, include_tags=True if tag_ids is not None else False)
        else:
            quotation = quotation_obj
            # Ensure items are loaded if items_data is provided and items are not loaded
            if items_data is not None and 'items' not in quotation.__dict__: # A simple check, might need more robust lazy loading check
                await db_session.refresh(quotation, attribute_names=['items'])
            # Ensure tags are loaded if tag_ids is provided and tags are not loaded
            if tag_ids is not None and 'tags' not in quotation.__dict__: # A simple check
                await db_session.refresh(quotation, attribute_names=['tags'])


        if not quotation:
            return None
        
        # Store old status for history tracking
        old_status = quotation.status
        
        # Update quotation fields
        for field, value in update_data.items():
            if hasattr(quotation, field):
                setattr(quotation, field, value)
        
        # Update items if provided
        if items_data is not None:
            # Keep track of processed items to detect removed ones
            processed_item_ids = set()
            
            for item_data in items_data:
                item_id = item_data.pop("id", None)
                
                if item_id:  # Update existing item
                    # Find existing item
                    existing_item = next(
                        (item for item in quotation.items if item.id == item_id), 
                        None
                    )
                    
                    if existing_item:
                        processed_item_ids.add(item_id)
                        # Update fields
                        for field, value in item_data.items():
                            if hasattr(existing_item, field):
                                setattr(existing_item, field, value)
                else:  # New item
                    item = QuotationItem(**item_data, quotation_id=quotation.id)
                    db_session.add(item)
                    await db_session.flush()
                    processed_item_ids.add(item.id)
            
            # Remove items that were not in the update
            for item in quotation.items:
                if item.id not in processed_item_ids:
                    await db_session.delete(item)
        
        # Update tags if provided
        if tag_ids is not None:
            tag_query = select(QuotationTag).where(QuotationTag.id.in_(tag_ids))
            result = await db_session.execute(tag_query)
            tags = result.scalars().all()
            quotation.tags = tags
        
        # Create history entry for updates
        if user_id:
            details = {"updated_fields": list(update_data.keys())}
            
            # Special handling for status changes
            if "status" in update_data and old_status != update_data["status"]:
                details["status_change"] = {
                    "from": old_status,
                    "to": update_data["status"]
                }
                action = "status_changed"
            else:
                action = "updated"
            
            history_entry = QuotationHistoryEntry(
                quotation_id=quotation.id,
                user_id=user_id,
                action=action,
                details=details
            )
            db_session.add(history_entry)

        db_session.add(quotation) # Add the quotation object to the session before commit
        await db_session.commit()
        await db_session.refresh(quotation)
        return quotation
    
    async def update_risk_analysis(
        self,
        db_session: AsyncSession,
        quotation_id: int,
        risk_score: float,
        risk_level: str,
        risk_factors: Dict[str, Any],
        user_id: Optional[int] = None
    ) -> Optional[Quotation]:
        """
        Updates the risk analysis for a quotation.
        """
        # Get the quotation
        quotation = await self.get_quotation_by_id(db_session, quotation_id)
        if not quotation:
            return None
        
        # Update risk analysis fields
        quotation.risk_score = risk_score
        quotation.risk_level = risk_level
        quotation.risk_factors = risk_factors
        
        # Create history entry
        if user_id:
            history_entry = QuotationHistoryEntry(
                quotation_id=quotation.id,
                user_id=user_id,
                action="risk_analysis_updated",
                details={
                    "risk_score": risk_score,
                    "risk_level": risk_level
                }
            )
            db_session.add(history_entry)
        
        await db_session.commit()
        await db_session.refresh(quotation)
        return quotation
    
    async def delete_quotation(
        self,
        db_session: AsyncSession,
        quotation_id: int
    ) -> bool:
        """
        Deletes a quotation.
        """
        quotation = await self.get_quotation_by_id(db_session, quotation_id)
        if not quotation:
            return False
        
        # Delete the quotation (cascades to items and history entries)
        await db_session.delete(quotation)
        await db_session.commit()
        return True


class QuotationItemRepository(BaseRepository[QuotationItem]):
    """
    Repository for quotation item operations.
    """
    
    async def get_item_by_id(
        self,
        db_session: AsyncSession,
        item_id: int
    ) -> Optional[QuotationItem]:
        """
        Gets a quotation item by ID.
        """
        query = select(QuotationItem).where(QuotationItem.id == item_id)
        result = await db_session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_items_by_quotation(
        self,
        db_session: AsyncSession,
        quotation_id: int
    ) -> List[QuotationItem]:
        """
        Gets all items for a quotation.
        """
        query = select(QuotationItem).where(
            QuotationItem.quotation_id == quotation_id
        )
        result = await db_session.execute(query)
        return list(result.scalars().all())
    

class QuotationTagRepository(BaseRepository[QuotationTag]):
    """
    Repository for quotation tag operations.
    """
    
    async def create_tag(
        self,
        db_session: AsyncSession,
        tag_data: Dict[str, Any]
    ) -> QuotationTag:
        """
        Creates a new tag.
        """
        tag = QuotationTag(**tag_data)
        db_session.add(tag)
        await db_session.commit()
        await db_session.refresh(tag)
        return tag
    
    async def get_tag_by_id(
        self,
        db_session: AsyncSession,
        tag_id: int
    ) -> Optional[QuotationTag]:
        """
        Gets a tag by ID.
        """
        query = select(QuotationTag).where(QuotationTag.id == tag_id)
        result = await db_session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_tag_by_name(
        self,
        db_session: AsyncSession,
        name: str
    ) -> Optional[QuotationTag]:
        """
        Gets a tag by name.
        """
        query = select(QuotationTag).where(QuotationTag.name == name)
        result = await db_session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_all_tags(
        self,
        db_session: AsyncSession
    ) -> List[QuotationTag]:
        """
        Gets all tags.
        """
        query = select(QuotationTag).order_by(QuotationTag.name)
        result = await db_session.execute(query)
        return list(result.scalars().all())
    

class HistoricalPriceRepository(BaseRepository[HistoricalPrice]):
    """
    Repository for historical price operations.
    """
    
    async def create_historical_price(
        self,
        db_session: AsyncSession,
        price_data: Dict[str, Any]
    ) -> HistoricalPrice:
        """
        Creates a new historical price entry.
        """
        price = HistoricalPrice(**price_data)
        db_session.add(price)
        await db_session.commit()
        await db_session.refresh(price)
        return price
    
    async def get_historical_prices(
        self,
        db_session: AsyncSession,
        item_name: Optional[str] = None,
        item_sku: Optional[str] = None,
        source: Optional[str] = None,
        customer_type: Optional[str] = None,
        region: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[HistoricalPrice]:
        """
        Gets historical prices with filtering.
        """
        query = select(HistoricalPrice)
        
        # Apply filters
        filters = []
        if item_name:
            filters.append(HistoricalPrice.item_name.ilike(f"%{item_name}%"))
            
        if item_sku:
            filters.append(HistoricalPrice.item_sku == item_sku)
            
        if source:
            filters.append(HistoricalPrice.source == source)
            
        if customer_type:
            filters.append(HistoricalPrice.customer_type == customer_type)
            
        if region:
            filters.append(HistoricalPrice.region == region)
            
        if from_date:
            filters.append(HistoricalPrice.date_recorded >= from_date)
            
        if to_date:
            filters.append(HistoricalPrice.date_recorded <= to_date)
        
        # Apply all filters
        if filters:
            query = query.where(and_(*filters))
        
        # Apply ordering and limit
        query = query.order_by(HistoricalPrice.date_recorded.desc()).limit(limit)
        
        # Execute query
        result = await db_session.execute(query)
        return list(result.scalars().all())
    
    
class RiskFactorRepository(BaseRepository[RiskFactor]):
    """
    Repository for risk factor operations.
    """
    
    async def create_risk_factor(
        self,
        db_session: AsyncSession,
        factor_data: Dict[str, Any]
    ) -> RiskFactor:
        """
        Creates a new risk factor.
        """
        factor = RiskFactor(**factor_data)
        db_session.add(factor)
        await db_session.commit()
        await db_session.refresh(factor)
        return factor
    
    async def get_risk_factor_by_id(
        self,
        db_session: AsyncSession,
        factor_id: int
    ) -> Optional[RiskFactor]:
        """
        Gets a risk factor by ID.
        """
        query = select(RiskFactor).where(RiskFactor.id == factor_id)
        result = await db_session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_all_risk_factors(
        self,
        db_session: AsyncSession
    ) -> List[RiskFactor]:
        """
        Gets all risk factors.
        """
        query = select(RiskFactor).order_by(RiskFactor.name)
        result = await db_session.execute(query)
        return list(result.scalars().all())


class QuotationHistoryRepository(BaseRepository[QuotationHistoryEntry]):
    """
    Repository for quotation history operations.
    """
    
    async def get_history_by_quotation(
        self,
        db_session: AsyncSession,
        quotation_id: int
    ) -> List[QuotationHistoryEntry]:
        """
        Gets all history entries for a quotation.
        """
        query = select(QuotationHistoryEntry).where(
            QuotationHistoryEntry.quotation_id == quotation_id
        ).order_by(QuotationHistoryEntry.timestamp.desc())
        
        result = await db_session.execute(query)
        return list(result.scalars().all())


# Initialize repository instances
quotation_repository = QuotationRepository(model=Quotation)
quotation_item_repository = QuotationItemRepository(model=QuotationItem)
quotation_tag_repository = QuotationTagRepository(model=QuotationTag)
historical_price_repository = HistoricalPriceRepository(model=HistoricalPrice)
risk_factor_repository = RiskFactorRepository(model=RiskFactor)
quotation_history_repository = QuotationHistoryRepository(model=QuotationHistoryEntry)
