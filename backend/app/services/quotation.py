"""
Services for quotation management, price suggestions and risk analysis.
"""
import asyncio
import json
import math
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quotation import (
    Quotation, QuotationItem, HistoricalPrice, RiskFactor,
    PriceSource, RiskLevel
)
from app.db.repositories.quotation import (
    quotation_repository, quotation_item_repository,
    historical_price_repository, risk_factor_repository
)


class PriceSuggestionService:
    """
    Service for suggesting competitive prices based on historical data.
    """
    
    async def suggest_price(
        self,
        db_session: AsyncSession,
        item_name: str,
        unit_cost: float,
        sku: Optional[str] = None,
        unit: Optional[str] = None,
        quantity: float = 1.0,
        target_profit_margin: Optional[float] = 30.0,  # Default 30% margin
        customer_type: Optional[str] = None,
        region: Optional[str] = None,
        competitive_level: Optional[str] = "medium"  # low, medium, high
    ) -> Dict[str, Any]:
        """
        Suggests a competitive price for an item based on historical data.
        """
        # Default response structure
        response = {
            "suggested_price": 0.0,
            "price_source": PriceSource.MANUAL,
            "competitiveness_score": 0,
            "profit_margin": 0.0,
            "explanation": "No price suggestion available."
        }
        
        # Basic price calculation based on cost and margin
        min_price = unit_cost * (1 + (target_profit_margin or 30) / 100)
        
        # Get historical price data
        historical_prices = await historical_price_repository.get_historical_prices(
            db_session=db_session,
            item_name=item_name,
            item_sku=sku,
            customer_type=customer_type,
            region=region,
            from_date=datetime.utcnow() - timedelta(days=365)  # Last year
        )
        
        if not historical_prices:
            # No historical data, use basic margin-based pricing
            response.update({
                "suggested_price": round(min_price, 2),
                "price_source": PriceSource.MANUAL,
                "competitiveness_score": 0,
                "profit_margin": target_profit_margin or 30.0,
                "explanation": "No historical data available. Suggested price based on cost plus target margin."
            })
            return response
        
        # Extract relevant price points
        price_points = [p.unit_price for p in historical_prices]
        
        # Calculate statistics
        historical_min = min(price_points)
        historical_max = max(price_points)
        historical_avg = statistics.mean(price_points)
        historical_median = statistics.median(price_points)
        
        # Update response with historical data
        response.update({
            "historical_min": round(historical_min, 2),
            "historical_max": round(historical_max, 2),
            "historical_avg": round(historical_avg, 2)
        })
        
        # Calculate competitive price based on historical data and competitive level
        if competitive_level == "low":  # Aggressive pricing
            target_percentile = 0.25  # 25th percentile
        elif competitive_level == "high":  # Premium pricing
            target_percentile = 0.75  # 75th percentile
        else:  # Medium competitive level (default)
            target_percentile = 0.5  # Median
        
        # Sort prices for percentile calculation
        sorted_prices = sorted(price_points)
        
        # Calculate target price based on percentile
        index = min(int(len(sorted_prices) * target_percentile), len(sorted_prices) - 1)
        target_price = sorted_prices[index]
        
        # Ensure suggested price covers costs and minimum margin
        suggested_price = max(target_price, min_price)
        
        # Calculate actual margin
        actual_margin = ((suggested_price - unit_cost) / suggested_price) * 100
        
        # Calculate competitiveness score (0-100)
        if historical_max == historical_min:
            competitiveness_score = 50  # Neutral if all prices are the same
        else:
            # Lower price = higher competitiveness
            norm_price = (suggested_price - historical_min) / (historical_max - historical_min)
            competitiveness_score = 100 - (norm_price * 100)
        
        # Build explanation
        explanation = (
            f"Suggested price based on historical data ({len(historical_prices)} records). "
            f"Historical range: ${historical_min:.2f}-${historical_max:.2f}, "
            f"average: ${historical_avg:.2f}. "
        )
        
        # Add competitive strategy to explanation
        if competitive_level == "low":
            explanation += "Using aggressive pricing strategy (25th percentile)."
        elif competitive_level == "high":
            explanation += "Using premium pricing strategy (75th percentile)."
        else:
            explanation += "Using balanced pricing strategy (median)."
        
        # Add margin information to explanation
        if actual_margin < (target_profit_margin or 30):
            explanation += f" Price adjusted upward to maintain minimum profit margin of {target_profit_margin}%."
        
        # Update response
        response.update({
            "suggested_price": round(suggested_price, 2),
            "price_source": PriceSource.HISTORICAL,
            "competitiveness_score": round(competitiveness_score, 1),
            "profit_margin": round(actual_margin, 1),
            "explanation": explanation
        })
        
        return response


class RiskAnalysisService:
    """
    Service for analyzing risk in quotations.
    """
    
    async def analyze_risk(
        self,
        db_session: AsyncSession,
        quotation_id: int
    ) -> Dict[str, Any]:
        """
        Analyzes the risk of a quotation based on various factors.
        """
        # Default response
        response = {
            "quotation_id": quotation_id,
            "overall_risk_score": 0,
            "risk_level": RiskLevel.LOW,
            "factors": [],
            "recommendations": []
        }
        
        # Get quotation with items
        quotation = await quotation_repository.get_quotation_by_id(
            db_session=db_session,
            quotation_id=quotation_id,
            include_items=True,
            include_tags=True
        )
        
        if not quotation:
            return response
            
        # Get risk factors from database
        risk_factors = await risk_factor_repository.get_all_risk_factors(db_session)
        
        if not risk_factors:
            # No risk factors defined
            response["recommendations"].append(
                "No risk factors defined in the system. Configure risk factors for proper risk analysis."
            )
            return response
        
        # Initialize risk analysis
        factor_results = []
        
        # Calculate each risk factor
        for factor in risk_factors:
            factor_score = await self._calculate_risk_factor(
                db_session=db_session,
                quotation=quotation,
                risk_factor=factor
            )
            factor_results.append(factor_score)
        
        # Calculate overall risk score (weighted average)
        total_weight = sum(f["weight"] for f in factor_results)
        if total_weight > 0:
            overall_score = sum(f["score"] * f["weight"] for f in factor_results) / total_weight
        else:
            overall_score = 0
        
        # Determine risk level based on overall score
        risk_level = self._determine_risk_level(overall_score)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(quotation, factor_results)
        
        # Update response
        response.update({
            "overall_risk_score": round(overall_score, 1),
            "risk_level": risk_level,
            "factors": factor_results,
            "recommendations": recommendations
        })
        
        # Update quotation with risk analysis
        await quotation_repository.update_risk_analysis(
            db_session=db_session,
            quotation_id=quotation_id,
            risk_score=overall_score,
            risk_level=risk_level.value,
            risk_factors={
                "factors": factor_results,
                "recommendations": recommendations,
                "analyzed_at": datetime.utcnow().isoformat()
            }
        )
        
        return response
    
    async def _calculate_risk_factor(
        self,
        db_session: AsyncSession,
        quotation: Quotation,
        risk_factor: RiskFactor
    ) -> Dict[str, Any]:
        """
        Calculates the risk score for a specific factor.
        """
        factor_result = {
            "factor_id": risk_factor.id,
            "name": risk_factor.name,
            "score": 0,  # 0-100, higher is riskier
            "level": RiskLevel.LOW,
            "description": risk_factor.description or "",
            "weight": risk_factor.weight,
            "details": {}
        }
        
        # Get parameters from risk factor
        params = risk_factor.parameters or {}
        
        # Calculate risk based on factor name
        if risk_factor.name == "Profit Margin":
            # Risk based on profit margin (lower margin = higher risk)
            target_margin = quotation.target_profit_margin or 30.0
            actual_margin = quotation.profit_margin_percentage
            
            min_acceptable = params.get("min_acceptable_margin", 15.0)
            target_acceptable = params.get("target_margin", 30.0)
            
            if actual_margin < min_acceptable:
                # Below minimum acceptable margin
                factor_result["score"] = 100
                factor_result["details"] = {
                    "actual_margin": actual_margin,
                    "target_margin": target_margin,
                    "min_acceptable": min_acceptable
                }
                factor_result["description"] = f"Profit margin ({actual_margin:.1f}%) is below minimum acceptable ({min_acceptable}%)"
            elif actual_margin < target_margin:
                # Below target but above minimum
                normalized = (actual_margin - min_acceptable) / (target_margin - min_acceptable)
                factor_result["score"] = 100 - (normalized * 60)  # 40-100 range
                factor_result["details"] = {
                    "actual_margin": actual_margin,
                    "target_margin": target_margin
                }
                factor_result["description"] = f"Profit margin ({actual_margin:.1f}%) is below target ({target_margin:.1f}%)"
            else:
                # At or above target
                factor_result["score"] = 0
                factor_result["details"] = {
                    "actual_margin": actual_margin,
                    "target_margin": target_margin
                }
                factor_result["description"] = f"Profit margin ({actual_margin:.1f}%) meets or exceeds target ({target_margin:.1f}%)"
        
        elif risk_factor.name == "Price Competitiveness":
            # Risk based on price competitiveness (higher prices = higher risk)
            if not quotation.items:
                factor_result["score"] = 50
                factor_result["description"] = "No items to evaluate price competitiveness"
            else:
                competitive_items = 0
                uncompetitive_items = 0
                no_market_data = 0
                
                for item in quotation.items:
                    if item.market_average_price:
                        if item.is_competitive:
                            competitive_items += 1
                        else:
                            uncompetitive_items += 1
                    else:
                        no_market_data += 1
                
                total_items = len(quotation.items)
                
                if total_items == no_market_data:
                    factor_result["score"] = 50
                    factor_result["description"] = "No market data available for price comparison"
                else:
                    items_with_data = total_items - no_market_data
                    competitive_ratio = competitive_items / items_with_data if items_with_data > 0 else 0
                    factor_result["score"] = 100 - (competitive_ratio * 100)
                    factor_result["details"] = {
                        "competitive_items": competitive_items,
                        "uncompetitive_items": uncompetitive_items,
                        "no_market_data": no_market_data
                    }
                    
                    if uncompetitive_items > 0:
                        factor_result["description"] = (
                            f"{uncompetitive_items} of {total_items} items are priced above market average"
                        )
                    else:
                        factor_result["description"] = "All items are competitively priced"
        
        elif risk_factor.name == "Customer Payment History":
            # Risk based on customer payment history
            # This would typically integrate with a payment/invoice system
            # For now, use a placeholder medium risk
            factor_result["score"] = 50
            factor_result["description"] = "Customer payment history evaluation not implemented"
        
        elif risk_factor.name == "Delivery Timeline":
            # Risk based on delivery timeline in terms
            if quotation.delivery_terms:
                # Check for keywords indicating rush delivery
                rush_keywords = ["urgent", "rush", "immediate", "asap", "express"]
                
                if any(keyword in quotation.delivery_terms.lower() for keyword in rush_keywords):
                    factor_result["score"] = 80
                    factor_result["description"] = "Rush delivery terms detected, increased risk of delivery issues"
                else:
                    factor_result["score"] = 20
                    factor_result["description"] = "Standard delivery terms"
            else:
                factor_result["score"] = 50
                factor_result["description"] = "No delivery terms specified"
        
        # Determine risk level for this factor
        factor_result["level"] = self._determine_risk_level(factor_result["score"])
        
        return factor_result
    
    def _determine_risk_level(self, risk_score: float) -> RiskLevel:
        """
        Determines the risk level based on the score.
        """
        if risk_score < 25:
            return RiskLevel.LOW
        elif risk_score < 50:
            return RiskLevel.MEDIUM
        elif risk_score < 75:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL
    
    def _generate_recommendations(
        self, 
        quotation: Quotation, 
        factor_results: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Generates recommendations based on risk factors.
        """
        recommendations = []
        
        # Check profit margin
        margin_factor = next((f for f in factor_results if f["name"] == "Profit Margin"), None)
        if margin_factor and margin_factor["score"] > 50:
            recommendations.append(
                "Consider increasing prices to improve profit margin or reducing costs."
            )
        
        # Check price competitiveness
        price_factor = next((f for f in factor_results if f["name"] == "Price Competitiveness"), None)
        if price_factor and price_factor["score"] > 50:
            recommendations.append(
                "Review pricing strategy as several items are priced above market average."
            )
        
        # Check customer payment history
        payment_factor = next((f for f in factor_results if f["name"] == "Customer Payment History"), None)
        if payment_factor and payment_factor["score"] > 50:
            recommendations.append(
                "Review customer payment history and consider stricter payment terms."
            )
        
        # Check delivery timeline
        delivery_factor = next((f for f in factor_results if f["name"] == "Delivery Timeline"), None)
        if delivery_factor and delivery_factor["score"] > 50:
            recommendations.append(
                "Rush delivery terms detected. Ensure resources are available to meet tight deadlines."
            )
        
        # Add general recommendation if risk is high
        high_risk_factors = [f for f in factor_results if f["level"] in (RiskLevel.HIGH, RiskLevel.CRITICAL)]
        if high_risk_factors:
            recommendations.append(
                f"Review high-risk factors: {', '.join(f['name'] for f in high_risk_factors)}."
            )
        
        return recommendations


class QuotationReportService:
    """
    Service for generating quotation reports and comparisons.
    """
    
    async def generate_summary_report(
        self,
        db_session: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[List[str]] = None,
        customer_id: Optional[int] = None,
        assigned_to_id: Optional[int] = None,
        tag_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Generates a summary report of quotations.
        """
        # Get quotations with filters
        quotations, total = await quotation_repository.get_quotations(
            db_session=db_session,
            skip=0,
            limit=1000,  # Higher limit for reports
            from_date=start_date,
            to_date=end_date,
            status=status,
            customer_id=customer_id,
            assigned_to_id=assigned_to_id,
            tag_ids=tag_ids
        )
        
        if not quotations:
            return {
                "total_quotations": 0,
                "total_value": 0,
                "average_value": 0,
                "won_quotations": 0,
                "won_value": 0,
                "win_rate": 0,
                "average_profit_margin": 0,
                "status_distribution": {},
                "risk_level_distribution": {}
            }
        
        # Calculate report metrics
        total_value = sum(q.total_price for q in quotations)
        average_value = total_value / len(quotations) if quotations else 0
        
        # Count won quotations
        won_quotations = [q for q in quotations if q.status == "awarded"]
        won_value = sum(q.total_price for q in won_quotations)
        win_rate = (len(won_quotations) / len(quotations)) * 100 if quotations else 0
        
        # Calculate average margin
        margins = [q.profit_margin_percentage for q in quotations]
        average_margin = sum(margins) / len(margins) if margins else 0
        
        # Status distribution
        status_distribution = {}
        for q in quotations:
            status_distribution[q.status] = status_distribution.get(q.status, 0) + 1
        
        # Risk level distribution
        risk_distribution = {}
        for q in quotations:
            if q.risk_level:
                risk_distribution[q.risk_level] = risk_distribution.get(q.risk_level, 0) + 1
        
        return {
            "total_quotations": len(quotations),
            "total_value": round(total_value, 2),
            "average_value": round(average_value, 2),
            "won_quotations": len(won_quotations),
            "won_value": round(won_value, 2),
            "win_rate": round(win_rate, 2),
            "average_profit_margin": round(average_margin, 2),
            "status_distribution": status_distribution,
            "risk_level_distribution": risk_distribution,
            "quotations": quotations
        }
    
    async def compare_quotations(
        self,
        db_session: AsyncSession,
        quotation_ids: List[int]
    ) -> Dict[str, Any]:
        """
        Compares multiple quotations.
        """
        result = {
            "quotations": [],
            "comparison_metrics": {}
        }
        
        # Get quotations with items
        quotations = []
        for q_id in quotation_ids:
            quotation = await quotation_repository.get_quotation_by_id(
                db_session=db_session,
                quotation_id=q_id,
                include_items=True,
                include_tags=True
            )
            if quotation:
                quotations.append(quotation)
        
        if not quotations:
            return result
        
        # Basic quotation data
        result["quotations"] = quotations
        
        # Compare metrics
        metrics = {}
        
        # Total price comparison
        prices = [q.total_price for q in quotations]
        metrics["price"] = {
            "min": min(prices),
            "max": max(prices),
            "avg": sum(prices) / len(prices),
            "values": {q.id: q.total_price for q in quotations}
        }
        
        # Profit margin comparison
        margins = [q.profit_margin_percentage for q in quotations]
        metrics["profit_margin"] = {
            "min": min(margins),
            "max": max(margins),
            "avg": sum(margins) / len(margins),
            "values": {q.id: q.profit_margin_percentage for q in quotations}
        }
        
        # Risk score comparison (if available)
        risk_scores = [q.risk_score for q in quotations if q.risk_score is not None]
        if risk_scores:
            metrics["risk_score"] = {
                "min": min(risk_scores),
                "max": max(risk_scores),
                "avg": sum(risk_scores) / len(risk_scores),
                "values": {q.id: q.risk_score for q in quotations if q.risk_score is not None}
            }
        
        # Item count comparison
        item_counts = [len(q.items) for q in quotations]
        metrics["item_count"] = {
            "min": min(item_counts),
            "max": max(item_counts),
            "avg": sum(item_counts) / len(item_counts),
            "values": {q.id: len(q.items) for q in quotations}
        }
        
        result["comparison_metrics"] = metrics
        return result


# Initialize services
price_suggestion_service = PriceSuggestionService()
risk_analysis_service = RiskAnalysisService()
quotation_report_service = QuotationReportService()
