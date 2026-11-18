"""
Create dev_auth_accounts.json for the database-free development login mode.

Reads dev_auth_accounts.example.json, asks for a password for each account (or
takes them from --password EMAIL=PASSWORD arguments) and writes only Argon2id
hashes to dev_auth_accounts.json, which is git-ignored.

Usage (from the backend directory):
    python scripts/create_dev_auth_accounts.py
    python scripts/create_dev_auth_accounts.py --password principal@stxaviers.edu.in='S3cret!pass'

Accounts left without a password are written with an empty hash and cannot log in.
DEVELOPMENT/TEST ONLY - never point a production deployment at this file.
"""
import argparse
import getpass
import json
import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.utils.security import hash_password  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--template", default=os.path.join(BACKEND_DIR, "dev_auth_accounts.example.json"))
    parser.add_argument("--output", default=os.path.join(BACKEND_DIR, "dev_auth_accounts.json"))
    parser.add_argument("--password", action="append", default=[], metavar="EMAIL=PASSWORD",
                        help="Password for one account; may be repeated. Prompts for the rest.")
    parser.add_argument("--no-prompt", action="store_true", help="Do not prompt for missing passwords.")
    args = parser.parse_args()

    supplied = {}
    for item in args.password:
        email, sep, password = item.partition("=")
        if not sep or not password:
            parser.error(f"Invalid --password value: {item!r} (expected EMAIL=PASSWORD)")
        supplied[email.strip().lower()] = password

    with open(args.template, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    enabled = 0
    for acc in data.get("accounts", []):
        email = acc["email"].strip().lower()
        password = supplied.get(email)
        if password is None and not args.no_prompt:
            password = getpass.getpass(f"Password for {email} ({', '.join(acc['roles'])}) [blank = disabled]: ")
        acc["password_hash"] = hash_password(password) if password else ""
        enabled += bool(password)

    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
        fh.write("\n")

    print(f"Wrote {args.output} ({enabled} of {len(data.get('accounts', []))} accounts enabled).")


if __name__ == "__main__":
    main()
