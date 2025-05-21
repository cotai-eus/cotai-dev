"""
Tests for quotation API endpoints.
"""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch

from app.main import app
from app.models.quotation import Quotation, QuotationItem, QuotationTag, QuotationStatus


class TestQuotationAPI:
    """Test suite for Quotation API endpoints"""

    @pytest.fixture
    def client(self):
        """Test client fixture"""
        return TestClient(app)

    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user"""
        return {
            "id": 1,
            "username": "testuser",
            "email": "test@example.com",
            "full_name": "Test User",
            "is_active": True,
            "is_superuser": False
        }

    @pytest.fixture
    def mock_auth(self, mock_user):
        """Mock authentication dependencies"""
        with patch("app.api.deps.get_current_user", return_value=mock_user):
            yield

    @pytest.fixture
    def mock_quotation_repo(self):
        """Mock quotation repository"""
        mock_repo = AsyncMock()
        
        # Sample tag
        tag = MagicMock()
        tag.id = 1
        tag.name = "Test Tag"
        tag.color = "#FF5733"
        
        # Sample quotation
        quotation = MagicMock(spec=Quotation)
        quotation.id = 1
        quotation.reference_id = "QT-20250521-1234"
        quotation.title = "Test Quotation"
        quotation.status = QuotationStatus.DRAFT
        quotation.created_at = datetime.utcnow()
        quotation.updated_at = datetime.utcnow()
        quotation.customer_id = 1
        quotation.created_by_id = 1
        quotation.total_cost = 1000.0
        quotation.total_price = 1300.0
        quotation.profit = 300.0
        quotation.profit_margin_percentage = 23.08
        quotation.tags = [tag]
        quotation.items = []
        
        # Configure mock repository
        mock_repo.create_quotation.return_value = quotation
        mock_repo.get_quotation_by_id.return_value = quotation
        mock_repo.get_quotations.return_value = ([quotation], 1)
        mock_repo.update_quotation.return_value = quotation
        mock_repo.delete_quotation.return_value = True
        
        return mock_repo

    @pytest.mark.asyncio
    async def test_create_quotation(self, client, mock_auth, mock_quotation_repo):
        """Test creating a new quotation"""
        with patch("app.api.routers.quotation.quotation_repository", mock_quotation_repo):
            response = client.post(
                "/api/v1/quotations",
                json={
                    "reference_id": "QT-20250521-1234",
                    "title": "Test Quotation",
                    "customer_id": 1,
                    "currency": "BRL",
                    "items": [
                        {
                            "name": "Test Item",
                            "quantity": 2,
                            "unit_cost": 500.0,
                            "unit_price": 650.0
                        }
                    ]
                }
            )
        
        assert response.status_code == 201
        data = response.json()
        assert data["reference_id"] == "QT-20250521-1234"
        assert data["title"] == "Test Quotation"
        assert mock_quotation_repo.create_quotation.called

    @pytest.mark.asyncio
    async def test_get_quotation(self, client, mock_auth, mock_quotation_repo):
        """Test getting a quotation by ID"""
        with patch("app.api.routers.quotation.quotation_repository", mock_quotation_repo):
            response = client.get("/api/v1/quotations/1")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["reference_id"] == "QT-20250521-1234"
        mock_quotation_repo.get_quotation_by_id.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_quotation_not_found(self, client, mock_auth, mock_quotation_repo):
        """Test getting a non-existent quotation"""
        mock_quotation_repo.get_quotation_by_id.return_value = None
        
        with patch("app.api.routers.quotation.quotation_repository", mock_quotation_repo):
            response = client.get("/api/v1/quotations/999")
        
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_quotation(self, client, mock_auth, mock_quotation_repo):
        """Test updating a quotation"""
        with patch("app.api.routers.quotation.quotation_repository", mock_quotation_repo):
            response = client.put(
                "/api/v1/quotations/1",
                json={
                    "title": "Updated Quotation Title",
                    "notes": "Updated notes"
                }
            )
        
        assert response.status_code == 200
        mock_quotation_repo.update_quotation.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_quotation(self, client, mock_auth, mock_quotation_repo):
        """Test deleting a quotation"""
        with patch("app.api.routers.quotation.quotation_repository", mock_quotation_repo):
            response = client.delete("/api/v1/quotations/1")
        
        assert response.status_code == 204
        mock_quotation_repo.delete_quotation.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_quotation_status(self, client, mock_auth, mock_quotation_repo):
        """Test updating quotation status"""
        with patch("app.api.routers.quotation.quotation_repository", mock_quotation_repo):
            response = client.patch(
                "/api/v1/quotations/1/status",
                json={"status": "submitted"}
            )
        
        assert response.status_code == 200
        mock_quotation_repo.update_quotation.assert_called_once()

    @pytest.mark.asyncio
    async def test_suggest_price(self, client, mock_auth):
        """Test the price suggestion endpoint"""
        mock_price_service = AsyncMock()
        mock_price_service.suggest_price.return_value = {
            "suggested_price": 650.0,
            "price_source": "historical",
            "competitiveness_score": 85.0,
            "profit_margin": 30.0,
            "explanation": "Price based on historical data."
        }
        
        with patch("app.api.routers.quotation.price_suggestion_service", mock_price_service):
            response = client.post(
                "/api/v1/quotations/price-suggestion",
                json={
                    "item_name": "Test Item",
                    "unit_cost": 500.0,
                    "target_profit_margin": 30.0
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["suggested_price"] == 650.0
        assert data["price_source"] == "historical"
        mock_price_service.suggest_price.assert_called_once()

    @pytest.mark.asyncio
    async def test_analyze_risk(self, client, mock_auth, mock_quotation_repo):
        """Test the risk analysis endpoint"""
        mock_risk_service = AsyncMock()
        mock_risk_service.analyze_risk.return_value = {
            "quotation_id": 1,
            "overall_risk_score": 25.5,
            "risk_level": "medium",
            "factors": [
                {
                    "factor_id": 1,
                    "name": "Profit Margin",
                    "score": 25.5,
                    "level": "medium",
                    "description": "Profit margin below target",
                    "weight": 2.0
                }
            ],
            "recommendations": ["Consider increasing prices to improve profit margin."]
        }
        
        with patch("app.api.routers.quotation.risk_analysis_service", mock_risk_service), \
             patch("app.api.routers.quotation.quotation_repository", mock_quotation_repo):
            response = client.post("/api/v1/quotations/1/risk-analysis")
        
        assert response.status_code == 200
        data = response.json()
        assert data["quotation_id"] == 1
        assert data["risk_level"] == "medium"
        mock_risk_service.analyze_risk.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_summary_report(self, client, mock_auth):
        """Test the summary report endpoint"""
        mock_report_service = AsyncMock()
        mock_report_service.generate_summary_report.return_value = {
            "total_quotations": 10,
            "total_value": 13000.0,
            "average_value": 1300.0,
            "won_quotations": 4,
            "won_value": 6000.0,
            "win_rate": 40.0,
            "average_profit_margin": 28.5,
            "status_distribution": {"draft": 3, "submitted": 2, "approved": 1, "awarded": 4},
            "risk_level_distribution": {"low": 6, "medium": 3, "high": 1}
        }
        
        with patch("app.api.routers.quotation.quotation_report_service", mock_report_service):
            response = client.post(
                "/api/v1/quotations/reports/summary",
                json={}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_quotations"] == 10
        assert data["won_quotations"] == 4
        mock_report_service.generate_summary_report.assert_called_once()
