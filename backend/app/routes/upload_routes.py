"""
Universal File Upload and Attachment Routes for MyAlumni 2.0.
Provides unified direct multipart upload, external URL registration,
secure authenticated downloads, and file lifecycle management.
"""

import os
from pathlib import Path
from flask import Blueprint, request, g, send_file, send_from_directory, current_app, Response

from app.auth.decorators import require_auth
from app.services.storage_service import StorageService, SIZE_LIMITS
from app.utils.responses import success_response, error_response
from app.db import get_db

upload_bp = Blueprint('upload', __name__)


@upload_bp.route('/uploads', methods=['POST'])
@require_auth
def upload_file():
    """
    Unified endpoint for single and multiple direct file uploads or external URLs.
    Supports Option A (Device Upload) and Option B (External URL Registration).
    """
    user_id = g.current_user['uid']
    user_role = g.current_user.get('role', 'student')
    
    category = request.form.get('category', 'resources').lower().strip()
    is_private_str = request.form.get('is_private', 'false').lower().strip()
    is_private = is_private_str in ('true', '1', 'yes') or category in ('resumes', 'tickets')
    related_module = request.form.get('related_module')
    related_id = request.form.get('related_id')

    # Handle Option B: External URL registration
    external_url = request.form.get('external_url') or (request.json.get('external_url') if request.is_json else None)
    if external_url:
        external_url = external_url.strip()
        if not (external_url.startswith('http://') or external_url.startswith('https://')):
            return error_response("Invalid external URL. Must start with http:// or https://", "BAD_REQUEST", 400)
        
        title = request.form.get('title') or (request.json.get('title') if request.is_json else None)
        record = StorageService.record_external_url(
            url=external_url,
            category=category,
            uploader_id=user_id,
            uploader_role=user_role,
            title=title,
            related_module=related_module,
            related_id=related_id
        )
        return success_response(record, message="External URL attachment recorded successfully.", status_code=201)

    # Handle Option A: Direct Device Upload
    # Check for multiple files ('files' or 'files[]') or single file ('file')
    files_to_process = []
    if 'files' in request.files:
        files_to_process = request.files.getlist('files')
    elif 'files[]' in request.files:
        files_to_process = request.files.getlist('files[]')
    elif 'file' in request.files:
        files_to_process = [request.files['file']]
    elif 'attachment' in request.files:
        files_to_process = [request.files['attachment']]

    # Filter out empty entries
    files_to_process = [f for f in files_to_process if f and f.filename]

    if not files_to_process:
        return error_response("No file provided. Please attach a file under key 'file' or 'files'.", "BAD_REQUEST", 400)

    # Max files limit check
    if len(files_to_process) > 10:
        return error_response("Maximum 10 files can be uploaded simultaneously.", "BAD_REQUEST", 400)

    results = []
    errors = []

    for f in files_to_process:
        try:
            saved_meta = StorageService.save_file(
                file=f,
                category=category,
                uploader_id=user_id,
                uploader_role=user_role,
                is_private=is_private,
                related_module=related_module,
                related_id=related_id
            )
            results.append(saved_meta)
        except Exception as e:
            errors.append(f"{f.filename}: {str(e)}")

    if not results and errors:
        return error_response(f"Upload failed: {'; '.join(errors)}", "UPLOAD_FAILED", 400)

    # Return single object if 1 file requested, list if multiple
    if len(files_to_process) == 1 and results:
        res_payload = results[0]
        msg = "File uploaded successfully."
    else:
        res_payload = {'files': results, 'total': len(results), 'failed': errors}
        msg = f"{len(results)} file(s) uploaded successfully."

    return success_response(res_payload, message=msg, status_code=201)


@upload_bp.route('/files/download/<file_id>', methods=['GET'])
def download_file(file_id: str):
    """
    Unified, access-controlled download and preview gateway for stored files.
    Enforces authorization on private files (resumes, tickets, private resources).
    """
    record = StorageService.get_file(file_id)
    if not record:
        return error_response("File attachment not found.", "NOT_FOUND", 404)

    # If external URL, redirect or return URL info
    if record.get('is_external_url'):
        from flask import redirect
        return redirect(record['file_url'], code=302)

    # Check access policy for private files
    if record.get('access_policy') == 'private':
        # Must be authenticated
        from app.auth.jwt_utils import verify_auth_token
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.split(' ')[1] if ' ' in auth_header else request.args.get('token', '')
        
        caller = None
        if token:
            try:
                caller = verify_auth_token(token)
            except Exception:
                caller = None

        if not caller:
            return error_response("Authentication required to download this private document.", "UNAUTHORIZED", 401)

        caller_id = caller.get('uid') or caller.get('id')
        caller_role = caller.get('role', 'student')

        # Authorization: Uploader or Admin or Faculty (or Employer if resume application)
        is_owner = (record['uploader_id'] == caller_id)
        is_privileged = caller_role in ('admin', 'faculty')
        
        # Check if caller is opportunity poster if resume
        is_opportunity_poster = False
        if record.get('category') == 'resumes' and record.get('related_id'):
            # Query if caller posted the related opportunity
            conn = get_db()._get_conn()
            cur = conn.cursor()
            cur.execute(
                """
                SELECT p.posted_by_id FROM postings p
                JOIN applications a ON a.opportunity_id = p.id
                WHERE a.id = ? OR p.id = ?
                """,
                (record['related_id'], record['related_id'])
            )
            row = cur.fetchone()
            if row and row['posted_by_id'] == caller_id:
                is_opportunity_poster = True

        if not (is_owner or is_privileged or is_opportunity_poster):
            return error_response("Access denied. You do not have permission to view or download this private file.", "FORBIDDEN", 403)

    storage_provider = record.get('storage_provider') or 'local'
    bucket_name = record.get('bucket_name')

    # Handle Cloud Object Storage (Supabase)
    if storage_provider == 'supabase':
        driver = StorageService.get_supabase_driver()
        if not driver.is_configured():
            return error_response("Supabase storage driver is not configured.", "SERVER_ERROR", 500)

        storage_path = f"{record.get('category')}/{record.get('stored_filename')}"
        from flask import redirect
        if record.get('access_policy') == 'private':
            # Generate short-lived signed URL (15 minutes)
            try:
                signed_url = driver.get_signed_url(bucket_name, storage_path, expires_in=900)
                return redirect(signed_url, code=302)
            except Exception as e:
                return error_response(f"Could not generate secure download link: {str(e)}", "STORAGE_ERROR", 500)
        else:
            # Public file: redirect to Supabase CDN URL
            file_url = record.get('file_url') or f"{driver.url}/storage/v1/object/public/{bucket_name}/{storage_path}"
            return redirect(file_url, code=302)

    # Handle Local Filesystem Storage
    file_path = record.get('file_path')
    if not file_path or not os.path.exists(file_path):
        base_dir = StorageService.get_storage_root()
        candidate = base_dir / (record.get('category') or '') / (record.get('stored_filename') or '')
        if candidate.exists():
            file_path = str(candidate)
        else:
            return error_response("Physical file is missing from storage.", "NOT_FOUND", 404)

    # Inline preview vs attachment download
    inline = request.args.get('inline', 'false').lower() in ('true', '1')
    as_attachment = not inline

    return send_file(
        file_path,
        mimetype=record.get('mime_type') or 'application/octet-stream',
        as_attachment=as_attachment,
        download_name=record.get('original_filename') or os.path.basename(file_path)
    )


@upload_bp.route('/uploads/<file_id>', methods=['DELETE'])
@require_auth
def delete_file_attachment(file_id: str):
    """
    Deletes an uploaded file subject to ownership or admin permission.
    """
    user_id = g.current_user['uid']
    user_role = g.current_user.get('role', 'student')

    success, err_msg = StorageService.delete_file(file_id, user_id, user_role)
    if not success:
        return error_response(err_msg, "FORBIDDEN", 403)

    return success_response(None, message="File attachment deleted successfully.")


@upload_bp.route('/static/uploads/<category>/<path:filename>', methods=['GET'])
def serve_public_upload(category: str, filename: str):
    """
    Serves public uploaded files (avatars, memories, discussions, events, resources).
    Explicitly blocks access to private storage directory.
    Falls back to redirecting to Supabase CDN if file is stored in cloud object storage.
    """
    if category == 'private' or '..' in filename or filename.startswith('/'):
        return error_response("Direct access to private storage is prohibited.", "FORBIDDEN", 403)

    base_dir = StorageService.get_storage_root()
    cat_dir = base_dir / category

    # If local file exists, serve from local directory
    target_file = cat_dir / filename
    as_download = request.args.get('download', 'false').lower() in ('true', '1')

    if target_file.exists():
        conn = get_db()._get_conn()
        cur = conn.cursor()
        cur.execute("SELECT original_filename FROM file_attachments WHERE stored_filename = ? OR file_path LIKE ? LIMIT 1", (filename, f"%{filename}%"))
        row = cur.fetchone()
        download_name = row['original_filename'] if row and row['original_filename'] else filename

        return send_from_directory(
            str(cat_dir),
            filename,
            as_attachment=as_download,
            download_name=download_name
        )

    # If file not on local disk, check if Supabase driver is configured
    driver = StorageService.get_supabase_driver()
    if driver.is_configured():
        from flask import redirect
        supabase_cdn_url = f"{driver.url}/storage/v1/object/public/{driver.public_bucket}/{category}/{filename}"
        return redirect(supabase_cdn_url, code=302)

    return error_response(f"File '{filename}' in category '{category}' not found.", "NOT_FOUND", 404)
