"""
Tests for the quotation API endpoints.
"""
import json
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.quotation import (
    Quotation, QuotationItem, QuotationTag, 
    QuotationStatus, PriceSource, RiskLevel
)


@pytest.fixture
def mock_quotation():
    """Create a mock quotation for testing"""
    return MagicMock(
        id=1,
        reference_id="QT-20250101-0001",
        title="Test Quotation",
        customer_id=1,
        created_by_id=1,
        assigned_to_id=1,
        status=QuotationStatus.DRAFT,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        submission_date=None,
        expiration_date=datetime.utcnow() + timedelta(days=30),
        description="Test description",
        notes="Test notes",
        currency="BRL",
        payment_terms="Net 30",
        delivery_terms="Standard delivery",
        risk_score=None,
        risk_level=None,
        risk_factors=None,
        target_profit_margin=30.0,
        actual_profit_margin=None,
        # Relationships
        customer=MagicMock(id=1, username="customer", email="customer@example.com"),
        created_by=MagicMock(id=1, username="user", email="user@example.com"),
        assigned_to=MagicMock(id=1, username="user", email="user@example.com"),
        tags=[],
        items=[],
        # Calculated properties
        total_cost=0.0,
        total_price=0.0,
        profit=0.0,
        profit_margin_percentage=0.0
    )


@pytest.fixture
def mock_quotation_item():
    """Create a mock quotation item for testing"""
    return MagicMock(
        id=1,
        quotation_id=1,
        sku="TEST-001",
        name="Test Item",
        description="Test item description",
        unit="unit",
        quantity=2,
        unit_cost=100.0,
        unit_price=150.0,
        tax_percentage=10.0,
        discount_percentage=0.0,
        price_source=PriceSource.MANUAL,
        suggested_unit_price=None,
        price_suggestion_data=None,
        market_average_price=None,
        competitiveness_score=None,
        # Calculated properties
        total_cost=200.0,
        total_price=330.0,  # (150 * 2) * 1.1 (with tax)
        profit=130.0,
        profit_margin_percentage=39.4,
        is_competitive=None
    )


@pytest.fixture
def mock_current_user():
    """Create a mock authenticated user for testing"""
    return MagicMock(
        id=1,
        username="testuser",
        email="test@example.com",
        full_name="Test User"
    )


@pytest.fixture
def mock_repositories():
    """Mock all quotation repositories"""
    with patch("app.api.routers.quotation.quotation_repository") as mock_quotation_repo, \
         patch("app.api.routers.quotation.quotation_item_repository") as mock_item_repo, \
         patch("app.api.routers.quotation.quotation_tag_repository") as mock_tag_repo, \
         patch("app.api.routers.quotation.historical_price_repository") as mock_price_repo, \
         patch("app.api.routers.quotation.risk_factor_repository") as mock_factor_repo, \
         patch("app.api.routers.quotation.quotation_history_repository") as mock_history_repo:
        
        yield {
            "quotation_repository": mock_quotation_repo,
            "quotation_item_repository": mock_item_repo,
            "quotation_tag_repository": mock_tag_repo,
            "historical_price_repository": mock_price_repo,
            "risk_factor_repository": mock_factor_repo,
            "quotation_history_repository": mock_history_repo
        }


@pytest.fixture
def mock_services():
    """Mock all quotation services"""
    with patch("app.api.routers.quotation.price_suggestion_service") as mock_price_service, \
         patch("app.api.routers.quotation.risk_analysis_service") as mock_risk_service, \
         patch("app.api.routers.quotation.quotation_report_service") as mock_report_service:
        
        yield {
            "price_suggestion_service": mock_price_service,
            "risk_analysis_service": mock_risk_service,
            "quotation_report_service": mock_report_service
        }


@pytest.fixture
def client(mock_current_user, mock_repositories, mock_services):
    """
    Creates a test client with mocked authentication and db session
    """
    # Patch dependency to return mock user
    with patch("app.api.routers.quotation.get_current_user", return_value=mock_current_user), \
         patch("app.api.routers.quotation.get_async_session"):
        
        # Return test client
        return TestClient(app)


class TestQuotationAPI:
    """Test suite for quotation API endpoints"""
    
    def test_create_quotation(self, client, mock_repositories, mock_quotation):
        """Test creating a quotation"""
        # Setup repository mock
        mock_repositories["quotation_repository"].create_quotation.return_value = mock_quotation
        mock_repositories["quotation_repository"].get_quotation_by_id.return_value = mock_quotation
        
        # Test data
        data = {
            "reference_id": "QT-20250101-0001",
            "title": "Test Quotation",
            "customer_id": 1,
            "description": "Test description",
            "currency": "BRL",
            "payment_terms": "Net 30",
            "delivery_terms": "Standard delivery",
            "target_profit_margin": 30.0,
            "items": [
                {
                    "sku": "TEST-001",
                    "name": "Test Item",
                    "quantity": 2,
                    "unit_cost": 100.0,
                    "unit_price": 150.0,
                    "tax_percentage": 10.0
                }
            ]
        }
        
        # Make request
        response = client.post("/api/v1/quotations", json=data)
        
        # Check response
        assert response.status_code == 201
        assert mock_repositories["quotation_repository"].create_quotation.called
    
    def test_get_quotations(self, client, mock_repositories, mock_quotation):
        """Test getting quotations list"""
        # Setup repository mock
        mock_repositories["quotation_repository"].get_quotations.return_value = ([mock_quotation], 1)
        
        # Make request
        response = client.get("/api/v1/quotations")
        
        # Check response
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert mock_repositories["quotation_repository"].get_quotations.called
    
    def test_get_quotation(self, client, mock_repositories, mock_quotation):
        """Test getting a single quotation"""
        # Setup repository mock
        mock_repositories["quotation_repository"].get_quotation_by_id.return_value = mock_quotation
        
        # Make request
        response = client.get("/api/v1/quotations/1")
        
        # Check response
        assert response.status_code == 200
        assert response.json()["id"] == 1
        assert mock_repositories["quotation_repository"].get_quotation_by_id.called
    
    def test_get_quotation_not_found(self, client, mock_repositories):
        """Test getting a non-existent quotation"""
        # Setup repository mock
        mock_repositories["quotation_repository"].get_quotation_by_id.return_value = None
        
        # Make request
        response = client.get("/api/v1/quotations/999")
        
        # Check response
        assert response.status_code == 404
    
    def test_update_quotation(self, client, mock_repositories, mock_quotation):
        """Test updating a quotation"""
        # Setup repository mock
        mock_repositories["quotation_repository"].get_quotation_by_id.return_value = mock_quotation
        mock_repositories["quotation_repository"].update_quotation.return_value = mock_quotation
        
        # Test data
        data = {
            "title": "Updated Test Quotation",
            "description": "Updated description"
        }
        
        # Make request
        response = client.put("/api/v1/quotations/1", json=data)
        
        # Check response
        assert response.status_code == 200
        assert mock_repositories["quotation_repository"].update_quotation.called
    
    def test_delete_quotation(self, client, mock_repositories, mock_quotation):
        """Test deleting a quotation"""
        # Setup repository mock
        mock_repositories["quotation_repository"].get_quotation_by_id.return_value = mock_quotation
        mock_repositories["quotation_repository"].delete_quotation.return_value = True
        
        # Make request
        response = client.delete("/api/v1/quotations/1")
        
        # Check response
        assert response.status_code == 204
        assert mock_repositories["quotation_repository"].delete_quotation.called
    
    def test_add_quotation_item(self, client, mock_repositories, mock_quotation, mock_quotation_item):
        """Test adding an item to a quotation"""
        # Setup repository mock
        mock_repositories["quotation_repository"].get_quotation_by_id.return_value = mock_quotation
        
        # Test data
        data = {
            "sku": "TEST-002",
            "name": "New Test Item",
            "quantity": 1,
            "unit_cost": 200.0,
            "unit_price": 250.0,
            "tax_percentage": 10.0
        }
        
        # Make request
        response = client.post("/api/v1/quotations/1/items", json=data)
        
        # Check response
        assert response.status_code == 200
    
    def test_suggest_price(self, client, mock_services):
        """Test price suggestion endpoint"""
        # Setup service mock
        mock_services["price_suggestion_service"].suggest_price.return_value = {
            "suggested_price": 250.0,
            "price_source": PriceSource.HISTORICAL,
            "competitiveness_score": 85.0,
            "historical_min": 220.0,
            "historical_max": 300.0,
            "historical_avg": 260.0,
            "profit_margin": 30.0,
            "explanation": "Price based on historical data"
        }
        
        # Test data
        data = {
            "item_name": "Test Item",
            "sku": "TEST-001",
            "unit_cost": 200.0,
            "target_profit_margin": 25.0,
            "competitive_level": "medium"
        }
        
        # Make request
        response = client.post("/api/v1/quotations/price-suggestion", json=data)
        
        # Check response
        assert response.status_code == 200
        assert "suggested_price" in response.json()
        assert mock_services["price_suggestion_service"].suggest_price.called
    
    def test_analyze_risk(self, client, mock_repositories, mock_services, mock_quotation):
        """Test risk analysis endpoint"""
        # Setup repository mock
        mock_repositories["quotation_repository"].get_quotation_by_id.return_value = mock_quotation
        
        # Setup service mock
        mock_services["risk_analysis_service"].analyze_risk.return_value = {
            "quotation_id": 1,
            "overall_risk_score": 25.0,
            "risk_level": RiskLevel.MEDIUM,
            "factors": [
                {
                    "factor_id": 1,
                    "name": "Profit Margin",
                    "score": 25.0,
                    "level": RiskLevel.MEDIUM,
                    "description": "Profit margin is below target",
                    "weight": 2.0,
                    "details": {}
                }
            ],
            "recommendations": [
                "Consider increasing prices to improve profit margin."
            ]
        }
        
        # Make request
        response = client.post("/api/v1/quotations/1/risk-analysis")
        
        # Check response
        assert response.status_code == 200
        assert "overall_risk_score" in response.json()
        assert mock_services["risk_analysis_service"].analyze_risk.called