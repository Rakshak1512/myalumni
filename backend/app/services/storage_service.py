"""
Universal Storage Service for MyAlumni 2.0.
Handles secure multi-format file validation, magic byte checking,
pluggable storage (Localhost Filesystem vs. Production Cloud Object Storage),
metadata persistence, and access-controlled file downloads.
"""

import os
import re
import uuid
import datetime
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
import requests
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage

from app.config import Config
from app.db import get_db

logger = logging.getLogger('myalumni.storage_service')

# Maximum Upload Limits (in bytes)
SIZE_LIMITS = {
    'avatars': 5 * 1024 * 1024,        # 5 MB
    'memories': 10 * 1024 * 1024,      # 10 MB
    'discussions': 8 * 1024 * 1024,    # 8 MB
    'events': 8 * 1024 * 1024,         # 8 MB
    'achievements': 15 * 1024 * 1024,   # 15 MB
    'resumes': 10 * 1024 * 1024,       # 10 MB
    'tickets': 10 * 1024 * 1024,       # 10 MB
    'resources': 50 * 1024 * 1024,     # 50 MB (configurable)
    'default': 25 * 1024 * 1024        # 25 MB
}

# Allowed file extensions per category
ALLOWED_EXTENSIONS = {
    'avatars': {'jpg', 'jpeg', 'png', 'webp', 'gif'},
    'memories': {'jpg', 'jpeg', 'png', 'webp'},
    'discussions': {'jpg', 'jpeg', 'png', 'webp', 'gif'},
    'events': {'jpg', 'jpeg', 'png', 'webp', 'pdf'},
    'achievements': {'pdf', 'jpg', 'jpeg', 'png', 'webp'},
    'resumes': {'pdf', 'docx', 'doc'},
    'tickets': {'jpg', 'jpeg', 'png', 'webp', 'pdf', 'txt', 'log'},
    'resources': {
        # Documents
        'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
        # Spreadsheets
        'xls', 'xlsx', 'csv', 'ods',
        # Presentations
        'ppt', 'pptx', 'odp',
        # Images
        'jpg', 'jpeg', 'png', 'webp', 'gif',
        # Videos
        'mp4', 'mov', 'avi', 'mkv', 'webm',
        # Audio
        'mp3', 'wav', 'm4a', 'aac', 'ogg',
        # Archives
        'zip', '7z'
    }
}

# Disallowed dangerous extensions across all categories
DANGEROUS_EXTENSIONS = {
    'exe', 'bat', 'cmd', 'ps1', 'sh', 'bash', 'vbs', 'js', 'mjs',
    'html', 'htm', 'php', 'phtml', 'py', 'rb', 'pl', 'cgi', 'jar',
    'com', 'scr', 'msi', 'reg', 'dll', 'so', 'dylib', 'apk'
}

# Magic bytes signatures for content validation
MAGIC_SIGNATURES = {
    'pdf': [b'%PDF-'],
    'jpg': [b'\xff\xd8\xff'],
    'jpeg': [b'\xff\xd8\xff'],
    'png': [b'\x89PNG\r\n\x1a\n'],
    'gif': [b'GIF87a', b'GIF89a'],
    'webp': [b'RIFF'],  # Offset 8 has 'WEBP'
    'zip': [b'PK\x03\x04'],
    'docx': [b'PK\x03\x04'],
    'xlsx': [b'PK\x03\x04'],
    'pptx': [b'PK\x03\x04'],
    'mp4': [b'ftyp'],  # Offset 4 has 'ftyp'
    'mov': [b'ftyp', b'moov'],
    'mp3': [b'ID3', b'\xff\xfb', b'\xff\xf3', b'\xff\xf2'],
    'wav': [b'RIFF'],  # Offset 8 has 'WAVE'
    'ogg': [b'OggS'],
}

# Known executable headers to reject unconditionally
EXECUTABLE_MAGIC = [
    b'MZ',          # Windows PE Executable / DLL
    b'\x7fELF',     # Linux ELF Executable
    b'\xfe\xed\xfa',# Mach-O binary
    b'\xcf\xfa\xed',# Mach-O 64-bit
    b'#!/bin/',     # Unix Shell Script
    b'<?php',       # PHP Script
    b'<script',     # Embedded HTML/JS
]


class SupabaseStorageDriver:
    """
    Production Cloud Object Storage Driver powered by Supabase Storage REST API.
    Provides direct binary uploads, CDN public URLs, short-lived signed URLs for private files,
    and asset deletion without requiring Supabase PostgreSQL database tables.
    """
    def __init__(
        self,
        url: Optional[str] = None,
        service_key: Optional[str] = None,
        public_bucket: Optional[str] = None,
        private_bucket: Optional[str] = None
    ):
        self._url = url
        self._service_key = service_key
        self._public_bucket = public_bucket
        self._private_bucket = private_bucket

    @property
    def url(self) -> str:
        return (self._url or Config.SUPABASE_URL or '').rstrip('/')

    @property
    def service_key(self) -> str:
        return self._service_key or Config.SUPABASE_SERVICE_KEY or ''

    @property
    def public_bucket(self) -> str:
        return self._public_bucket or Config.SUPABASE_PUBLIC_BUCKET or 'myalumni-public'

    @property
    def private_bucket(self) -> str:
        return self._private_bucket or Config.SUPABASE_PRIVATE_BUCKET or 'myalumni-private'

    def is_configured(self) -> bool:
        """Checks if required Supabase credentials and endpoint are present."""
        return bool(self.url and self.service_key)

    def _headers(self, content_type: Optional[str] = None) -> Dict[str, str]:
        headers = {
            'Authorization': f"Bearer {self.service_key}",
            'apikey': self.service_key
        }
        if content_type:
            headers['Content-Type'] = content_type
        return headers

    def get_bucket(self, is_private: bool) -> str:
        return self.private_bucket if is_private else self.public_bucket

    def upload_file(
        self,
        file_bytes: bytes,
        storage_path: str,
        mime_type: str,
        is_private: bool = False
    ) -> Dict[str, Any]:
        """
        Uploads binary file to Supabase Storage bucket.
        """
        if not self.is_configured():
            raise RuntimeError(
                "Supabase Cloud Storage is not configured. "
                "SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required."
            )

        bucket = self.get_bucket(is_private)
        endpoint = f"{self.url}/storage/v1/object/{bucket}/{storage_path}"
        headers = self._headers(mime_type)
        headers['x-upsert'] = 'true'

        try:
            res = requests.post(endpoint, data=file_bytes, headers=headers, timeout=60)
        except Exception as e:
            raise RuntimeError(f"Connection error uploading to Supabase Storage: {str(e)}")

        if res.status_code not in (200, 201):
            err_msg = res.text
            try:
                data = res.json()
                err_msg = data.get('message') or data.get('error') or err_msg
            except Exception:
                pass
            raise RuntimeError(f"Supabase Storage upload failed ({res.status_code}): {err_msg}")

        public_url = None
        if not is_private:
            public_url = f"{self.url}/storage/v1/object/public/{bucket}/{storage_path}"

        return {
            'bucket': bucket,
            'storage_path': storage_path,
            'public_url': public_url
        }

    def get_signed_url(self, bucket: str, storage_path: str, expires_in: int = 900) -> str:
        """
        Generates a secure, time-limited signed URL for private files (resumes, support tickets).
        """
        if not self.is_configured():
            raise RuntimeError("Supabase Cloud Storage is not configured.")

        endpoint = f"{self.url}/storage/v1/object/sign/{bucket}/{storage_path}"
        headers = self._headers('application/json')
        payload = {'expiresIn': int(expires_in)}

        try:
            res = requests.post(endpoint, json=payload, headers=headers, timeout=30)
        except Exception as e:
            raise RuntimeError(f"Connection error requesting Supabase signed URL: {str(e)}")

        if res.status_code != 200:
            err_msg = res.text
            try:
                data = res.json()
                err_msg = data.get('message') or data.get('error') or err_msg
            except Exception:
                pass
            raise RuntimeError(f"Failed to generate Supabase signed URL ({res.status_code}): {err_msg}")

        data = res.json()
        signed_path = data.get('signedURL') or data.get('signedUrl') or ''
        if not signed_path:
            raise RuntimeError("Supabase did not return a valid signedURL in response.")

        if signed_path.startswith('http://') or signed_path.startswith('https://'):
            return signed_path
        if signed_path.startswith('/storage/v1'):
            return f"{self.url}{signed_path}"
        if not signed_path.startswith('/'):
            signed_path = f"/{signed_path}"
        return f"{self.url}/storage/v1{signed_path}"

    def get_file_stream(self, bucket: str, storage_path: str) -> requests.Response:
        """
        Streams binary file content directly from Supabase Storage using service authentication.
        """
        if not self.is_configured():
            raise RuntimeError("Supabase Cloud Storage is not configured.")

        endpoint = f"{self.url}/storage/v1/object/authenticated/{bucket}/{storage_path}"
        headers = self._headers()
        res = requests.get(endpoint, headers=headers, stream=True, timeout=60)
        if res.status_code != 200:
            raise RuntimeError(f"Failed to stream file from Supabase Storage ({res.status_code})")
        return res

    def delete_file(self, bucket: str, storage_path: str) -> Tuple[bool, Optional[str]]:
        """
        Deletes an object from a Supabase Storage bucket.
        """
        if not self.is_configured():
            return False, "Supabase Storage is not configured."

        endpoint = f"{self.url}/storage/v1/object/{bucket}"
        headers = self._headers('application/json')
        payload = {'prefixes': [storage_path]}

        try:
            res = requests.delete(endpoint, json=payload, headers=headers, timeout=30)
            if res.status_code not in (200, 204):
                return False, f"Supabase delete failed ({res.status_code}): {res.text}"
            return True, None
        except Exception as e:
            return False, f"Error deleting file from Supabase: {str(e)}"


class StorageService:
    _supabase_driver: Optional[SupabaseStorageDriver] = None

    @classmethod
    def get_supabase_driver(cls) -> SupabaseStorageDriver:
        if cls._supabase_driver is None:
            cls._supabase_driver = SupabaseStorageDriver()
        return cls._supabase_driver

    @staticmethod
    def get_storage_root() -> Path:
        """Returns the base storage directory for local uploads."""
        env_root = os.getenv('STORAGE_ROOT')
        if env_root:
            p = Path(env_root)
        else:
            # Default to backend/static/uploads
            p = Path(__file__).resolve().parent.parent.parent / 'static' / 'uploads'
        p.mkdir(parents=True, exist_ok=True)
        return p

    @staticmethod
    def get_category_dir(category: str, is_private: bool = False) -> Path:
        """Returns category specific directory, ensuring it exists."""
        base = StorageService.get_storage_root()
        if is_private:
            cat_dir = base / 'private' / category
        else:
            cat_dir = base / category
        cat_dir.mkdir(parents=True, exist_ok=True)
        return cat_dir

    @classmethod
    def validate_file(cls, file: FileStorage, category: str) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validates filename, extension, size limit, and binary magic bytes.
        Returns: (is_valid, error_message, file_info)
        """
        if not file or not file.filename:
            return False, "No file provided or filename is empty.", {}

        filename = secure_filename(file.filename)
        if not filename:
            # In case secure_filename stripped everything (e.g. unicode only)
            ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
            filename = f"upload_{uuid.uuid4().hex[:8]}.{ext}"

        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        if not ext:
            return False, "File has no extension.", {}

        # 1. Check dangerous extensions
        if ext in DANGEROUS_EXTENSIONS:
            return False, f"Uploading executable or script files (.{ext}) is strictly prohibited for security.", {}

        # 2. Check category allowed extensions
        allowed = ALLOWED_EXTENSIONS.get(category, ALLOWED_EXTENSIONS['resources'])
        if ext not in allowed:
            return False, f"Invalid file format '.{ext}' for {category}. Allowed formats: {', '.join(sorted(allowed))}.", {}

        # 3. Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        max_size = SIZE_LIMITS.get(category, SIZE_LIMITS['default'])
        # Allow global override
        if Config.UPLOAD_MAX_SIZE_MB and category == 'resources':
            max_size = max(max_size, Config.UPLOAD_MAX_SIZE_MB * 1024 * 1024)

        if file_size <= 0:
            return False, "File is empty (0 bytes).", {}

        if file_size > max_size:
            max_mb = max_size // (1024 * 1024)
            actual_mb = round(file_size / (1024 * 1024), 2)
            return False, f"File size ({actual_mb} MB) exceeds maximum allowed limit of {max_mb} MB for {category}.", {}

        # 4. Binary Header / Magic Byte Validation
        header = file.read(32)
        file.seek(0)

        # Check for dangerous executable signatures
        for bad_sig in EXECUTABLE_MAGIC:
            if header.startswith(bad_sig) or (b'<' in header and bad_sig in header.lower()):
                return False, "Malicious or executable file signature detected. Upload rejected.", {}

        # Verify expected signature if known
        if ext in MAGIC_SIGNATURES:
            signatures = MAGIC_SIGNATURES[ext]
            matched = False
            for sig in signatures:
                if ext == 'webp':
                    # WebP has RIFF at 0 and WEBP at 8
                    if header.startswith(b'RIFF') and b'WEBP' in header[8:16]:
                        matched = True
                        break
                elif ext in ('mp4', 'mov'):
                    if header[4:8] == b'ftyp':
                        matched = True
                        break
                elif ext == 'wav':
                    if header.startswith(b'RIFF') and b'WAVE' in header[8:16]:
                        matched = True
                        break
                else:
                    if header.startswith(sig):
                        matched = True
                        break
            if not matched:
                return False, f"Corrupted or invalid {ext.upper()} file content header.", {}

        # Inferred MIME
        mime_type = file.content_type or 'application/octet-stream'

        file_info = {
            'original_filename': file.filename,
            'clean_filename': filename,
            'extension': ext,
            'size': file_size,
            'mime_type': mime_type
        }
        return True, None, file_info

    @classmethod
    def save_file(
        cls,
        file: FileStorage,
        category: str,
        uploader_id: str,
        uploader_role: Optional[str] = None,
        is_private: bool = False,
        related_module: Optional[str] = None,
        related_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validates, saves to local disk or Supabase Cloud Object Storage,
        and writes metadata record into file_attachments table.
        """
        is_valid, err_msg, info = cls.validate_file(file, category)
        if not is_valid:
            raise ValueError(err_msg)

        file_id = f"file_{uuid.uuid4().hex}"
        timestamp = int(datetime.datetime.now().timestamp())
        ext = info['extension']
        stored_filename = f"{category}_{uploader_id[:8]}_{timestamp}_{uuid.uuid4().hex[:6]}.{ext}"
        backend_url = Config.BACKEND_URL.rstrip('/')

        provider = Config.STORAGE_PROVIDER

        if provider == 'supabase':
            driver = cls.get_supabase_driver()
            if not driver.is_configured():
                raise RuntimeError(
                    "Cloud storage provider is configured as 'supabase', but SUPABASE_URL or "
                    "SUPABASE_SERVICE_KEY environment variables are missing."
                )

            file.seek(0)
            file_bytes = file.read()
            storage_path = f"{category}/{stored_filename}"

            upload_info = driver.upload_file(
                file_bytes=file_bytes,
                storage_path=storage_path,
                mime_type=info['mime_type'],
                is_private=is_private
            )
            bucket_name = upload_info['bucket']
            raw_path = f"supabase://{bucket_name}/{storage_path}"
            record_storage_provider = 'supabase'

            if is_private:
                # Private files route through authenticated gateway
                file_url = f"{backend_url}/api/v1/files/download/{file_id}"
                download_url = f"{backend_url}/api/v1/files/download/{file_id}"
                access_policy = 'private'
            else:
                # Public files accessible directly via Supabase public CDN URL
                file_url = upload_info['public_url']
                download_url = upload_info['public_url']
                access_policy = 'public'

        else:
            # Default: Localhost filesystem storage
            target_dir = cls.get_category_dir(category, is_private=is_private)
            target_path = target_dir / stored_filename

            # Save file to disk
            file.seek(0)
            file.save(str(target_path))

            bucket_name = None
            raw_path = str(target_path)
            record_storage_provider = 'local'

            if is_private:
                # Private files route through authenticated gateway
                file_url = f"{backend_url}/api/v1/files/download/{file_id}"
                download_url = f"{backend_url}/api/v1/files/download/{file_id}"
                access_policy = 'private'
            else:
                # Public files accessible via static path or CDN
                file_url = f"{backend_url}/api/v1/static/uploads/{category}/{stored_filename}"
                download_url = f"{backend_url}/api/v1/files/download/{file_id}"
                access_policy = 'public'

        # Persist metadata to database
        conn = get_db()._get_conn()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO file_attachments (
                id, original_filename, stored_filename, file_path, file_url,
                file_size, mime_type, file_extension, category, uploader_id,
                uploader_role, related_module, related_id, access_policy, is_external_url,
                storage_provider, bucket_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """,
            (
                file_id,
                info['original_filename'],
                stored_filename,
                raw_path,
                file_url,
                info['size'],
                info['mime_type'],
                ext,
                category,
                uploader_id,
                uploader_role,
                related_module,
                related_id,
                access_policy,
                record_storage_provider,
                bucket_name
            )
        )
        conn.commit()

        return {
            'id': file_id,
            'originalFilename': info['original_filename'],
            'storedFilename': stored_filename,
            'fileUrl': file_url,
            'downloadUrl': download_url,
            'fileSize': info['size'],
            'fileSizeFormatted': cls.format_file_size(info['size']),
            'mimeType': info['mime_type'],
            'extension': ext,
            'category': category,
            'isPrivate': is_private,
            'storageProvider': record_storage_provider,
            'bucketName': bucket_name,
            'relatedModule': related_module,
            'relatedId': related_id,
            'createdAt': datetime.datetime.now().isoformat()
        }

    @classmethod
    def record_external_url(
        cls,
        url: str,
        category: str,
        uploader_id: str,
        uploader_role: Optional[str] = None,
        title: Optional[str] = None,
        related_module: Optional[str] = None,
        related_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Records an external URL attachment in file_attachments for unified tracking.
        """
        file_id = f"ext_{uuid.uuid4().hex}"
        conn = get_db()._get_conn()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO file_attachments (
                id, original_filename, stored_filename, file_path, file_url,
                file_size, mime_type, file_extension, category, uploader_id,
                uploader_role, related_module, related_id, access_policy, is_external_url,
                storage_provider, bucket_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', 1, 'external', NULL)
            """,
            (
                file_id,
                title or url,
                url,
                url,
                url,
                0,
                'application/x-external-url',
                'url',
                category,
                uploader_id,
                uploader_role,
                related_module,
                related_id
            )
        )
        conn.commit()

        return {
            'id': file_id,
            'originalFilename': title or url,
            'fileUrl': url,
            'downloadUrl': url,
            'fileSize': 0,
            'fileSizeFormatted': 'External Link',
            'mimeType': 'application/x-external-url',
            'extension': 'url',
            'category': category,
            'storageProvider': 'external',
            'isExternalUrl': True
        }

    @classmethod
    def get_file(cls, file_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves file attachment metadata by ID, stored filename, or URL."""
        if not file_id:
            return None
        conn = get_db()._get_conn()
        cur = conn.cursor()
        clean_target = file_id.strip()
        cur.execute(
            """
            SELECT * FROM file_attachments
            WHERE id = ? OR stored_filename = ? OR original_filename = ?
               OR file_url = ? OR file_url LIKE ?
            ORDER BY created_at DESC LIMIT 1
            """,
            (clean_target, clean_target, clean_target, clean_target, f"%{clean_target}%")
        )
        row = cur.fetchone()
        return dict(row) if row else None

    @classmethod
    def delete_file(cls, file_id: str, requester_id: str, requester_role: str) -> Tuple[bool, Optional[str]]:
        """Safely removes file from disk/cloud and database subject to ownership/admin permission."""
        record = cls.get_file(file_id)
        if not record:
            return False, "File attachment not found."

        # Permission check: Uploader or Admin/Faculty
        if record['uploader_id'] != requester_id and requester_role not in ('admin', 'faculty'):
            return False, "You do not have permission to delete this file attachment."

        storage_provider = record.get('storage_provider') or 'local'
        bucket_name = record.get('bucket_name')

        # Delete physical object if not external link
        if not record.get('is_external_url'):
            if storage_provider == 'supabase' and bucket_name:
                driver = cls.get_supabase_driver()
                if driver.is_configured():
                    storage_path = f"{record.get('category')}/{record.get('stored_filename')}"
                    del_ok, del_err = driver.delete_file(bucket_name, storage_path)
                    if not del_ok:
                        logger.warning(f"Could not remove Supabase object {bucket_name}/{storage_path}: {del_err}")
            elif storage_provider == 'local' and record.get('file_path'):
                try:
                    p = Path(record['file_path'])
                    if p.exists():
                        p.unlink()
                except Exception as e:
                    logger.warning(f"Could not remove physical file {record['file_path']}: {e}")

        # Delete database record
        conn = get_db()._get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM file_attachments WHERE id = ?", (file_id,))
        conn.commit()

        return True, None

    @staticmethod
    def format_file_size(bytes_val: int) -> str:
        """Formats byte count to human-readable string (KB, MB, GB)."""
        if not bytes_val or bytes_val <= 0:
            return "0 KB"
        kb = bytes_val / 1024
        if kb < 1024:
            return f"{round(kb, 1)} KB"
        mb = kb / 1024
        if mb < 1024:
            return f"{round(mb, 2)} MB"
        gb = mb / 1024
        return f"{round(gb, 2)} GB"
