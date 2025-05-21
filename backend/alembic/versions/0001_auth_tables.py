"""
Migration para adicionar os campos de autenticação e autorização ao modelo User.
Adiciona tabelas para permissões e associação de permissões.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Revision ID e dependências
revision = '0001_auth_tables'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Cria a tabela de permissions
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_permissions_id'), 'permissions', ['id'], unique=False)
    op.create_index(op.f('ix_permissions_name'), 'permissions', ['name'], unique=True)
    
    # Adiciona enum para roles e providers
    roles_enum = postgresql.ENUM('admin', 'manager', 'staff', 'user', name='role')
    providers_enum = postgresql.ENUM('local', 'google', 'microsoft', 'github', name='provider')
    
    op.execute('CREATE TYPE role AS ENUM (\'admin\', \'manager\', \'staff\', \'user\')')
    op.execute('CREATE TYPE provider AS ENUM (\'local\', \'google\', \'microsoft\', \'github\')')
    
    # Atualiza tabela users com os novos campos
    op.add_column('users', sa.Column('role', sa.Enum('admin', 'manager', 'staff', 'user', name='role'), nullable=False, server_default='user'))
    op.add_column('users', sa.Column('auth_provider', sa.Enum('local', 'google', 'microsoft', 'github', name='provider'), nullable=False, server_default='local'))
    op.add_column('users', sa.Column('oauth_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('totp_secret', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('users', sa.Column('last_login', sa.String(length=255), nullable=True))
    
    # Cria tabela associativa para permissões
    op.create_table(
        'user_permission',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'permission_id')
    )
    
    # Cria tabela para tokens revogados (para logout)
    op.create_table(
        'revoked_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('jti', sa.String(length=36), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_revoked_tokens_jti'), 'revoked_tokens', ['jti'], unique=True)
    

def downgrade():
    # Remove tabelas
    op.drop_table('user_permission')
    op.drop_table('revoked_tokens')
    
    # Remove colunas da tabela users
    op.drop_column('users', 'last_login')
    op.drop_column('users', 'failed_login_attempts')
    op.drop_column('users', 'is_verified')
    op.drop_column('users', 'totp_secret')
    op.drop_column('users', 'oauth_id')
    op.drop_column('users', 'auth_provider')
    op.drop_column('users', 'role')
    
    # Remove enums
    op.execute('DROP TYPE provider')
    op.execute('DROP TYPE role')
    
    # Remove tabela permissions
    op.drop_index(op.f('ix_permissions_name'), table_name='permissions')
    op.drop_index(op.f('ix_permissions_id'), table_name='permissions')
    op.drop_table('permissions')
