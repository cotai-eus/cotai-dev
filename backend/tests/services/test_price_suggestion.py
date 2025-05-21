"""
Tests for quotation price suggestion service.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.quotation import PriceSource
from app.services.quotation import PriceSuggestionService


class TestPriceSuggestionService:
    """Test suite for PriceSuggestionService"""

    @pytest.mark.asyncio
    async def test_suggest_price_with_no_data(self):
        """Test price suggestion with no historical data"""
        # Mock dependencies
        mock_db_session = AsyncMock()
        mock_historical_repository = AsyncMock()
        mock_historical_repository.get_historical_prices.return_value = []
        
        # Create service instance
        service = PriceSuggestionService()
        
        # Mock repository in service
        with patch('app.services.quotation.historical_price_repository', mock_historical_repository):
            # Call method
            result = await service.suggest_price(
                db_session=mock_db_session,
                item_name="Test Item",
                unit_cost=100.0,
                target_profit_margin=30.0
            )
        
        # Verify results
        assert result["suggested_price"] == 130.0  # cost + 30% margin
        assert result["price_source"] == PriceSource.MANUAL
        assert result["profit_margin"] == 30.0
        assert "No historical data available" in result["explanation"]
        
    @pytest.mark.asyncio
    async def test_suggest_price_with_historical_data(self):
        """Test price suggestion with historical data"""
        # Mock dependencies
        mock_db_session = AsyncMock()
        
        # Create mock historical prices
        mock_historical_prices = [
            MagicMock(unit_price=120.0),
            MagicMock(unit_price=140.0),
            MagicMock(unit_price=150.0),
            MagicMock(unit_price=130.0),
            MagicMock(unit_price=135.0)
        ]
        
        mock_historical_repository = AsyncMock()
        mock_historical_repository.get_historical_prices.return_value = mock_historical_prices
        
        # Create service instance
        service = PriceSuggestionService()
        
        # Mock repository in service
        with patch('app.services.quotation.historical_price_repository', mock_historical_repository):
            # Call method with default competitive level (medium)
            result = await service.suggest_price(
                db_session=mock_db_session,
                item_name="Test Item",
                unit_cost=100.0,
                target_profit_margin=30.0
            )
        
        # Verify results
        assert result["suggested_price"] > 100.0  # should be above cost
        assert result["price_source"] == PriceSource.HISTORICAL
        assert result["historical_min"] == 120.0
        assert result["historical_max"] == 150.0
        assert "historical data" in result["explanation"]
        
    @pytest.mark.asyncio
    async def test_suggest_price_competitive_levels(self):
        """Test price suggestion with different competitive levels"""
        # Mock dependencies
        mock_db_session = AsyncMock()
        
        # Create mock historical prices with wide range
        mock_historical_prices = [
            MagicMock(unit_price=120.0),
            MagicMock(unit_price=140.0),
            MagicMock(unit_price=150.0),
            MagicMock(unit_price=160.0),
            MagicMock(unit_price=180.0)
        ]
        
        mock_historical_repository = AsyncMock()
        mock_historical_repository.get_historical_prices.return_value = mock_historical_prices
        
        # Create service instance
        service = PriceSuggestionService()
        
        # Mock repository in service
        with patch('app.services.quotation.historical_price_repository', mock_historical_repository):
            # Call method with different competitive levels
            low_result = await service.suggest_price(
                db_session=mock_db_session,
                item_name="Test Item",
                unit_cost=100.0,
                competitive_level="low"
            )
            
            medium_result = await service.suggest_price(
                db_session=mock_db_session,
                item_name="Test Item",
                unit_cost=100.0,
                competitive_level="medium"
            )
            
            high_result = await service.suggest_price(
                db_session=mock_db_session,
                item_name="Test Item",
                unit_cost=100.0,
                competitive_level="high"
            )
        
        # Verify competitive pricing strategy
        assert low_result["suggested_price"] < medium_result["suggested_price"] < high_result["suggested_price"]
        assert "aggressive pricing" in low_result["explanation"]
        assert "balanced pricing" in medium_result["explanation"]
        assert "premium pricing" in high_result["explanation"]
        
    @pytest.mark.asyncio
    async def test_suggest_price_ensure_minimum_margin(self):
        """Test price suggestion ensures minimum margin"""
        # Mock dependencies
        mock_db_session = AsyncMock()
        
        # Create mock historical prices with prices below cost + margin
        mock_historical_prices = [
            MagicMock(unit_price=110.0),
            MagicMock(unit_price=105.0),
            MagicMock(unit_price=108.0)
        ]
        
        mock_historical_repository = AsyncMock()
        mock_historical_repository.get_historical_prices.return_value = mock_historical_prices
        
        # Create service instance
        service = PriceSuggestionService()
        
        # Mock repository in service
        with patch('app.services.quotation.historical_price_repository', mock_historical_repository):
            # Call method with 20% target margin
            result = await service.suggest_price(
                db_session=mock_db_session,
                item_name="Test Item",
                unit_cost=100.0,
                target_profit_margin=20.0
            )
        
        # Verify minimum margin is maintained
        assert result["suggested_price"] >= 120.0  # cost + 20% margin
        assert result["profit_margin"] >= 20.0
        assert "adjusted upward" in result["explanation"]
