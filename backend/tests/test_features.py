import pytest
from unittest.mock import patch, MagicMock
from app.validators.validators import validate_email, validate_opportunity, validate_event
from app.routes.career_routes import RULE_BASED_GUIDES


def test_validate_email_helper():
    """Unit test for strict email format validator."""
    assert validate_email("valid.student@university.edu")[0] is True
    assert validate_email("invalid-email-format")[0] is False
    assert validate_email("")[0] is False


def test_validate_opportunity_helper():
    """Unit test for opportunity validation rules."""
    valid_data = {
        "title": "Cloud Engineer",
        "company": "Apex",
        "type": "job",
        "description": "Building cloud infrastructure",
        "applicationUrl": "https://apex.com/careers"
    }
    assert validate_opportunity(valid_data)[0] is True

    # Bad type
    bad_type = {**valid_data, "type": "invalid_type"}
    assert validate_opportunity(bad_type)[0] is False

    # Missing title
    missing_title = {**valid_data, "title": ""}
    assert validate_opportunity(missing_title)[0] is False


def test_rule_based_career_guide_structure(client):
    """Verifies that the Rule-Based Career Guide returns curated tracks without external AI."""
    with patch('app.auth.decorators.verify_firebase_id_token', return_value={"uid": "u1", "email": "u@test.com"}):
        with patch('app.auth.decorators.get_firestore_client') as mock_db:
            mock_doc = MagicMock()
            mock_doc.exists = True
            mock_doc.to_dict.return_value = {"uid": "u1", "role": "student", "accountStatus": "active"}
            mock_db.return_value.collection.return_value.document.return_value.get.return_value = mock_doc

            response = client.get('/api/v1/career/guide', headers={"Authorization": "Bearer valid_token"})
            assert response.status_code == 200
            data = response.get_json()['data']
            
            assert 'software_engineering' in data
            assert 'data_science' in data
            assert 'cloud_devops' in data
            assert 'skillsToLearn' in data['software_engineering']
            assert 'interviewPrep' in data['software_engineering']


def test_db_error_handling(client):
    """Verifies that database failure returns HTTP 503."""
    with patch('app.routes.health_routes.get_database_status') as mock_status:
        mock_status.return_value = {"initialized": False, "error": "Database disconnected"}
        response = client.get('/api/v1/health/db')
        assert response.status_code == 503
        data = response.get_json()
        assert data['data']['initialized'] is False

