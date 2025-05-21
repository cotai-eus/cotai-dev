#!/usr/bin/env python
"""
Seed script to populate the database with sample data for quotation testing.
"""
import asyncio
import random
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.quotation import (
    Quotation, QuotationItem, QuotationTag, HistoricalPrice, 
    RiskFactor, PriceSource, QuotationStatus, RiskLevel
)
from app.models.user import User

# Create async engine
engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI)
async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Sample data
SAMPLE_TAGS = [
    {"name": "IT Equipment", "color": "#4285F4", "description": "Computer hardware and accessories"},
    {"name": "Office Supplies", "color": "#34A853", "description": "General office supplies"},
    {"name": "Services", "color": "#FBBC05", "description": "Consulting and professional services"},
    {"name": "Software", "color": "#EA4335", "description": "Software licenses and subscriptions"},
    {"name": "Priority", "color": "#FF5722", "description": "High priority quotations"},
    {"name": "Government", "color": "#9C27B0", "description": "Government sector quotations"}
]

# Sample risk factors
RISK_FACTORS = [
    {
        "name": "Profit Margin",
        "description": "Evaluates the risk based on profit margin being below target",
        "weight": 2.0,
        "parameters": {
            "min_acceptable_margin": 15.0,
            "target_margin": 30.0
        }
    },
    {
        "name": "Price Competitiveness",
        "description": "Evaluates the risk based on price compared to market average",
        "weight": 1.5,
        "parameters": {
            "competitive_threshold": 1.05  # Within 5% of market average
        }
    },
    {
        "name": "Customer Payment History",
        "description": "Evaluates the risk based on customer's payment history",
        "weight": 1.0,
        "parameters": {
            "late_payment_threshold": 15  # Days late
        }
    },
    {
        "name": "Delivery Timeline",
        "description": "Evaluates the risk based on the delivery timeline",
        "weight": 1.0,
        "parameters": {
            "rush_keywords": ["urgent", "rush", "immediate", "asap", "express"]
        }
    }
]

# Sample products for historical prices
SAMPLE_PRODUCTS = [
    {"name": "Dell Latitude 5420", "sku": "LAT-5420", "category": "IT Equipment"},
    {"name": "HP EliteBook 840", "sku": "EB-840", "category": "IT Equipment"},
    {"name": "Microsoft Office 365", "sku": "MS-O365", "category": "Software"},
    {"name": "Adobe Creative Cloud", "sku": "ADO-CC", "category": "Software"},
    {"name": "Cisco Router 4331", "sku": "CIS-4331", "category": "IT Equipment"},
    {"name": "Network Consulting (hourly)", "sku": "SVC-NET", "category": "Services"},
    {"name": "Toner Cartridge HP 26X", "sku": "TNR-26X", "category": "Office Supplies"},
    {"name": "ASUS ProArt Display", "sku": "ASUS-PA329C", "category": "IT Equipment"},
    {"name": "VMware vSphere License", "sku": "VMW-VS", "category": "Software"},
    {"name": "IT Security Assessment", "sku": "SVC-SEC", "category": "Services"}
]

# Price ranges for sample products (min, max)
PRICE_RANGES = {
    "LAT-5420": (1200, 1500),
    "EB-840": (1300, 1600),
    "MS-O365": (150, 200),
    "ADO-CC": (500, 650),
    "CIS-4331": (2000, 2500),
    "SVC-NET": (120, 180),
    "TNR-26X": (80, 120),
    "ASUS-PA329C": (700, 900),
    "VMW-VS": (1800, 2200),
    "SVC-SEC": (3000, 5000)
}


async def create_sample_tags(db: AsyncSession):
    """Create sample quotation tags"""
    print("Creating sample quotation tags...")
    created_tags = []
    
    for tag_data in SAMPLE_TAGS:
        tag = QuotationTag(**tag_data)
        db.add(tag)
        created_tags.append(tag)
    
    await db.commit()
    print(f"Created {len(created_tags)} quotation tags")
    return created_tags


async def create_risk_factors(db: AsyncSession):
    """Create sample risk factors"""
    print("Creating risk factors...")
    created_factors = []
    
    for factor_data in RISK_FACTORS:
        factor = RiskFactor(**factor_data)
        db.add(factor)
        created_factors.append(factor)
    
    await db.commit()
    print(f"Created {len(created_factors)} risk factors")
    return created_factors


async def create_historical_prices(db: AsyncSession):
    """Create sample historical prices"""
    print("Creating historical prices...")
    
    # Sources for price data
    sources = ["internal", "market", "competitor"]
    regions = ["South", "North", "East", "West", "Central"]
    customer_types = ["government", "private", "public"]
    
    # Create historical prices over the last year
    today = datetime.utcnow()
    created_prices = []
    
    for product in SAMPLE_PRODUCTS:
        # Create 20-50 price points for each product
        for _ in range(random.randint(20, 50)):
            # Random date within the last year
            days_ago = random.randint(0, 365)
            record_date = today - timedelta(days=days_ago)
            
            # Random price within range
            sku = product["sku"]
            min_price, max_price = PRICE_RANGES.get(sku, (100, 200))
            price_spread = (max_price - min_price) * 0.2  # Allow 20% variation from range
            price = random.uniform(
                min_price - price_spread, 
                max_price + price_spread
            )
            
            # Create price record
            price_data = {
                "item_name": product["name"],
                "item_sku": sku,
                "unit_price": round(price, 2),
                "date_recorded": record_date,
                "source": random.choice(sources),
                "unit": "unit",
                "region": random.choice(regions),
                "customer_type": random.choice(customer_types),
                "bid_type": "competitive" if random.random() > 0.5 else "direct",
                "bid_result": random.choice(["won", "lost", "pending", None])
            }
            
            price_record = HistoricalPrice(**price_data)
            db.add(price_record)
            created_prices.append(price_record)
    
    await db.commit()
    print(f"Created {len(created_prices)} historical price records")
    return created_prices


async def create_sample_quotation(
    db: AsyncSession, 
    user_id: int,  
    sample_tags: list,
    reference_prefix: str = "QT"
):
    """Create a sample quotation"""
    # Generate a reference ID
    reference_id = f"{reference_prefix}-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
    
    # Random dates
    created_at = datetime.utcnow() - timedelta(days=random.randint(1, 30))
    expiration_date = created_at + timedelta(days=random.randint(15, 45))
    
    # Select 1-3 random tags
    selected_tags = random.sample(sample_tags, random.randint(1, min(3, len(sample_tags))))
    
    # Random status with appropriate dates
    status_options = list(QuotationStatus)
    status = random.choice(status_options)
    submission_date = None
    if status != QuotationStatus.DRAFT:
        submission_date = created_at + timedelta(days=random.randint(1, 3))
    
    # Create quotation
    quotation_data = {
        "reference_id": reference_id,
        "title": f"Sample Quotation {reference_id}",
        "customer_id": user_id,  # Same as creator for sample
        "created_by_id": user_id,
        "assigned_to_id": user_id,
        "created_at": created_at,
        "updated_at": created_at,
        "submission_date": submission_date,
        "expiration_date": expiration_date,
        "status": status,
        "description": "This is a sample quotation generated for testing purposes.",
        "notes": "This quotation contains automatically generated items.",
        "currency": "BRL",
        "payment_terms": "Net 30",
        "delivery_terms": random.choice([
            "Standard delivery (5-7 business days)",
            "Express delivery (1-2 business days)",
            "Urgent rush delivery ASAP",
            None
        ]),
        "target_profit_margin": random.choice([20.0, 25.0, 30.0, 35.0])
    }
    
    quotation = Quotation(**quotation_data)
    quotation.tags = selected_tags
    
    # Add to database to get ID
    db.add(quotation)
    await db.flush()
    
    # Create 3-10 random items
    num_items = random.randint(3, 10)
    
    # Select random products for this quotation
    selected_products = random.sample(SAMPLE_PRODUCTS, min(num_items, len(SAMPLE_PRODUCTS)))
    if num_items > len(selected_products):
        # Add duplicates with variations if needed
        additional_products = random.choices(SAMPLE_PRODUCTS, k=num_items - len(selected_products))
        selected_products.extend(additional_products)
    
    for product in selected_products:
        sku = product["sku"]
        min_price, max_price = PRICE_RANGES.get(sku, (100, 200))
        
        # Calculate costs and prices
        unit_cost = round(random.uniform(min_price * 0.6, min_price * 0.8), 2)
        unit_price = round(random.uniform(min_price, max_price), 2)
        market_avg = round((min_price + max_price) / 2, 2)
        
        # Create item
        item_data = {
            "quotation_id": quotation.id,
            "sku": sku,
            "name": product["name"],
            "description": f"Sample {product['name']} for testing purposes",
            "unit": "unit",
            "quantity": random.randint(1, 5),
            "unit_cost": unit_cost,
            "unit_price": unit_price,
            "tax_percentage": random.choice([0.0, 5.0, 10.0, 17.0]),
            "discount_percentage": random.choice([0.0, 5.0, 10.0, 15.0]),
            "price_source": random.choice(list(PriceSource)),
            "market_average_price": market_avg,
            "competitiveness_score": random.uniform(40.0, 100.0)
        }
        
        item = QuotationItem(**item_data)
        db.add(item)
    
    await db.commit()
    return quotation


async def main():
    """Main function to seed the database"""
    print("Starting database seed...")
    
    async with async_session() as db:
        # Check if data already exists
        tags_result = await db.execute("SELECT COUNT(*) FROM quotation_tags")
        tag_count = tags_result.scalar_one()
        
        if tag_count > 0:
            print("Seed data already exists. Skipping...")
            return
        
        # Create sample data
        sample_tags = await create_sample_tags(db)
        await create_risk_factors(db)
        await create_historical_prices(db)
        
        # Get a user for sample quotations
        user_result = await db.execute("SELECT id FROM users LIMIT 1")
        user_id = user_result.scalar_one_or_none()
        
        if not user_id:
            print("No users found. Please create a user first.")
            return
        
        # Create sample quotations
        print("Creating sample quotations...")
        quotations = []
        for i in range(1, 21):  # 20 sample quotations
            prefix = "QT" if i % 3 != 0 else "RFP"  # Mix of QT and RFP prefixes
            quotation = await create_sample_quotation(
                db, user_id, sample_tags, prefix
            )
            quotations.append(quotation)
            
        print(f"Created {len(quotations)} sample quotations with items")
    
    print("Database seed completed!")


if __name__ == "__main__":
    asyncio.run(main())
