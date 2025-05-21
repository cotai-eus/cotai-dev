"""
Performance tests for quotation-related endpoints.
"""
import pytest
from conftest import performance_test

class TestQuotationPerformance:
    """
    Test class for quotation performance tests
    """
    
    @performance_test(threshold=100.0)  # Expect response in under 100ms
    def test_get_quotations_performance(self, client, performance_metrics, auth_headers):
        """
        Test that listing quotations is performant
        """
        headers = auth_headers()
        response = client.get("/api/quotations/", headers=headers)
        assert response.status_code == 200
        performance_metrics("get_quotations_response_time", response.elapsed.total_seconds() * 1000)
    
    @performance_test(threshold=150.0)  # Slightly higher threshold for detailed view
    def test_get_quotation_detail_performance(self, client, performance_metrics, auth_headers):
        """
        Test that retrieving a single quotation is performant
        """
        # First create a quotation to test with
        headers = auth_headers()
        
        # Note: In a real test, you might want to setup test data in a fixture
        create_data = {
            "clientName": "Performance Test Client",
            "clientEmail": "perf@example.com",
            "items": [
                {
                    "name": "Performance Test Item",
                    "quantity": 1,
                    "unitPrice": 100,
                    "cost": 50
                }
            ],
            "status": "draft"
        }
        
        create_response = client.post("/api/quotations/", json=create_data, headers=headers)
        assert create_response.status_code == 201
        
        # Get the created quotation ID
        quotation_id = create_response.json()["id"]
        
        # Now test the performance of getting the quotation
        response = client.get(f"/api/quotations/{quotation_id}", headers=headers)
        assert response.status_code == 200
        performance_metrics("get_quotation_detail_response_time", response.elapsed.total_seconds() * 1000)
    
    @performance_test(threshold=200.0)  # Higher threshold for price calculations
    def test_price_suggestion_performance(self, client, performance_metrics, auth_headers):
        """
        Test that price suggestion algorithm is performant
        """
        headers = auth_headers()
        
        # Request price suggestions for multiple items
        items = [
            {
                "name": "Item 1",
                "quantity": 1,
                "cost": 100
            },
            {
                "name": "Item 2", 
                "quantity": 5, 
                "cost": 50
            },
            {
                "name": "Item 3",
                "quantity": 10,
                "cost": 25
            }
        ]
        
        response = client.post("/api/quotations/price-suggestions", json={"items": items}, headers=headers)
        assert response.status_code == 200
        performance_metrics("price_suggestion_response_time", response.elapsed.total_seconds() * 1000)
    
    @performance_test(threshold=300.0)  # Higher threshold for complex report generation
    def test_quotation_report_generation_performance(self, client, performance_metrics, auth_headers):
        """
        Test that generating quotation reports is performant
        """
        headers = auth_headers()
        
        # Define report parameters
        report_params = {
            "startDate": "2025-01-01",
            "endDate": "2025-05-21",
            "groupBy": "month",
            "includeMetrics": ["count", "revenue", "margin"]
        }
        
        response = client.post("/api/quotations/reports", json=report_params, headers=headers)
        assert response.status_code == 200
        performance_metrics("report_generation_response_time", response.elapsed.total_seconds() * 1000)
