"""
Utilitários para trabalhar com datas e períodos.
"""
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, Tuple, Optional


class PeriodType(str, Enum):
    """Tipos de períodos predefinidos."""
    TODAY = "today"
    YESTERDAY = "yesterday"
    THIS_WEEK = "this_week"
    LAST_WEEK = "last_week"
    THIS_MONTH = "this_month"
    LAST_MONTH = "last_month"
    THIS_QUARTER = "this_quarter"
    LAST_QUARTER = "last_quarter"
    THIS_YEAR = "this_year"
    LAST_YEAR = "last_year"
    LAST_7_DAYS = "last_7_days"
    LAST_30_DAYS = "last_30_days"
    LAST_90_DAYS = "last_90_days"
    LAST_180_DAYS = "last_180_days"
    LAST_365_DAYS = "last_365_days"
    ALL_TIME = "all_time"


def get_date_range(period_type: PeriodType, base_date: Optional[datetime] = None) -> Tuple[datetime, datetime]:
    """
    Retorna o intervalo de datas para um período específico.
    
    Args:
        period_type: Tipo de período predefinido
        base_date: Data base para cálculo (padrão: data atual)
        
    Returns:
        Tupla (data_inicio, data_fim) do período
    """
    base_date = base_date or datetime.utcnow()
    base_date = datetime(base_date.year, base_date.month, base_date.day, 0, 0, 0)  # Normaliza para início do dia
    
    if period_type == PeriodType.TODAY:
        return base_date, base_date + timedelta(days=1, microseconds=-1)
        
    elif period_type == PeriodType.YESTERDAY:
        yesterday = base_date - timedelta(days=1)
        return yesterday, yesterday + timedelta(days=1, microseconds=-1)
        
    elif period_type == PeriodType.THIS_WEEK:
        # Considera semana começando na segunda (0 = segunda, 6 = domingo)
        week_day = base_date.weekday()
        week_start = base_date - timedelta(days=week_day)
        return week_start, week_start + timedelta(days=7, microseconds=-1)
        
    elif period_type == PeriodType.LAST_WEEK:
        week_day = base_date.weekday()
        last_week_start = base_date - timedelta(days=week_day + 7)
        return last_week_start, last_week_start + timedelta(days=7, microseconds=-1)
        
    elif period_type == PeriodType.THIS_MONTH:
        month_start = datetime(base_date.year, base_date.month, 1)
        if base_date.month == 12:
            next_month = datetime(base_date.year + 1, 1, 1)
        else:
            next_month = datetime(base_date.year, base_date.month + 1, 1)
        return month_start, next_month - timedelta(microseconds=1)
        
    elif period_type == PeriodType.LAST_MONTH:
        if base_date.month == 1:
            last_month_start = datetime(base_date.year - 1, 12, 1)
            this_month_start = datetime(base_date.year, 1, 1)
        else:
            last_month_start = datetime(base_date.year, base_date.month - 1, 1)
            this_month_start = datetime(base_date.year, base_date.month, 1)
        return last_month_start, this_month_start - timedelta(microseconds=1)
        
    elif period_type == PeriodType.THIS_QUARTER:
        quarter = (base_date.month - 1) // 3 + 1
        quarter_start = datetime(base_date.year, 3 * quarter - 2, 1)
        if quarter == 4:
            next_quarter = datetime(base_date.year + 1, 1, 1)
        else:
            next_quarter = datetime(base_date.year, 3 * quarter + 1, 1)
        return quarter_start, next_quarter - timedelta(microseconds=1)
        
    elif period_type == PeriodType.LAST_QUARTER:
        quarter = (base_date.month - 1) // 3 + 1
        if quarter == 1:
            last_quarter_start = datetime(base_date.year - 1, 10, 1)
            this_quarter_start = datetime(base_date.year, 1, 1)
        else:
            last_quarter_start = datetime(base_date.year, 3 * (quarter - 1) - 2, 1)
            this_quarter_start = datetime(base_date.year, 3 * quarter - 2, 1)
        return last_quarter_start, this_quarter_start - timedelta(microseconds=1)
        
    elif period_type == PeriodType.THIS_YEAR:
        year_start = datetime(base_date.year, 1, 1)
        next_year = datetime(base_date.year + 1, 1, 1)
        return year_start, next_year - timedelta(microseconds=1)
        
    elif period_type == PeriodType.LAST_YEAR:
        last_year_start = datetime(base_date.year - 1, 1, 1)
        this_year_start = datetime(base_date.year, 1, 1)
        return last_year_start, this_year_start - timedelta(microseconds=1)
        
    elif period_type == PeriodType.LAST_7_DAYS:
        end_date = base_date + timedelta(days=1, microseconds=-1)  # Fim do dia atual
        start_date = base_date - timedelta(days=6)  # 7 dias incluindo hoje
        return start_date, end_date
        
    elif period_type == PeriodType.LAST_30_DAYS:
        end_date = base_date + timedelta(days=1, microseconds=-1)
        start_date = base_date - timedelta(days=29)
        return start_date, end_date
        
    elif period_type == PeriodType.LAST_90_DAYS:
        end_date = base_date + timedelta(days=1, microseconds=-1)
        start_date = base_date - timedelta(days=89)
        return start_date, end_date
        
    elif period_type == PeriodType.LAST_180_DAYS:
        end_date = base_date + timedelta(days=1, microseconds=-1)
        start_date = base_date - timedelta(days=179)
        return start_date, end_date
        
    elif period_type == PeriodType.LAST_365_DAYS:
        end_date = base_date + timedelta(days=1, microseconds=-1)
        start_date = base_date - timedelta(days=364)
        return start_date, end_date
        
    elif period_type == PeriodType.ALL_TIME:
        # Um intervalo bem grande para cobrir "todos os tempos"
        return datetime(2000, 1, 1), base_date + timedelta(days=1, microseconds=-1)
        
    # Caso padrão (não deveria acontecer)
    return base_date - timedelta(days=30), base_date


def format_period_label(period_type: PeriodType, dates: Tuple[datetime, datetime]) -> str:
    """
    Formata um rótulo amigável para o período.
    
    Args:
        period_type: Tipo do período
        dates: Tupla (start_date, end_date)
        
    Returns:
        Rótulo formatado do período
    """
    start_date, end_date = dates
    
    if period_type == PeriodType.TODAY:
        return f"Hoje ({start_date.strftime('%d/%m/%Y')})"
        
    elif period_type == PeriodType.YESTERDAY:
        return f"Ontem ({start_date.strftime('%d/%m/%Y')})"
        
    elif period_type == PeriodType.THIS_WEEK:
        return f"Esta Semana ({start_date.strftime('%d/%m')} - {end_date.strftime('%d/%m/%Y')})"
        
    elif period_type == PeriodType.LAST_WEEK:
        return f"Semana Passada ({start_date.strftime('%d/%m')} - {end_date.strftime('%d/%m/%Y')})"
        
    elif period_type == PeriodType.THIS_MONTH:
        return f"{start_date.strftime('%B %Y').capitalize()}"
        
    elif period_type == PeriodType.LAST_MONTH:
        return f"{start_date.strftime('%B %Y').capitalize()}"
        
    elif period_type == PeriodType.THIS_QUARTER:
        quarter = (start_date.month - 1) // 3 + 1
        return f"{quarter}º Trimestre {start_date.year}"
        
    elif period_type == PeriodType.LAST_QUARTER:
        quarter = (start_date.month - 1) // 3 + 1
        return f"{quarter}º Trimestre {start_date.year}"
        
    elif period_type == PeriodType.THIS_YEAR:
        return f"{start_date.year}"
        
    elif period_type == PeriodType.LAST_YEAR:
        return f"{start_date.year}"
        
    elif period_type in (PeriodType.LAST_7_DAYS, PeriodType.LAST_30_DAYS, 
                        PeriodType.LAST_90_DAYS, PeriodType.LAST_180_DAYS, 
                        PeriodType.LAST_365_DAYS):
        return f"{period_type.value.replace('_', ' ').title()} ({start_date.strftime('%d/%m')} - {end_date.strftime('%d/%m/%Y')})"
        
    elif period_type == PeriodType.ALL_TIME:
        return "Todo o período"
        
    # Caso padrão para período personalizado
    return f"{start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}"
