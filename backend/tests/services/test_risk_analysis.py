"""
Tests for quotation risk analysis service.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.quotation import RiskLevel, Quotation, QuotationItem
from app.services.quotation import RiskAnalysisService


class TestRiskAnalysisService:
    """Test suite for RiskAnalysisService"""

    @pytest.mark.asyncio
    async def test_analyze_risk_with_no_factors(self):
        """Test risk analysis with no risk factors defined"""
        # Mock dependencies
        mock_db_session = AsyncMock()
        mock_quotation_repository = AsyncMock()
        mock_risk_factor_repository = AsyncMock()
        
        # Create mock quotation
        mock_quotation = MagicMock(spec=Quotation)
        mock_quotation.id = 1
        mock_quotation.items = []
        mock_quotation.tags = []
        
        # Set up repository returns
        mock_quotation_repository.get_quotation_by_id.return_value = mock_quotation
        mock_risk_factor_repository.get_all_risk_factors.return_value = []
        
        # Create service instance
        service = RiskAnalysisService()
        
        # Mock repositories
        with patch('app.services.quotation.quotation_repository', mock_quotation_repository), \
             patch('app.services.quotation.risk_factor_repository', mock_risk_factor_repository):
            # Call method
            result = await service.analyze_risk(
                db_session=mock_db_session,
                quotation_id=1
            )
        
        # Verify results
        assert result["quotation_id"] == 1
        assert result["overall_risk_score"] == 0
        assert result["risk_level"] == RiskLevel.LOW
        assert len(result["factors"]) == 0
        assert len(result["recommendations"]) == 1
        assert "No risk factors defined" in result["recommendations"][0]
        
    @pytest.mark.asyncio
    async def test_analyze_risk_with_factors(self):
        """Test risk analysis with risk factors"""
        # Mock dependencies
        mock_db_session = AsyncMock()
        mock_quotation_repository = AsyncMock()
        mock_risk_factor_repository = AsyncMock()
        
        # Create mock quotation with profit margin
        mock_quotation = MagicMock(spec=Quotation)
        mock_quotation.id = 1
        mock_quotation.profit_margin_percentage = 15.0  # Low margin
        mock_quotation.target_profit_margin = 30.0
        mock_quotation.items = []
        mock_quotation.tags = []
        mock_quotation.delivery_terms = None
        
        # Create mock risk factors
        mock_risk_factors = [
            MagicMock(
                id=1,
                name="Profit Margin",
                description="Evaluate profit margin risk",
                weight=2.0,
                parameters={
                    "min_acceptable_margin": 15.0,
                    "target_margin": 30.0
                }
            ),
            MagicMock(
                id=2,
                name="Delivery Timeline",
                description="Evaluate delivery timeline risk",
                weight=1.0,
                parameters={}
            )
        ]
        
        # Set up repository returns
        mock_quotation_repository.get_quotation_by_id.return_value = mock_quotation
        mock_risk_factor_repository.get_all_risk_factors.return_value = mock_risk_factors
        mock_quotation_repository.update_risk_analysis.return_value = mock_quotation
        
        # Create service instance
        service = RiskAnalysisService()
        
        # Mock repositories
        with patch('app.services.quotation.quotation_repository', mock_quotation_repository), \
             patch('app.services.quotation.risk_factor_repository', mock_risk_factor_repository):
            # Call method
            result = await service.analyze_risk(
                db_session=mock_db_session,
                quotation_id=1
            )
        
        # Verify results
        assert result["quotation_id"] == 1
        assert result["overall_risk_score"] > 0
        assert len(result["factors"]) == 2
        
        # Check that profit margin factor was calculated correctly
        profit_factor = next(f for f in result["factors"] if f["name"] == "Profit Margin")
        assert profit_factor["score"] == 100  # Should be high risk due to low margin
        
        # Check that repository was called to update quotation
        mock_quotation_repository.update_risk_analysis.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_risk_level_determination(self):
        """Test determination of risk levels based on scores"""
        service = RiskAnalysisService()
        
        # Test various score ranges
        assert service._determine_risk_level(0) == RiskLevel.LOW
        assert service._determine_risk_level(20) == RiskLevel.LOW
        assert service._determine_risk_level(30) == RiskLevel.MEDIUM
        assert service._determine_risk_level(49) == RiskLevel.MEDIUM
        assert service._determine_risk_level(50) == RiskLevel.HIGH
        assert service._determine_risk_level(70) == RiskLevel.HIGH
        assert service._determine_risk_level(75) == RiskLevel.CRITICAL
        assert service._determine_risk_level(100) == RiskLevel.CRITICAL
        
    @pytest.mark.asyncio
    async def test_generate_recommendations(self):
        """Test generation of recommendations based on risk factors"""
        service = RiskAnalysisService()
        
        # Create mock quotation
        mock_quotation = MagicMock(spec=Quotation)
        
        # Create factor results with various risk levels
        factor_results = [
            {
                "name": "Profit Margin",
                "score": 80,
                "level": RiskLevel.CRITICAL,
                "weight": 2.0
            },
            {
                "name": "Price Competitiveness",
                "score": 60,
                "level": RiskLevel.HIGH,
                "weight": 1.0
            },
            {
                "name": "Customer Payment History",
                "score": 20,
                "level": RiskLevel.LOW,
                "weight": 1.0
            }
        ]
        
        # Generate recommendations
        recommendations = service._generate_recommendations(mock_quotation, factor_results)
        
        # Verify results
        assert len(recommendations) >= 2
        assert any("profit margin" in r.lower() for r in recommendations)
        assert any("price" in r.lower() for r in recommendations)
        assert any("high-risk factors" in r.lower() for r in recommendations)
