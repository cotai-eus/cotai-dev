"""add quotation tables

Revision ID: 0004_quotation_tables
Revises: 0003_message_tables
Create Date: 2025-05-21 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '0004_quotation_tables'
down_revision = '0003_message_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE quotation_status AS ENUM "
               "('draft', 'submitted', 'approved', 'rejected', 'awarded', 'lost')")
    
    op.execute("CREATE TYPE price_source AS ENUM "
               "('historical', 'market', 'manual', 'ai_suggested')")
    
    op.execute("CREATE TYPE risk_level AS ENUM "
               "('low', 'medium', 'high', 'critical')")
    
    # Create quotation tags table
    op.create_table(
        'quotation_tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=200), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_quotation_tags_id'), 'quotation_tags', ['id'], unique=False)
    
    # Create quotations table
    op.create_table(
        'quotations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reference_id', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('submission_date', sa.DateTime(), nullable=True),
        sa.Column('expiration_date', sa.DateTime(), nullable=True),
        sa.Column('status', sa.Enum('draft', 'submitted', 'approved', 'rejected', 'awarded', 'lost', 
                                    name='quotation_status'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('bid_document_id', sa.Integer(), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('payment_terms', sa.String(length=100), nullable=True),
        sa.Column('delivery_terms', sa.String(length=100), nullable=True),
        sa.Column('risk_score', sa.Float(), nullable=True),
        sa.Column('risk_level', sa.Enum('low', 'medium', 'high', 'critical', name='risk_level'), nullable=True),
        sa.Column('risk_factors', sa.JSON(), nullable=True),
        sa.Column('target_profit_margin', sa.Float(), nullable=True),
        sa.Column('actual_profit_margin', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['bid_document_id'], ['documents.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['customer_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('reference_id')
    )
    op.create_index(op.f('ix_quotations_id'), 'quotations', ['id'], unique=False)
    op.create_index(op.f('ix_quotations_reference_id'), 'quotations', ['reference_id'], unique=False)
    
    # Create quotation_items table
    op.create_table(
        'quotation_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('quotation_id', sa.Integer(), nullable=False),
        sa.Column('sku', sa.String(length=50), nullable=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('unit', sa.String(length=20), nullable=True),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('unit_cost', sa.Float(), nullable=False),
        sa.Column('unit_price', sa.Float(), nullable=False),
        sa.Column('tax_percentage', sa.Float(), nullable=False),
        sa.Column('discount_percentage', sa.Float(), nullable=False),
        sa.Column('price_source', sa.Enum('historical', 'market', 'manual', 'ai_suggested', 
                                          name='price_source'), nullable=False),
        sa.Column('suggested_unit_price', sa.Float(), nullable=True),
        sa.Column('price_suggestion_data', sa.JSON(), nullable=True),
        sa.Column('market_average_price', sa.Float(), nullable=True),
        sa.Column('competitiveness_score', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['quotation_id'], ['quotations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quotation_items_id'), 'quotation_items', ['id'], unique=False)
    
    # Create historical_prices table
    op.create_table(
        'historical_prices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('item_sku', sa.String(length=50), nullable=True),
        sa.Column('item_name', sa.String(length=200), nullable=False),
        sa.Column('unit_price', sa.Float(), nullable=False),
        sa.Column('date_recorded', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=True),
        sa.Column('region', sa.String(length=50), nullable=True),
        sa.Column('customer_type', sa.String(length=50), nullable=True),
        sa.Column('bid_type', sa.String(length=50), nullable=True),
        sa.Column('bid_result', sa.String(length=20), nullable=True),
        sa.Column('quotation_item_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['quotation_item_id'], ['quotation_items.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_historical_prices_id'), 'historical_prices', ['id'], unique=False)
    op.create_index(op.f('ix_historical_prices_item_name'), 'historical_prices', ['item_name'], unique=False)
    op.create_index(op.f('ix_historical_prices_item_sku'), 'historical_prices', ['item_sku'], unique=False)
    
    # Create risk_factors table
    op.create_table(
        'risk_factors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('weight', sa.Float(), nullable=False),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_risk_factors_id'), 'risk_factors', ['id'], unique=False)
    
    # Create quotation_history table
    op.create_table(
        'quotation_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('quotation_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['quotation_id'], ['quotations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quotation_history_id'), 'quotation_history', ['id'], unique=False)
    
    # Create association table for quotation tags
    op.create_table(
        'quotation_tag',
        sa.Column('quotation_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['quotation_id'], ['quotations.id'], ),
        sa.ForeignKeyConstraint(['tag_id'], ['quotation_tags.id'], ),
        sa.PrimaryKeyConstraint('quotation_id', 'tag_id')
    )


def downgrade() -> None:
    # Drop association table
    op.drop_table('quotation_tag')
    
    # Drop other tables
    op.drop_index(op.f('ix_quotation_history_id'), table_name='quotation_history')
    op.drop_table('quotation_history')
    
    op.drop_index(op.f('ix_risk_factors_id'), table_name='risk_factors')
    op.drop_table('risk_factors')
    
    op.drop_index(op.f('ix_historical_prices_item_sku'), table_name='historical_prices')
    op.drop_index(op.f('ix_historical_prices_item_name'), table_name='historical_prices')
    op.drop_index(op.f('ix_historical_prices_id'), table_name='historical_prices')
    op.drop_table('historical_prices')
    
    op.drop_index(op.f('ix_quotation_items_id'), table_name='quotation_items')
    op.drop_table('quotation_items')
    
    op.drop_index(op.f('ix_quotations_reference_id'), table_name='quotations')
    op.drop_index(op.f('ix_quotations_id'), table_name='quotations')
    op.drop_table('quotations')
    
    op.drop_index(op.f('ix_quotation_tags_id'), table_name='quotation_tags')
    op.drop_table('quotation_tags')
    
    # Drop enum types
    op.execute("DROP TYPE risk_level")
    op.execute("DROP TYPE price_source")
    op.execute("DROP TYPE quotation_status")
