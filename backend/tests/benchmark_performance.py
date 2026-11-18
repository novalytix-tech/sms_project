"""
Performance Benchmark Evaluation for School Management System (SMS ERP)
Empirical latency, throughput, and DB execution time measurement.
"""

import time
import os
import sys
import statistics
import concurrent.futures
from datetime import date

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from app.extensions import db
from sqlalchemy import text


def run_benchmarks():
    app = create_app("testing")
    client = app.test_client()

    results = {}

    with app.app_context():
        # 1. Direct DB Query Latency
        db_latencies = []
        for _ in range(20):
            t0 = time.perf_counter()
            db.session.execute(text("SELECT 1;")).scalar()
            db_latencies.append((time.perf_counter() - t0) * 1000)
        results["db_ping_ms"] = {
            "avg": round(statistics.mean(db_latencies), 2),
            "p95": round(statistics.quantiles(db_latencies, n=20)[18], 2) if len(db_latencies) >= 20 else round(max(db_latencies), 2),
            "min": round(min(db_latencies), 2),
            "max": round(max(db_latencies), 2),
        }

        # 2. Authentication Login Latency (Argon2id + JWT + DB lookups)
        auth_latencies = []
        token = None
        for _ in range(10):
            t0 = time.perf_counter()
            res = client.post("/api/v1/auth/login", json={
                "email": "principal@stxaviers.edu.in",
                "password": "SchoolERP@Demo2026!",
            })
            auth_latencies.append((time.perf_counter() - t0) * 1000)
            if res.status_code == 200 and not token:
                token = res.get_json()["data"]["access_token"]
        results["auth_login_ms"] = {
            "avg": round(statistics.mean(auth_latencies), 2),
            "p95": round(statistics.quantiles(auth_latencies, n=10)[8], 2) if len(auth_latencies) >= 10 else round(max(auth_latencies), 2),
            "min": round(min(auth_latencies), 2),
            "max": round(max(auth_latencies), 2),
        }

        headers = {"Authorization": f"Bearer {token}"} if token else {}

        # 3. Student Listing Latency
        stud_latencies = []
        for _ in range(15):
            t0 = time.perf_counter()
            res = client.get("/api/v1/students?page=1&limit=25", headers=headers)
            stud_latencies.append((time.perf_counter() - t0) * 1000)
        results["student_listing_ms"] = {
            "avg": round(statistics.mean(stud_latencies), 2),
            "p95": round(statistics.quantiles(stud_latencies, n=10)[8], 2) if len(stud_latencies) >= 10 else round(max(stud_latencies), 2),
            "min": round(min(stud_latencies), 2),
            "max": round(max(stud_latencies), 2),
        }

        # 4. Sync Store Full Hydration Latency
        sync_latencies = []
        for _ in range(10):
            t0 = time.perf_counter()
            res = client.get("/api/v1/sync/store", headers=headers)
            sync_latencies.append((time.perf_counter() - t0) * 1000)
        results["sync_store_ms"] = {
            "avg": round(statistics.mean(sync_latencies), 2),
            "p95": round(statistics.quantiles(sync_latencies, n=10)[8], 2) if len(sync_latencies) >= 10 else round(max(sync_latencies), 2),
            "min": round(min(sync_latencies), 2),
            "max": round(max(sync_latencies), 2),
        }

        # 5. Concurrent API Requests (Throughput)
        def fetch_students():
            t_start = time.perf_counter()
            res = client.get("/api/v1/students", headers=headers)
            return (time.perf_counter() - t_start) * 1000, res.status_code

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            t_total_start = time.perf_counter()
            futures = [executor.submit(fetch_students) for _ in range(25)]
            concurrent_latencies = [f.result()[0] for f in concurrent.futures.as_completed(futures)]
            total_duration = time.perf_counter() - t_total_start

        results["concurrent_requests"] = {
            "total_requests": 25,
            "concurrency_level": 5,
            "total_time_seconds": round(total_duration, 3),
            "requests_per_second": round(25 / total_duration, 1),
            "avg_latency_ms": round(statistics.mean(concurrent_latencies), 2),
            "p95_latency_ms": round(statistics.quantiles(concurrent_latencies, n=10)[8], 2) if len(concurrent_latencies) >= 10 else round(max(concurrent_latencies), 2),
        }

    return results


if __name__ == "__main__":
    import json
    bench = run_benchmarks()
    print("=== BENCHMARK RESULTS ===")
    print(json.dumps(bench, indent=2))
