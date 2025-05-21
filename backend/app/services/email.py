"""
Serviço para envio de emails.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List

from app.core.config import settings


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None
) -> bool:
    """
    Envia um email usando o servidor SMTP configurado.
    """
    # Se estamos em modo de teste ou desenvolvimento e sem servidor SMTP configurado
    if not settings.SMTP_HOST or not settings.SMTP_PORT:
        print(f"Email would be sent to {to_email}: {subject}")
        print(f"Content: {html_content}")
        return True

    # Configuração do email
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = settings.EMAILS_FROM_EMAIL
    msg['To'] = to_email
    
    if cc:
        msg['Cc'] = ", ".join(cc)
    if bcc:
        msg['Bcc'] = ", ".join(bcc)
    
    # Adiciona conteúdo texto simples, se fornecido
    if text_content:
        part1 = MIMEText(text_content, 'plain')
        msg.attach(part1)
    
    # Adiciona conteúdo HTML
    part2 = MIMEText(html_content, 'html')
    msg.attach(part2)
    
    try:
        # Conecta ao servidor SMTP
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.ehlo()
        
        # Inicia TLS para segurança, se disponível
        if settings.SMTP_TLS:
            server.starttls()
            server.ehlo()
        
        # Login, se configurado
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        
        # Preparação de destinatários
        recipients = [to_email]
        if cc:
            recipients.extend(cc)
        if bcc:
            recipients.extend(bcc)
        
        # Envio do email
        server.sendmail(settings.EMAILS_FROM_EMAIL, recipients, msg.as_string())
        
        # Encerra a conexão
        server.quit()
        
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def send_password_reset_email(email: str, token: str) -> bool:
    """
    Envia um email de recuperação de senha.
    """
    # Gera a URL de redefinição de senha
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    # Prepara o conteúdo do email
    subject = f"Redefinição de senha para {settings.PROJECT_NAME}"
    
    html_content = f"""
    <h2>Redefinição de senha</h2>
    <p>Olá,</p>
    <p>Você solicitou uma redefinição de senha para sua conta no {settings.PROJECT_NAME}.</p>
    <p>Clique no botão abaixo para redefinir sua senha:</p>
    <p><a href="{reset_url}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Redefinir Senha</a></p>
    <p>Ou copie e cole o seguinte link em seu navegador:</p>
    <p>{reset_url}</p>
    <p>Este link é válido por 1 hora.</p>
    <p>Se você não solicitou esta redefinição, ignore este email.</p>
    <p>Atenciosamente,<br>Equipe {settings.PROJECT_NAME}</p>
    """
    
    text_content = f"""
    Redefinição de senha

    Olá,

    Você solicitou uma redefinição de senha para sua conta no {settings.PROJECT_NAME}.

    Acesse o seguinte link para redefinir sua senha:
    {reset_url}

    Este link é válido por 1 hora.

    Se você não solicitou esta redefinição, ignore este email.

    Atenciosamente,
    Equipe {settings.PROJECT_NAME}
    """
    
    return send_email(email, subject, html_content, text_content)


def send_verification_email(email: str, token: str) -> bool:
    """
    Envia um email de verificação de conta.
    """
    # Gera a URL de verificação
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    
    # Prepara o conteúdo do email
    subject = f"Verificação de conta para {settings.PROJECT_NAME}"
    
    html_content = f"""
    <h2>Verificação de conta</h2>
    <p>Olá,</p>
    <p>Obrigado por se registrar no {settings.PROJECT_NAME}.</p>
    <p>Clique no botão abaixo para verificar seu endereço de email:</p>
    <p><a href="{verify_url}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verificar Email</a></p>
    <p>Ou copie e cole o seguinte link em seu navegador:</p>
    <p>{verify_url}</p>
    <p>Este link é válido por 24 horas.</p>
    <p>Atenciosamente,<br>Equipe {settings.PROJECT_NAME}</p>
    """
    
    text_content = f"""
    Verificação de conta

    Olá,

    Obrigado por se registrar no {settings.PROJECT_NAME}.

    Acesse o seguinte link para verificar seu endereço de email:
    {verify_url}

    Este link é válido por 24 horas.

    Atenciosamente,
    Equipe {settings.PROJECT_NAME}
    """
    
    return send_email(email, subject, html_content, text_content)


def send_welcome_email(email: str, username: str) -> bool:
    """
    Envia um email de boas-vindas após verificação da conta.
    """
    # Prepara o conteúdo do email
    subject = f"Bem-vindo ao {settings.PROJECT_NAME}"
    
    html_content = f"""
    <h2>Bem-vindo ao {settings.PROJECT_NAME}!</h2>
    <p>Olá {username},</p>
    <p>Sua conta foi verificada com sucesso. Agora você tem acesso completo a todas as funcionalidades do sistema.</p>
    <p>Para acessar sua conta, <a href="{settings.FRONTEND_URL}/login">clique aqui</a>.</p>
    <p>Atenciosamente,<br>Equipe {settings.PROJECT_NAME}</p>
    """
    
    text_content = f"""
    Bem-vindo ao {settings.PROJECT_NAME}!

    Olá {username},

    Sua conta foi verificada com sucesso. Agora você tem acesso completo a todas as funcionalidades do sistema.

    Para acessar sua conta, visite: {settings.FRONTEND_URL}/login

    Atenciosamente,
    Equipe {settings.PROJECT_NAME}
    """
    
    return send_email(email, subject, html_content, text_content)
