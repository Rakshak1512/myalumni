# MyAlumni 2.0 — SMTP Configuration Guide

MyAlumni 2.0 uses **SMTP** for application-controlled system notifications:
- Welcome onboarding emails for newly registered users
- Support ticket confirmations and administrator reply dispatches
- Mentorship acceptance notifications
- Event updates and administrative broadcasts

---

## 1. Gmail App Password Setup (Recommended for Development)

Standard Gmail accounts with 2-Factor Authentication (2FA) require an **App Password** rather than your regular Google account password.

### Step-by-Step Instructions:
1. Log into your Google Account at [myaccount.google.com](https://myaccount.google.com/).
2. Select **Security** from the left navigation panel.
3. Under *How you sign in to Google*, ensure **2-Step Verification** is turned **ON**.
4. Scroll to **2-Step Verification** and click through to the bottom to find **App passwords**.
5. In the *App name* field, enter `MyAlumni Portal`.
6. Click **Create**.
7. Google will display a 16-character passcode (e.g., `abcd efgh ijkl mnop`).
8. Copy this 16-character passcode without spaces into `backend/.env`.

---

## 2. Backend Environment Settings

Open `backend/.env` and update the SMTP fields:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_university_email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
SMTP_FROM_EMAIL=your_university_email@gmail.com
SMTP_USE_TLS=true
```

---

## 3. Alternative SMTP Providers

You may also configure any standard SMTP provider:

### SendGrid:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your_sendgrid_api_key
SMTP_FROM_EMAIL=verified_sender@domain.com
SMTP_USE_TLS=true
```

### Amazon SES:
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your_ses_smtp_user
SMTP_PASSWORD=your_ses_smtp_password
SMTP_FROM_EMAIL=noreply@youruniversity.edu
SMTP_USE_TLS=true
```

---

## 4. Honest Failure Handling

The MyAlumni 2.0 backend (`app/services/email_service.py`) follows strict operational guidelines:
- If SMTP credentials are not configured or connection fails, the error is recorded in server logs and returned to the caller.
- The system **never** marks an undelivered email as sent.
- Primary database operations (such as saving ticket responses or provisioning users) remain consistent even if the email relay encounters a temporary network timeout.

