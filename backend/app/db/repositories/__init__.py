"""
Inicialização de repositórios.
"""
from app.db.repositories.user import user_repository
from app.models.document import Document, DocumentTag, ExtractedField, ProcessingJob
from app.models.quotation import Quotation, QuotationItem, QuotationTag, HistoricalPrice, RiskFactor, QuotationHistoryEntry

# Import repositories
from app.db.repositories.document import DocumentRepository, DocumentTagRepository, ExtractedFieldRepository, ProcessingJobRepository
from app.db.repositories.quotation import QuotationRepository, QuotationItemRepository, QuotationTagRepository, HistoricalPriceRepository, RiskFactorRepository, QuotationHistoryRepository

# Inicializa os repositórios de documentos
document_repository = DocumentRepository(model=Document)
document_tag_repository = DocumentTagRepository(model=DocumentTag)
extracted_field_repository = ExtractedFieldRepository(model=ExtractedField)
processing_job_repository = ProcessingJobRepository(model=ProcessingJob)

# Inicializa os repositórios de cotações
quotation_repository = QuotationRepository(model=Quotation)
quotation_item_repository = QuotationItemRepository(model=QuotationItem)
quotation_tag_repository = QuotationTagRepository(model=QuotationTag)
historical_price_repository = HistoricalPriceRepository(model=HistoricalPrice)
risk_factor_repository = RiskFactorRepository(model=RiskFactor)
quotation_history_repository = QuotationHistoryRepository(model=QuotationHistoryEntry)

# Exporte todos os repositórios aqui
__all__ = [
    "user_repository",
    "document_repository",
    "document_tag_repository",
    "extracted_field_repository",
    "processing_job_repository",
    "quotation_repository",
    "quotation_item_repository",
    "quotation_tag_repository",
    "historical_price_repository",
    "risk_factor_repository",
    "quotation_history_repository"
]
