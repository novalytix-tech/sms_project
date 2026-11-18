from flask import Blueprint

from app.auth import authenticate_request
from app.api.v1.academics import academics_bp
from app.api.v1.admissions import admissions_bp
from app.api.v1.attendance import attendance_bp
from app.api.v1.auth import auth_bp
from app.api.v1.communications import communications_bp
from app.api.v1.examinations import examinations_bp
from app.api.v1.finance import finance_bp
from app.api.v1.institutions import institutions_bp
from app.api.v1.library import library_bp
from app.api.v1.question_papers import question_papers_bp
from app.api.v1.staff import staff_bp
from app.api.v1.students import students_bp
from app.api.v1.sync import sync_bp
from app.api.v1.system import system_bp
from app.api.v1.transport import transport_bp
from app.api.v1.users import users_bp

api_v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")

# Deny by default: every route needs a valid Clerk session unless decorated with @public.
api_v1_bp.before_request(authenticate_request)

for bp in (
    system_bp, auth_bp, users_bp, students_bp, academics_bp, admissions_bp,
    attendance_bp, finance_bp, library_bp, transport_bp, communications_bp,
    examinations_bp, question_papers_bp, staff_bp, institutions_bp, sync_bp,
):
    api_v1_bp.register_blueprint(bp)
