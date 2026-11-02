import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple, Optional

from app.config import Config

logger = logging.getLogger('myalumni.email')


class EmailService:
    @classmethod
    def send_otp_email(cls, to_email: str, otp: str, purpose: str = "registration", user_name: Optional[str] = None) -> bool:
        """
        Sends a 6-digit OTP email using configured SMTP settings.
        If SMTP is offline or unavailable in local dev, logs clearly to console without crashing.
        """
        user_display = user_name or to_email.split('@')[0]
        purpose_titles = {
            "registration": "Verify Your Email Address",
            "forgot_password": "Password Reset Verification Code",
            "test_user_login": "Test Account Login Verification Code"
        }
        purpose_descriptions = {
            "registration": "Thank you for registering with MyAlumni. Please enter the following 6-digit verification code to complete your registration and activate your account:",
            "forgot_password": "We received a request to reset your MyAlumni account password. Use the 6-digit code below to proceed with resetting your password:",
            "test_user_login": "Use the following 6-digit one-time passcode to securely log in to your MyAlumni test account:"
        }

        subject = f"MyAlumni Security: {purpose_titles.get(purpose, 'Verification Code')}"
        title = purpose_titles.get(purpose, "Verification Code")
        description = purpose_descriptions.get(purpose, "Your 6-digit verification code:")

        text_content = f"""Hello {user_display},

{description}

Verification Code: {otp}

This code will expire in {Config.OTP_EXPIRY_MINUTES} minutes.
If you did not make this request, please disregard this email.

Best regards,
MyAlumni Security Team"""

        html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b1120; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 560px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 36px 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #38bdf8;">MYALUMNI <span style="font-size: 14px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 8px; border-radius: 9999px;">2.0</span></span>
            </td>
          </tr>
          <tr>
            <td style="color: #f1f5f9; font-size: 18px; font-weight: 600; padding-bottom: 12px;">{title}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; font-size: 14px; line-height: 1.6; padding-bottom: 24px;">
              Hello <strong style="color: #e2e8f0;">{user_display}</strong>,<br><br>
              {description}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 0 28px 0;">
              <div style="background-color: #030712; border: 1px solid #334155; border-radius: 12px; padding: 18px 36px; display: inline-block;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; font-family: monospace;">{otp}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 13px; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 20px;">
              ⏳ Valid for <strong>{Config.OTP_EXPIRY_MINUTES} minutes</strong>. Do not share this code with anyone.<br>
              If you did not request this, no action is needed and your account remains secure.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        # Log OTP securely — never expose OTP in production logs
        if Config.APP_ENV == 'development' and Config.DEBUG:
            logger.info(f"🔑 [DEV OTP] Recipient: {to_email} | Purpose: {purpose} | Code: {otp}")
        else:
            logger.info(f"🔑 [OTP DISPATCH] Recipient: {to_email} | Purpose: {purpose} | Code: [SECURELY_DISPATCHED]")

        success, err = cls.send_smtp_email(to_email, subject, html_content, text_content)
        if not success:
            if Config.APP_ENV == 'development' and Config.DEBUG:
                logger.info(f"ℹ️ [DEV OTP FALLBACK] SMTP notice: {err}. Code {otp} is staged and ready for verification.")
            else:
                logger.warning(f"ℹ️ [OTP DISPATCH] Delivery failed for {to_email}: {err}")
            return False, err
        return True, None

    @staticmethod
    def send_smtp_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        """
        Sends an email using configured SMTP settings.
        Returns (success: bool, error_message: Optional[str]).
        Honest failure reporting - never fakes success when credentials fail or are missing.
        """
        if not Config.SMTP_USERNAME or not Config.SMTP_PASSWORD:
            msg = "SMTP not configured: Missing SMTP_USERNAME or SMTP_PASSWORD in backend environment."
            logger.warning(msg)
            return False, msg

        if not Config.SMTP_HOST:
            msg = "SMTP not configured: Missing SMTP_HOST."
            logger.warning(msg)
            return False, msg

        try:
            from_addr = Config.SMTP_FROM_EMAIL or Config.SMTP_USERNAME

            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"MyAlumni Portal <{from_addr}>"
            msg['To'] = to_email

            if text_body:
                msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))

            if Config.SMTP_PORT == 465:
                # SSL
                with smtplib.SMTP_SSL(Config.SMTP_HOST, Config.SMTP_PORT, timeout=10) as server:
                    server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)
                    server.sendmail(from_addr, [to_email], msg.as_string())
            else:
                # TLS / STARTTLS
                with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=10) as server:
                    server.ehlo()
                    if Config.SMTP_USE_TLS:
                        server.starttls()
                        server.ehlo()
                    server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)
                    server.sendmail(from_addr, [to_email], msg.as_string())

            logger.info(f"Successfully sent email to {to_email} with subject '{subject}'")
            return True, None

        except smtplib.SMTPAuthenticationError as e:
            err = f"SMTP Authentication failed for user '{Config.SMTP_USERNAME}'. Google returned 535 Bad Credentials. Please verify your Google Account has 2-Step Verification ON and create a fresh 16-character App Password at https://myaccount.google.com/apppasswords. Error: {str(e)}"
            logger.error(err)
            return False, err
        except smtplib.SMTPServerDisconnected as e:
            err = f"SMTP Server disconnected during authentication. For Gmail, this indicates Google rejected the credentials (535 Bad Credentials). Error: {str(e)}"
            logger.error(err)
            return False, err
        except smtplib.SMTPConnectError as e:
            err = f"Failed to connect to SMTP host '{Config.SMTP_HOST}:{Config.SMTP_PORT}': {str(e)}"
            logger.error(err)
            return False, err
        except Exception as e:
            err = f"SMTP dispatch error: {str(e)}"
            logger.error(err, exc_info=True)
            return False, err

    @classmethod
    def send_welcome_email(cls, to_email: str, display_name: str, role: str) -> Tuple[bool, Optional[str]]:
        subject = f"Welcome to MyAlumni 2.0, {display_name}!"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
            <div style="background-color: #0a192f; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">MyAlumni 2.0</h1>
                <p style="color: #14b8a6; margin: 5px 0 0; font-size: 14px;">Smart Alumni & Student Career Networking Portal</p>
            </div>
            <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
                <h2>Welcome, {display_name}!</h2>
                <p>Your MyAlumni account has been successfully provisioned with the role: <strong>{role.title()}</strong>.</p>
                <p>With MyAlumni 2.0, you can:</p>
                <ul>
                    <li>Connect and network with verified alumni and students</li>
                    <li>Participate in 1-on-1 career mentorship</li>
                    <li>Discover curated jobs, internships, and referral opportunities</li>
                    <li>Access academic resources and batch reunions</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{Config.FRONTEND_URL}/#/dashboard" style="background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Go to My Dashboard</a>
                </div>
                <p style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    This is an automated notification from MyAlumni Portal. Please do not reply directly to this email.
                </p>
            </div>
        </div>
        """
        return cls.send_smtp_email(to_email, subject, html)

    @classmethod
    def send_contact_admin_notification(cls, admin_email: str, ticket_id: str, requester_name: str, subject: str, message: str) -> Tuple[bool, Optional[str]]:
        mail_subject = f"[MyAlumni Support] New Contact Request #{ticket_id[:8]}: {subject}"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
            <div style="background-color: #0a192f; padding: 20px; text-align: center; color: white;">
                <h2 style="margin: 0;">New Support Ticket Received</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #e2e8f0; background: white;">
                <p><strong>From:</strong> {requester_name}</p>
                <p><strong>Subject:</strong> {subject}</p>
                <p><strong>Message:</strong></p>
                <blockquote style="background: #f8fafc; border-left: 4px solid #0d9488; padding: 12px; margin: 10px 0;">{message}</blockquote>
                <p><a href="{Config.FRONTEND_URL}/#/admin/tickets" style="color: #0d9488;">View Ticket in Admin Console</a></p>
            </div>
        </div>
        """
        return cls.send_smtp_email(admin_email, mail_subject, html)

    @classmethod
    def send_contact_admin_response(cls, to_email: str, ticket_subject: str, admin_reply: str) -> Tuple[bool, Optional[str]]:
        mail_subject = f"[MyAlumni Support] Update on your ticket: {ticket_subject}"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
            <div style="background-color: #0a192f; padding: 20px; text-align: center; color: white;">
                <h2 style="margin: 0;">Administrator Response</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #e2e8f0; background: white;">
                <p>Your support ticket <em>"{ticket_subject}"</em> has been responded to by an administrator:</p>
                <blockquote style="background: #f8fafc; border-left: 4px solid #10b981; padding: 12px; margin: 15px 0;">{admin_reply}</blockquote>
                <p><a href="{Config.FRONTEND_URL}/#/contact-admin" style="color: #0d9488;">View Ticket Status in MyAlumni</a></p>
            </div>
        </div>
        """
        return cls.send_smtp_email(to_email, mail_subject, html)

    @classmethod
    def send_birthday_greeting_email(cls, to_email: str, recipient_name: str, sender_name: str, greeting_text: str) -> Tuple[bool, Optional[str]]:
        mail_subject = f"[MyAlumni Celebrations] {sender_name} sent you a birthday wish!"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
            <div style="background: linear-gradient(135deg, #0a192f 0%, #1e1b4b 100%); padding: 24px; text-align: center; color: white;">
                <h2 style="margin: 0; color: #f59e0b;">🎉 Happy Birthday, {recipient_name}!</h2>
            </div>
            <div style="padding: 24px; border: 1px solid #e2e8f0; background: white;">
                <p style="font-size: 15px;">Your peer <strong>{sender_name}</strong> sent you a birthday greeting through the Alumni Celebration Hub:</p>
                <blockquote style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px; margin: 16px 0; font-size: 14.5px; color: #78350f;">
                    "{greeting_text}"
                </blockquote>
                <p><a href="{Config.FRONTEND_URL}/#/birthdays" style="display: inline-block; background: #f59e0b; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Birthday Corner</a></p>
            </div>
        </div>
        """
        return cls.send_smtp_email(to_email, mail_subject, html)

