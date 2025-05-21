"""
Serviço para extrair campos estruturados de documentos.
"""
import re
from typing import Dict, List, Any, Optional
import json
from datetime import datetime

class StructuredFieldsService:
    """
    Serviço para extrair campos estruturados de documentos.
    """
    
    @staticmethod
    def extract_fields_from_text(text: str, document_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Extrai campos estruturados de um texto.
        
        Args:
            text: Texto do documento
            document_type: Tipo de documento (opcional, para regras específicas)
            
        Returns:
            Lista de campos extraídos, cada um um dicionário com name, value, confidence
        """
        fields = []
        
        # Se não houver texto, retorna lista vazia
        if not text or len(text.strip()) == 0:
            return fields
        
        # Extrai campos comuns
        fields.extend(StructuredFieldsService._extract_common_fields(text))
        
        # Extrai campos específicos baseado no tipo de documento
        if document_type:
            if document_type == "invoice":
                fields.extend(StructuredFieldsService._extract_invoice_fields(text))
            elif document_type == "contract":
                fields.extend(StructuredFieldsService._extract_contract_fields(text))
            elif document_type == "procurement":
                fields.extend(StructuredFieldsService._extract_procurement_fields(text))
        
        return fields
    
    @staticmethod
    def _extract_common_fields(text: str) -> List[Dict[str, Any]]:
        """
        Extrai campos comuns de um texto.
        
        Args:
            text: Texto do documento
            
        Returns:
            Lista de campos extraídos
        """
        fields = []
        
        # CPF
        cpf_pattern = r'\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b'
        cpfs = re.findall(cpf_pattern, text)
        for cpf in cpfs:
            fields.append({
                "field_name": "cpf",
                "field_value": cpf,
                "confidence": 0.8,
                "page_number": None
            })
        
        # CNPJ
        cnpj_pattern = r'\b(\d{2}\.?\d{3}\.?\d{3}/?0001-\d{2})\b'
        cnpjs = re.findall(cnpj_pattern, text)
        for cnpj in cnpjs:
            fields.append({
                "field_name": "cnpj",
                "field_value": cnpj,
                "confidence": 0.8,
                "page_number": None
            })
        
        # Datas (padrão brasileiro DD/MM/YYYY)
        date_pattern = r'\b(\d{2}/\d{2}/\d{4})\b'
        dates = re.findall(date_pattern, text)
        for date in dates:
            fields.append({
                "field_name": "date",
                "field_value": date,
                "confidence": 0.7,
                "page_number": None
            })
        
        # Email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        for email in emails:
            fields.append({
                "field_name": "email",
                "field_value": email,
                "confidence": 0.9,
                "page_number": None
            })
        
        # Telefone
        phone_pattern = r'\b(\(\d{2}\)\s?\d{4,5}-\d{4})\b'
        phones = re.findall(phone_pattern, text)
        for phone in phones:
            fields.append({
                "field_name": "phone",
                "field_value": phone,
                "confidence": 0.8,
                "page_number": None
            })
        
        # CEP
        cep_pattern = r'\b(\d{5}-\d{3})\b'
        ceps = re.findall(cep_pattern, text)
        for cep in ceps:
            fields.append({
                "field_name": "cep",
                "field_value": cep,
                "confidence": 0.8,
                "page_number": None
            })
        
        # Valores monetários
        money_pattern = r'R\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2}))'
        money_values = re.findall(money_pattern, text)
        for value in money_values:
            fields.append({
                "field_name": "monetary_value",
                "field_value": f"R$ {value}",
                "confidence": 0.7,
                "page_number": None
            })
        
        return fields
    
    @staticmethod
    def _extract_invoice_fields(text: str) -> List[Dict[str, Any]]:
        """
        Extrai campos específicos de notas fiscais.
        
        Args:
            text: Texto do documento
            
        Returns:
            Lista de campos extraídos
        """
        fields = []
        
        # Número da nota fiscal
        nf_pattern = r'(?:N(?:ota|F)(?:\s+)?(?:F(?:iscal)?)?(?:\s+)(?:n[°º\.])?(?:\s+)?[:;]?\s*)(\d+)'
        nf_matches = re.findall(nf_pattern, text, re.IGNORECASE)
        if nf_matches:
            fields.append({
                "field_name": "invoice_number",
                "field_value": nf_matches[0],
                "confidence": 0.7,
                "page_number": None
            })
        
        # Data de emissão
        date_pattern = r'(?:Data\s+(?:de\s+)?emiss(?:ã|a)o\s*[:;]?\s*)(\d{2}/\d{2}/\d{4})'
        date_matches = re.findall(date_pattern, text, re.IGNORECASE)
        if date_matches:
            fields.append({
                "field_name": "issue_date",
                "field_value": date_matches[0],
                "confidence": 0.8,
                "page_number": None
            })
        
        # Valor total
        total_pattern = r'(?:Valor\s+(?:total|final)(?:\s+da\s+nota)?(?:\s*[:;]\s*))(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2}))'
        total_matches = re.findall(total_pattern, text, re.IGNORECASE)
        if total_matches:
            fields.append({
                "field_name": "total_value",
                "field_value": f"R$ {total_matches[0]}",
                "confidence": 0.8,
                "page_number": None
            })
        
        return fields
    
    @staticmethod
    def _extract_contract_fields(text: str) -> List[Dict[str, Any]]:
        """
        Extrai campos específicos de contratos.
        
        Args:
            text: Texto do documento
            
        Returns:
            Lista de campos extraídos
        """
        fields = []
        
        # Número do contrato
        contract_number_pattern = r'(?:Contrato\s+(?:n[°º\.])?(?:\s+)?[:;]?\s*)(\d+[-/]\d+)'
        contract_matches = re.findall(contract_number_pattern, text, re.IGNORECASE)
        if contract_matches:
            fields.append({
                "field_name": "contract_number",
                "field_value": contract_matches[0],
                "confidence": 0.8,
                "page_number": None
            })
        
        # Partes do contrato (contratante/contratado)
        contracting_pattern = r'(?:Contratante(?:\s*[:;]\s*))(?:\s*)([^,;\n\.]+'
        contracting_matches = re.findall(contracting_pattern, text, re.IGNORECASE)
        if contracting_matches:
            fields.append({
                "field_name": "contracting_party",
                "field_value": contracting_matches[0].strip(),
                "confidence": 0.6,
                "page_number": None
            })
        
        contracted_pattern = r'(?:Contratad[oa](?:\s*[:;]\s*))(?:\s*)([^,;\n\.]+'
        contracted_matches = re.findall(contracted_pattern, text, re.IGNORECASE)
        if contracted_matches:
            fields.append({
                "field_name": "contracted_party",
                "field_value": contracted_matches[0].strip(),
                "confidence": 0.6,
                "page_number": None
            })
        
        # Data de início
        start_date_pattern = r'(?:(?:data|prazo)(?:\s+)(?:de|do)(?:\s+)(?:início|vigência)(?:\s*[:;]\s*))(\d{2}/\d{2}/\d{4})'
        start_date_matches = re.findall(start_date_pattern, text, re.IGNORECASE)
        if start_date_matches:
            fields.append({
                "field_name": "start_date",
                "field_value": start_date_matches[0],
                "confidence": 0.7,
                "page_number": None
            })
        
        # Data de término
        end_date_pattern = r'(?:(?:data|prazo)(?:\s+)(?:de|do)(?:\s+)(?:término|encerramento|fim)(?:\s*[:;]\s*))(\d{2}/\d{2}/\d{4})'
        end_date_matches = re.findall(end_date_pattern, text, re.IGNORECASE)
        if end_date_matches:
            fields.append({
                "field_name": "end_date",
                "field_value": end_date_matches[0],
                "confidence": 0.7,
                "page_number": None
            })
        
        # Valor do contrato
        value_pattern = r'(?:Valor(?:\s+)(?:do|de)(?:\s+)(?:contrato|global)(?:\s*[:;]\s*))(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2}))'
        value_matches = re.findall(value_pattern, text, re.IGNORECASE)
        if value_matches:
            fields.append({
                "field_name": "contract_value",
                "field_value": f"R$ {value_matches[0]}",
                "confidence": 0.8,
                "page_number": None
            })
        
        return fields
    
    @staticmethod
    def _extract_procurement_fields(text: str) -> List[Dict[str, Any]]:
        """
        Extrai campos específicos de documentos de licitação.
        
        Args:
            text: Texto do documento
            
        Returns:
            Lista de campos extraídos
        """
        fields = []
        
        # Número do processo licitatório
        process_number_pattern = r'(?:Processo(?:\s+)(?:n[°º\.])?(?:\s+)?(?:de\s+)?(?:licita[çc][ãa]o)?(?:\s*[:;]\s*))(\d+[-/.]\d+)'
        process_matches = re.findall(process_number_pattern, text, re.IGNORECASE)
        if process_matches:
            fields.append({
                "field_name": "procurement_process_number",
                "field_value": process_matches[0],
                "confidence": 0.7,
                "page_number": None
            })
        
        # Modalidade de licitação
        modality_pattern = r'(?:Modalidade(?:\s*[:;]\s*))([A-Za-zÀ-ÿ\s]+)(?=[\n,;.])'
        modality_matches = re.findall(modality_pattern, text, re.IGNORECASE)
        if modality_matches:
            fields.append({
                "field_name": "procurement_modality",
                "field_value": modality_matches[0].strip(),
                "confidence": 0.7,
                "page_number": None
            })
        
        # Órgão responsável
        agency_pattern = r'(?:(?:Órgão|Entidade)(?:\s+)(?:responsável|licitante|gerenciador)(?:\s*[:;]\s*))([A-Za-zÀ-ÿ\s]+)(?=[\n,;.])'
        agency_matches = re.findall(agency_pattern, text, re.IGNORECASE)
        if agency_matches:
            fields.append({
                "field_name": "procurement_agency",
                "field_value": agency_matches[0].strip(),
                "confidence": 0.6,
                "page_number": None
            })
        
        # Data de abertura
        opening_date_pattern = r'(?:Data(?:\s+)(?:de|da)(?:\s+)(?:abertura|sessão)(?:\s*[:;]\s*))(\d{2}/\d{2}/\d{4})'
        opening_date_matches = re.findall(opening_date_pattern, text, re.IGNORECASE)
        if opening_date_matches:
            fields.append({
                "field_name": "opening_date",
                "field_value": opening_date_matches[0],
                "confidence": 0.7,
                "page_number": None
            })
        
        # Objeto da licitação
        object_pattern = r'(?:Objeto(?:\s*[:;]\s*))([^.;]+)'
        object_matches = re.findall(object_pattern, text, re.IGNORECASE)
        if object_matches:
            fields.append({
                "field_name": "procurement_object",
                "field_value": object_matches[0].strip(),
                "confidence": 0.6,
                "page_number": None
            })
        
        return fields
    
    @staticmethod
    def extract_fields_from_structured_data(structured_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extrai campos de dados estruturados (Excel, CSV).
        
        Args:
            structured_data: Dados estruturados do documento
            
        Returns:
            Lista de campos extraídos
        """
        fields = []
        
        if not structured_data:
            return fields
        
        for sheet_idx, sheet_data in enumerate(structured_data):
            headers = sheet_data.get("headers", [])
            rows = sheet_data.get("rows", [])
            sheet_name = sheet_data.get("sheet_name", f"Sheet{sheet_idx+1}")
            
            # Campo para o nome da planilha
            fields.append({
                "field_name": f"sheet_name_{sheet_idx+1}",
                "field_value": sheet_name,
                "confidence": 1.0,
                "page_number": None
            })
            
            # Campo para o número de linhas
            fields.append({
                "field_name": f"row_count_{sheet_idx+1}",
                "field_value": str(len(rows)),
                "confidence": 1.0,
                "page_number": None
            })
            
            # Identifica possíveis cabeçalhos importantes
            for header in headers:
                header_str = str(header).lower()
                
                # Cabeçalhos relacionados a valores
                if any(term in header_str for term in ["valor", "preço", "total", "custo"]):
                    # Tenta encontrar o valor total (última linha, assumindo somátório)
                    if rows:
                        try:
                            value = rows[-1].get(header, "")
                            if value:
                                fields.append({
                                    "field_name": f"value_{header}",
                                    "field_value": str(value),
                                    "confidence": 0.7,
                                    "page_number": None
                                })
                        except Exception:
                            pass
                
                # Cabeçalhos relacionados a datas
                if any(term in header_str for term in ["data", "date", "prazo", "vencimento"]):
                    # Pega a primeira data encontrada
                    for row in rows:
                        try:
                            value = row.get(header, "")
                            if value:
                                fields.append({
                                    "field_name": f"date_{header}",
                                    "field_value": str(value),
                                    "confidence": 0.7,
                                    "page_number": None
                                })
                                break
                        except Exception:
                            pass
                
                # Cabeçalhos relacionados a documentos fiscais
                if any(term in header_str for term in ["nota", "nf", "invoice", "fiscal"]):
                    # Pega o primeiro valor encontrado
                    for row in rows:
                        try:
                            value = row.get(header, "")
                            if value:
                                fields.append({
                                    "field_name": f"doc_{header}",
                                    "field_value": str(value),
                                    "confidence": 0.7,
                                    "page_number": None
                                })
                                break
                        except Exception:
                            pass
            
            # Se tiver menos de 10 linhas, adiciona todas as células como campos
            if len(rows) < 10:
                for i, row in enumerate(rows):
                    for header in headers:
                        try:
                            value = row.get(header, "")
                            if value:
                                fields.append({
                                    "field_name": f"cell_{sheet_name}_{i+1}_{header}",
                                    "field_value": str(value),
                                    "confidence": 0.5,
                                    "page_number": None
                                })
                        except Exception:
                            pass
        
        return fields
