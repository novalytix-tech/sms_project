from flask import Blueprint
from app.api.v1.system import system_bp
from app.api.v1.auth import auth_bp
from app.api.v1.test_routes import test_bp
from app.api.v1.students import students_bp
from app.api.v1.academics import academics_bp
from app.api.v1.admissions import admissions_bp
from app.api.v1.attendance import attendance_bp
from app.api.v1.finance import finance_bp
from app.api.v1.library import library_bp
from app.api.v1.transport import transport_bp
from app.api.v1.communications import communications_bp
from app.api.v1.examinations import examinations_bp
from app.api.v1.question_papers import question_papers_bp
from app.api.v1.staff import staff_bp
from app.api.v1.institutions import institutions_bp
from app.api.v1.sync import sync_bp
from app.api.v1.users import users_bp

api_v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")

api_v1_bp.register_blueprint(system_bp)
api_v1_bp.register_blueprint(auth_bp)
api_v1_bp.register_blueprint(test_bp)
api_v1_bp.register_blueprint(students_bp)
api_v1_bp.register_blueprint(academics_bp)
api_v1_bp.register_blueprint(admissions_bp)
api_v1_bp.register_blueprint(attendance_bp)
api_v1_bp.register_blueprint(finance_bp)
api_v1_bp.register_blueprint(library_bp)
api_v1_bp.register_blueprint(transport_bp)
api_v1_bp.register_blueprint(communications_bp)
api_v1_bp.register_blueprint(examinations_bp)
api_v1_bp.register_blueprint(question_papers_bp)
api_v1_bp.register_blueprint(staff_bp)
api_v1_bp.register_blueprint(institutions_bp)
api_v1_bp.register_blueprint(sync_bp)
api_v1_bp.register_blueprint(users_bp)
