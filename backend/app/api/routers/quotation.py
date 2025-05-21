"""
API routes for quotation and risk analysis.
"""
from datetime import datetime
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Body, Query, Path, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_async_session
from app.models.user import User
from app.models.quotation import QuotationStatus

from app.db.repositories.quotation import (
    quotation_repository, quotation_item_repository,
    quotation_tag_repository, historical_price_repository,
    risk_factor_repository, quotation_history_repository
)

from app.services.quotation import (
    price_suggestion_service,
    risk_analysis_service,
    quotation_report_service
)

from app.api.schemas.quotation import (
    # Base schemas
    Quotation, QuotationCreate, QuotationUpdate, QuotationDetail, QuotationStatus,
    
    # Item schemas
    QuotationItem, QuotationItemCreate, QuotationItemUpdate,
    
    # Tag schemas
    QuotationTag, QuotationTagCreate,
    
    # Historical price schemas
    HistoricalPrice, HistoricalPriceCreate,
    
    # Risk factor schemas
    RiskFactor, RiskFactorCreate,
    
    # Quotation history schemas
    QuotationHistoryEntry,
    
    # Price suggestion schemas
    PriceSuggestionRequest, PriceSuggestionResponse,
    
    # Risk analysis schemas
    RiskAnalysisRequest, RiskAnalysisResponse,
    
    # Report schemas
    QuotationReportParams, QuotationSummaryReport, QuotationComparisonRequest
)


router = APIRouter(prefix="/quotations", tags=["quotations"])


# Quotation CRUD endpoints
@router.post("", response_model=QuotationDetail, status_code=status.HTTP_201_CREATED)
async def create_quotation(
    quotation_in: QuotationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Create a new quotation.
    """
    # Extract items and tags from input
    items_data = [item.dict() for item in quotation_in.items] if quotation_in.items else []
    tag_ids = quotation_in.tag_ids if quotation_in.tag_ids else []
    
    # Create quotation data
    quotation_data = quotation_in.dict(exclude={"items", "tag_ids"})
    quotation_data["created_by_id"] = current_user.id
    
    # Create quotation
    try:
        quotation = await quotation_repository.create_quotation(
            db_session=db,
            quotation_data=quotation_data,
            items_data=items_data,
            tag_ids=tag_ids,
            user_id=current_user.id
        )
        
        # Get complete quotation with all relationships
        return await quotation_repository.get_quotation_by_id(
            db_session=db,
            quotation_id=quotation.id,
            include_items=True,
            include_tags=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create quotation: {str(e)}"
        )


@router.get("", response_model=List[Quotation])
async def get_quotations(
    skip: int = 0,
    limit: int = 100,
    customer_id: Optional[int] = None,
    created_by_id: Optional[int] = None,
    assigned_to_id: Optional[int] = None,
    status: Optional[List[str]] = Query(None),
    tag_ids: Optional[List[int]] = Query(None),
    search: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get all quotations with filters.
    """
    quotations, _ = await quotation_repository.get_quotations(
        db_session=db,
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        created_by_id=created_by_id,
        assigned_to_id=assigned_to_id,
        status=status,
        tag_ids=tag_ids,
        search_term=search,
        from_date=from_date,
        to_date=to_date,
        include_items=False,
        include_tags=True
    )
    
    return quotations


@router.get("/{quotation_id}", response_model=QuotationDetail)
async def get_quotation(
    quotation_id: int = Path(..., title="Quotation ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get a quotation by ID.
    """
    quotation = await quotation_repository.get_quotation_by_id(
        db_session=db,
        quotation_id=quotation_id,
        include_items=True,
        include_tags=True
    )
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {quotation_id} not found"
        )
    
    return quotation


@router.put("/{quotation_id}", response_model=QuotationDetail)
async def update_quotation(
    quotation_in: QuotationUpdate,
    quotation_id: int = Path(..., title="Quotation ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Update a quotation.
    """
    # Check if quotation exists
    quotation = await quotation_repository.get_quotation_by_id(
        db_session=db,
        quotation_id=quotation_id
    )
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {quotation_id} not found"
        )
    
    # Prepare update data
    update_data = quotation_in.dict(exclude_unset=True, exclude={"items", "tag_ids"})
    
    # Update quotation
    try:
        items_data = None
        if hasattr(quotation_in, "items") and quotation_in.items is not None:
            items_data = [item.dict() for item in quotation_in.items]
        
        updated_quotation = await quotation_repository.update_quotation(
            db_session=db,
            quotation_id=quotation_id,
            update_data=update_data,
            items_data=items_data,
            tag_ids=quotation_in.tag_ids,
            user_id=current_user.id
        )
        
        # Get complete updated quotation
        return await quotation_repository.get_quotation_by_id(
            db_session=db,
            quotation_id=quotation_id,
            include_items=True,
            include_tags=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update quotation: {str(e)}"
        )


@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quotation(
    quotation_id: int = Path(..., title="Quotation ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Delete a quotation.
    """
    # Check if quotation exists
    quotation = await quotation_repository.get_quotation_by_id(
        db_session=db,
        quotation_id=quotation_id
    )
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {quotation_id} not found"
        )
    
    # Delete quotation
    deleted = await quotation_repository.delete_quotation(
        db_session=db,
        quotation_id=quotation_id
    )
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete quotation"
        )


@router.patch("/{quotation_id}/status", response_model=Quotation)
async def update_quotation_status(
    status_update: QuotationStatus,
    quotation_id: int = Path(..., title="Quotation ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Update the status of a quotation.
    """
    # Check if quotation exists
    quotation = await quotation_repository.get_quotation_by_id(
        db_session=db,
        quotation_id=quotation_id
    )
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {quotation_id} not found"
        )
    
    # Set submission date if status is changing to submitted
    update_data = {"status": status_update.status}
    if status_update.status == "submitted" and quotation.status != "submitted":
        update_data["submission_date"] = datetime.utcnow()
    
    # Update quotation
    try:
        updated_quotation = await quotation_repository.update_quotation(
            db_session=db,
            quotation_id=quotation_id,
            update_data=update_data,
            user_id=current_user.id
        )
        
        return updated_quotation
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update quotation status: {str(e)}"
        )


# Quotation item endpoints
@router.post("/{quotation_id}/items", response_model=QuotationItem)
async def add_quotation_item(
    item_in: QuotationItemCreate,
    quotation_id: int = Path(..., title="Quotation ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Add a new item to a quotation.
    """
    # Check if quotation exists
    quotation = await quotation_repository.get_quotation_by_id(
        db_session=db,
        quotation_id=quotation_id
    )
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {quotation_id} not found"
        )
    
    # Create item data
    item_data = item_in.dict()
    item_data["quotation_id"] = quotation_id
    
    # Create item
    try:
        item = QuotationItem(**item_data)
        db.add(item)
        await db.commit()
        await db.refresh(item)
        
        # Create history entry
        history_entry = QuotationHistoryEntry(
            quotation_id=quotation_id,
            user_id=current_user.id,
            action="item_added",
            details={"item_id": item.id, "item_name": item.name}
        )
        db.add(history_entry)
        await db.commit()
        
        return item
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to add quotation item: {str(e)}"
        )


@router.put("/{quotation_id}/items/{item_id}", response_model=QuotationItem)
async def update_quotation_item(
    item_in: QuotationItemUpdate,
    quotation_id: int = Path(..., title="Quotation ID"),
    item_id: int = Path(..., title="Item ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Update a quotation item.
    """
    # Check if quotation exists
    quotation = await quotation_repository.get_quotation_by_id(
        db_session=db,
        quotation_id=quotation_id
    )
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {quotation_id} not found"
        )
    
    # Check if item exists
    item = await quotation_item_repository.get_item_by_id(db_session=db, item_id=item_id)
    
    if not item or item.quotation_id != quotation_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID {item_id} not found in quotation {quotation_id}"
        )
    
    # Update item fields
    update_data = item_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(item, field):
            setattr(item, field, value)
    
    try:
        # Save changes
        db.add(item)
        await db.commit()
        await db.refresh(item)
        
        # Create history entry
        history_entry = QuotationHistoryEntry(
            quotation_id=quotation_id,
            user_id=current_user.id,
            action="item_updated",
            details={"item_id": item.id, "item_name": item.name}
        )
        db.add(history_entry)
        await db.commit()
        
        return item
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update quotation item: {str(e)}"
        )


@router.delete("/{quotation_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quotation_item(
    quotation_id: int = Path(..., title="Quotation ID"),
    item_id: int = Path(..., title="Item ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Delete a quotation item.
    """
    # Check if quotation exists
    quotation = await quotation_repository.get_quotation_by_id(
        db_session=db,
        quotation_id=quotation_id
    )
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {quotation_id} not found"
        )
    
    # Check if item exists
    item = await quotation_item_repository.get_item_by_id(db_session=db, item_id=item_id)
    
    if not item or item.quotation_id != quotation_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID {item_id} not found in quotation {quotation_id}"
        )
    
    try:
        # Store item info for history
        item_name = item.name
        
        # Delete item
        await db.delete(item)
        
        # Create history entry
        history_entry = QuotationHistoryEntry(
            quotation_id=quotation_id,
            user_id=current_user.id,
            action="item_deleted",
            details={"item_id": item_id, "item_name": item_name}
        )
        db.add(history_entry)
        
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete quotation item: {str(e)}"
        )


# Tag endpoints
@router.post("/tags", response_model=QuotationTag)
async def create_tag(
    tag_in: QuotationTagCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Create a new quotation tag.
    """
    # Check if tag already exists
    existing_tag = await quotation_tag_repository.get_tag_by_name(
        db_session=db,
        name=tag_in.name
    )
    
    if existing_tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tag with name '{tag_in.name}' already exists"
        )
    
    # Create tag
    tag = await quotation_tag_repository.create_tag(
        db_session=db,
        tag_data=tag_in.dict()
    )
    
    return tag


@router.get("/tags", response_model=List[QuotationTag])
async def get_tags(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get all quotation tags.
    """
    tags = await quotation_tag_repository.get_all_tags(db_session=db)
    return tags


# Historical price endpoints
@router.post("/historical-prices", response_model=HistoricalPrice)
async def create_historical_price(
    price_in: HistoricalPriceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Create a new historical price entry.
    """
    # Create price
    price = await historical_price_repository.create_historical_price(
        db_session=db,
        price_data=price_in.dict()
    )
    
    return price


@router.get("/historical-prices", response_model=List[HistoricalPrice])
async def get_historical_prices(
    item_name: Optional[str] = None,
    item_sku: Optional[str] = None,
    source: Optional[str] = None,
    customer_type: Optional[str] = None,
    region: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get historical prices with filters.
    """
    prices = await historical_price_repository.get_historical_prices(
        db_session=db,
        item_name=item_name,
        item_sku=item_sku,
        source=source,
        customer_type=customer_type,
        region=region,
        from_date=from_date,
        to_date=to_date,
        limit=limit
    )
    
    return prices


# Risk factor endpoints
@router.post("/risk-factors", response_model=RiskFactor)
async def create_risk_factor(
    factor_in: RiskFactorCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Create a new risk factor.
    """
    factor = await risk_factor_repository.create_risk_factor(
        db_session=db,
        factor_data=factor_in.dict()
    )
    
    return factor


@router.get("/risk-factors", response_model=List[RiskFactor])
async def get_risk_factors(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get all risk factors.
    """
    factors = await risk_factor_repository.get_all_risk_factors(db_session=db)
    return factors


# Quotation history endpoints
@router.get("/{quotation_id}/history", response_model=List[QuotationHistoryEntry])
async def get_quotation_history(
    quotation_id: int = Path(..., title="Quotation ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get history for a quotation.
    """
    # Check if quotation exists
    quotation = await quotation_repository.get_quotation_by_id(
        db_session=db,
        quotation_id=quotation_id
    )
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {quotation_id} not found"
        )
    
    # Get history entries
    history = await quotation_history_repository.get_history_by_quotation(
        db_session=db,
        quotation_id=quotation_id
    )
    
    return history


# Price suggestion endpoints
@router.post("/price-suggestion", response_model=PriceSuggestionResponse)
async def suggest_price(
    suggestion_request: PriceSuggestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Suggest a competitive price for an item based on historical data.
    """
    suggestion = await price_suggestion_service.suggest_price(
        db_session=db,
        item_name=suggestion_request.item_name,
        sku=suggestion_request.sku,
        unit=suggestion_request.unit,
        quantity=suggestion_request.quantity,
        unit_cost=suggestion_request.unit_cost,
        target_profit_margin=suggestion_request.target_profit_margin,
        customer_type=suggestion_request.customer_type,
        region=suggestion_request.region,
        competitive_level=suggestion_request.competitive_level
    )
    
    return suggestion


# Risk analysis endpoints
@router.post("/{quotation_id}/risk-analysis", response_model=RiskAnalysisResponse)
async def analyze_risk(
    quotation_id: int = Path(..., title="Quotation ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Analyze the risk of a quotation.
    """
    # Check if quotation exists
    quotation = await quotation_repository.get_quotation_by_id(
        db_session=db,
        quotation_id=quotation_id
    )
    
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {quotation_id} not found"
        )
    
    # Analyze risk
    risk_analysis = await risk_analysis_service.analyze_risk(
        db_session=db,
        quotation_id=quotation_id
    )
    
    return risk_analysis


# Report endpoints
@router.post("/reports/summary", response_model=QuotationSummaryReport)
async def generate_summary_report(
    report_params: QuotationReportParams = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Generate a summary report of quotations.
    """
    report = await quotation_report_service.generate_summary_report(
        db_session=db,
        start_date=report_params.start_date,
        end_date=report_params.end_date,
        status=report_params.status,
        customer_id=report_params.customer_id,
        assigned_to_id=report_params.assigned_to_id,
        tag_ids=report_params.tag_ids
    )
    
    return report


@router.post("/reports/comparison")
async def compare_quotations(
    comparison_request: QuotationComparisonRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Compare multiple quotations.
    """
    comparison = await quotation_report_service.compare_quotations(
        db_session=db,
        quotation_ids=comparison_request.quotation_ids
    )
    
    return comparison
