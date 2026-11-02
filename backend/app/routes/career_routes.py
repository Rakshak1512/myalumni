from flask import Blueprint, request, g
from app.auth.decorators import require_auth
from app.repositories.career_repository import CareerRepository
from app.utils.responses import success_response, error_response

career_bp = Blueprint('career', __name__)
career_repo = CareerRepository()


# RULE-BASED CAREER GUIDE CONTENT (Transparent, Deterministic, No AI API)
RULE_BASED_GUIDES = {
    "software_engineering": {
        "title": "Software Engineering & Full-Stack Development",
        "description": "Building modern scalable web apps, cloud backend systems, and APIs.",
        "skillsToLearn": [
            "Data Structures & Algorithms",
            "Python / TypeScript / Go",
            "Relational (PostgreSQL) and NoSQL (Firestore, MongoDB) databases",
            "RESTful API Design & OpenAPI",
            "Docker, CI/CD, and Cloud Deployment"
        ],
        "projectIdeas": [
            "Full-Stack Collaborative Project Tracker with Real-Time WebSockets",
            "Distributed URL Shortener with Analytics & Redis Caching",
            "Alumni Mentorship Platform with Role-Based Access Control"
        ],
        "interviewPrep": [
            "Master array manipulation, two pointers, sliding window, and graph BFS/DFS on LeetCode.",
            "Study System Design fundamentals: horizontal scaling, load balancers, caching, DB sharding.",
            "Prepare STAR method stories for behavioral questions regarding team conflict and leadership."
        ],
        "resumeTips": [
            "Quantify results: 'Engineered API reducing latency by 35% across 10,000 requests/sec'.",
            "Highlight modern frameworks and clean architecture instead of generic skill lists.",
            "Include live deployed links and GitHub repositories with thorough documentation."
        ]
    },
    "data_science": {
        "title": "Data Science & Machine Learning",
        "description": "Extracting actionable insights from complex datasets and training predictive models.",
        "skillsToLearn": [
            "Python (NumPy, Pandas, Scikit-Learn)",
            "SQL & BigQuery for data transformation",
            "Statistical Inference & Hypothesis Testing",
            "Data Visualization (Matplotlib, Seaborn, Tableau)",
            "MLOps fundamentals (MLflow, Docker)"
        ],
        "projectIdeas": [
            "End-to-End Customer Churn Prediction Pipeline with Model Explainability (SHAP)",
            "E-commerce Sentiment Analysis Dashboard using Transformers",
            "Time Series Sales Forecasting Engine deployed with FastAPI"
        ],
        "interviewPrep": [
            "Review bias-variance tradeoff, precision vs recall, ROC-AUC, and regularization techniques.",
            "Practice complex SQL window functions, CTEs, and aggregation patterns.",
            "Be ready to articulate business trade-offs of false positives vs false negatives."
        ],
        "resumeTips": [
            "Emphasize the business impact: 'Boosted recommendation CTR by 18%'.",
            "Detail data cleaning challenges overcome and cross-validation strategies used.",
            "Link interactive notebooks or Streamlit demo applications."
        ]
    },
    "cloud_devops": {
        "title": "Cloud Engineering & DevOps",
        "description": "Automating infrastructure, reliable deployments, and cloud platform architecture.",
        "skillsToLearn": [
            "Linux systems administration & Shell scripting",
            "Docker containerization & Kubernetes orchestration",
            "Infrastructure as Code (Terraform)",
            "CI/CD pipelines (GitHub Actions, GitLab CI)",
            "Observability (Prometheus, Grafana, OpenTelemetry)"
        ],
        "projectIdeas": [
            "Automated Multi-Environment GitOps Pipeline for Kubernetes using ArgoCD",
            "Terraform Infrastructure Blueprint for Highly Available Microservices on GCP/AWS",
            "Zero-Downtime Blue-Green Deployment System with Health Probes"
        ],
        "interviewPrep": [
            "Understand container networking, ingress controllers, and DNS resolution.",
            "Walk through incident triage scenarios: debugging high memory, disk fill-up, crash loops.",
            "Explain security best practices: least privilege IAM, secret management, image scanning."
        ],
        "resumeTips": [
            "Showcase cloud certifications (AWS Solutions Architect, GCP Associate Cloud Engineer).",
            "Highlight uptime achievements: 'Maintained 99.95% system availability during traffic surges'.",
            "Document automated disaster recovery and backup verification workflows."
        ]
    },
    "cybersecurity": {
        "title": "Cybersecurity & Information Security",
        "description": "Securing networks, software applications, and conducting vulnerability evaluations.",
        "skillsToLearn": [
            "Network Protocols (TCP/IP, TLS, DNS, HTTP/S)",
            "OWASP Top 10 Web Application Vulnerabilities",
            "Penetration Testing Tools (Burp Suite, Wireshark, Nmap)",
            "Identity & Access Management (OAuth2, OpenID Connect)",
            "Incident Response & Forensic Basics"
        ],
        "projectIdeas": [
            "Automated Vulnerability Scanner for Web API Endpoints",
            "Secure File Vault with End-to-End Client Encryption & Key Management",
            "Threat Detection Log Parser for SIEM Integration"
        ],
        "interviewPrep": [
            "Explain common attacks (SQLi, XSS, CSRF, SSRF) and specific programmatic mitigations.",
            "Demonstrate cryptographic principles: symmetric vs asymmetric encryption, hashing vs salting.",
            "Discuss compliance frameworks (SOC 2, ISO 27001, GDPR) and risk management."
        ],
        "resumeTips": [
            "Include industry-standard credentials: CompTIA Security+, CEH, or OSCP.",
            "List bug bounty findings or CVE contributions where applicable.",
            "Highlight code auditing and secure SDLC implementation experience."
        ]
    }
}


@career_bp.route('/career/guide', methods=['GET'])
@require_auth
def get_career_guide():
    """Returns rule-based career roadmap and preparation guide (deterministic, no external AI)."""
    track = request.args.get('track', 'all')
    if track != 'all' and track in RULE_BASED_GUIDES:
        return success_response(RULE_BASED_GUIDES[track], message="Career guide retrieved.")
    return success_response(RULE_BASED_GUIDES, message="Career guide catalog retrieved.")


@career_bp.route('/career/goals', methods=['GET'])
@require_auth
def list_goals():
    """Lists career goals and milestones for the current user."""
    user_id = g.current_user['uid']
    goals = career_repo.list_user_goals(user_id)
    return success_response(goals, message="Career goals retrieved.")


@career_bp.route('/career/goals', methods=['POST'])
@require_auth
def create_goal():
    """Creates a new career goal."""
    user_id = g.current_user['uid']
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    target_role = data.get('targetRole', '').strip()
    target_date = data.get('targetDate', '')
    desc = data.get('description', '').strip()

    if not title or not target_role:
        return error_response("Title and target role are required.", "BAD_REQUEST", 400)

    goal = career_repo.create_goal(
        user_id=user_id,
        title=title,
        description=desc,
        target_role=target_role,
        target_date=target_date
    )
    return success_response(goal, message="Career goal created.", status_code=201)


@career_bp.route('/career/goals/<goal_id>/milestones', methods=['POST'])
@require_auth
def add_milestone(goal_id: str):
    """Adds a measurable milestone to a career goal."""
    user_id = g.current_user['uid']
    data = request.get_json() or {}
    title = data.get('title', '').strip()

    if not title:
        return error_response("Milestone title is required.", "BAD_REQUEST", 400)

    milestone = career_repo.add_milestone(goal_id, user_id, title)
    return success_response(milestone, message="Milestone added.", status_code=201)


@career_bp.route('/career/milestones/<milestone_id>/toggle', methods=['PUT'])
@require_auth
def toggle_milestone(milestone_id: str):
    """Toggles milestone completion and automatically recalculates overall goal progress."""
    data = request.get_json() or {}
    is_completed = bool(data.get('isCompleted', True))
    updated = career_repo.toggle_milestone(milestone_id, is_completed)
    return success_response(updated, message="Milestone progress updated.")


@career_bp.route('/career/projects', methods=['GET'])
@require_auth
def list_projects():
    """Lists student portfolio projects."""
    user_id = g.current_user['uid']
    projects = career_repo.list_user_projects(user_id)
    return success_response(projects, message="Projects retrieved.")


@career_bp.route('/career/projects', methods=['POST'])
@require_auth
def add_project():
    """Adds a technical project to the user's profile."""
    user_id = g.current_user['uid']
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    desc = data.get('description', '').strip()
    tech = data.get('technologies', [])
    if isinstance(tech, str):
        tech = [t.strip() for t in tech.split(',') if t.strip()]

    if not title or not desc:
        return error_response("Project title and description are required.", "BAD_REQUEST", 400)

    proj = career_repo.add_project(
        user_id=user_id,
        title=title,
        description=desc,
        technologies=tech,
        project_url=data.get('projectUrl', '').strip(),
        github_url=data.get('githubUrl', '').strip()
    )
    return success_response(proj, message="Project added to portfolio.", status_code=201)


@career_bp.route('/career/projects/<project_id>', methods=['DELETE'])
@require_auth
def delete_project(project_id: str):
    """Deletes a portfolio project."""
    user_id = g.current_user['uid']
    deleted = career_repo.delete_project(project_id, user_id)
    if not deleted:
        return error_response("Project not found or not owned by you.", "NOT_FOUND", 404)
    return success_response(None, message="Project deleted.")


@career_bp.route('/career/certifications', methods=['GET'])
@require_auth
def list_certifications():
    """Lists certifications."""
    user_id = g.current_user['uid']
    certs = career_repo.list_user_certifications(user_id)
    return success_response(certs, message="Certifications retrieved.")


@career_bp.route('/career/certifications', methods=['POST'])
@require_auth
def add_certification():
    """Adds a professional certification."""
    user_id = g.current_user['uid']
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    org = data.get('issuingOrganization', '').strip()
    date_str = data.get('issueDate', '')

    if not name or not org:
        return error_response("Certification name and issuing organization are required.", "BAD_REQUEST", 400)

    cert = career_repo.add_certification(
        user_id=user_id,
        name=name,
        issuing_org=org,
        issue_date=date_str,
        credential_id=data.get('credentialId', '').strip(),
        credential_url=data.get('credentialUrl', '').strip()
    )
    return success_response(cert, message="Certification added.", status_code=201)

