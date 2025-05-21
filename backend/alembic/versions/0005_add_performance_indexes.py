"""Add performance indexes to improve query performance

Revision ID: 0005_add_performance_indexes
Revises: 0004_quotation_tables
Create Date: 2024-05-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0005_add_performance_indexes'
down_revision = '0004_quotation_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Índices para tabela de usuários - melhorar login e busca por email
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_is_active'), 'users', ['is_active'], unique=False)
    
    # Índices para tabela de cotações - melhorar filtragem e ordenação
    op.create_index(op.f('ix_quotations_status'), 'quotations', ['status'], unique=False)
    op.create_index(op.f('ix_quotations_user_id'), 'quotations', ['user_id'], unique=False)
    op.create_index(op.f('ix_quotations_created_at'), 'quotations', ['created_at'], unique=False)
    op.create_index(op.f('ix_quotations_updated_at'), 'quotations', ['updated_at'], unique=False)
    
    # Índice composto para filtrar cotações por status e data
    op.create_index(
        op.f('ix_quotations_status_created_at'), 
        'quotations', 
        ['status', 'created_at'], 
        unique=False
    )
    
    # Índices para tabela de itens de cotação
    op.create_index(op.f('ix_quotation_items_quotation_id'), 'quotation_items', ['quotation_id'], unique=False)
    op.create_index(op.f('ix_quotation_items_category'), 'quotation_items', ['category'], unique=False)
    
    # Índices para tabela de preços de cotação
    op.create_index(op.f('ix_quotation_prices_item_id'), 'quotation_prices', ['item_id'], unique=False)
    op.create_index(op.f('ix_quotation_prices_source'), 'quotation_prices', ['source'], unique=False)
    
    # Índices para análise de risco
    op.create_index(op.f('ix_risk_analysis_quotation_id'), 'risk_analysis', ['quotation_id'], unique=False)
    op.create_index(op.f('ix_risk_analysis_risk_level'), 'risk_analysis', ['risk_level'], unique=False)
    
    # Índices para tabela de mensagens
    op.create_index(op.f('ix_messages_sender_id'), 'messages', ['sender_id'], unique=False)
    op.create_index(op.f('ix_messages_recipient_id'), 'messages', ['recipient_id'], unique=False)
    op.create_index(op.f('ix_messages_created_at'), 'messages', ['created_at'], unique=False)
    op.create_index(op.f('ix_messages_is_read'), 'messages', ['is_read'], unique=False)
    
    # Índice composto para conversas (mensagens entre duas pessoas)
    op.create_index(
        op.f('ix_messages_conversation'), 
        'messages', 
        ['sender_id', 'recipient_id'], 
        unique=False
    )
    
    # Índices para documentos
    op.create_index(op.f('ix_documents_user_id'), 'documents', ['user_id'], unique=False)
    op.create_index(op.f('ix_documents_document_type'), 'documents', ['document_type'], unique=False)
    op.create_index(op.f('ix_documents_status'), 'documents', ['status'], unique=False)
    op.create_index(op.f('ix_documents_uploaded_at'), 'documents', ['uploaded_at'], unique=False)


def downgrade():
    # Remover índices da tabela de usuários
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_is_active'), table_name='users')
    
    # Remover índices da tabela de cotações
    op.drop_index(op.f('ix_quotations_status'), table_name='quotations')
    op.drop_index(op.f('ix_quotations_user_id'), table_name='quotations')
    op.drop_index(op.f('ix_quotations_created_at'), table_name='quotations')
    op.drop_index(op.f('ix_quotations_updated_at'), table_name='quotations')
    op.drop_index(op.f('ix_quotations_status_created_at'), table_name='quotations')
    
    # Remover índices da tabela de itens de cotação
    op.drop_index(op.f('ix_quotation_items_quotation_id'), table_name='quotation_items')
    op.drop_index(op.f('ix_quotation_items_category'), table_name='quotation_items')
    
    # Remover índices da tabela de preços de cotação
    op.drop_index(op.f('ix_quotation_prices_item_id'), table_name='quotation_prices')
    op.drop_index(op.f('ix_quotation_prices_source'), table_name='quotation_prices')
    
    # Remover índices da tabela de análise de risco
    op.drop_index(op.f('ix_risk_analysis_quotation_id'), table_name='risk_analysis')
    op.drop_index(op.f('ix_risk_analysis_risk_level'), table_name='risk_analysis')
    
    # Remover índices da tabela de mensagens
    op.drop_index(op.f('ix_messages_sender_id'), table_name='messages')
    op.drop_index(op.f('ix_messages_recipient_id'), table_name='messages')
    op.drop_index(op.f('ix_messages_created_at'), table_name='messages')
    op.drop_index(op.f('ix_messages_is_read'), table_name='messages')
    op.drop_index(op.f('ix_messages_conversation'), table_name='messages')
    
    # Remover índices da tabela de documentos
    op.drop_index(op.f('ix_documents_user_id'), table_name='documents')
    op.drop_index(op.f('ix_documents_document_type'), table_name='documents')
    op.drop_index(op.f('ix_documents_status'), table_name='documents')
    op.drop_index(op.f('ix_documents_uploaded_at'), table_name='documents')
