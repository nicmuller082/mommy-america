import os
import smtplib
from datetime import datetime, timedelta, date
from email.message import EmailMessage
from zoneinfo import ZoneInfo

from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder=".", static_url_path="")
TZ = ZoneInfo("America/Chicago")
WATCH = {"personal": "Work", "family": "Family"}


def accounts():
    pairs = [
        ("ICLOUD_APPLE_ID", "ICLOUD_APP_PASSWORD", "personal"),
        ("ICLOUD_FAMILY_APPLE_ID", "ICLOUD_FAMILY_APP_PASSWORD", "family"),
    ]
    found = []
    for user_key, pass_key, label in pairs:
        user, password = os.environ.get(user_key), os.environ.get(pass_key)
        if user and password:
            found.append((user, password, label))
    return found


def client_for(user, password):
    import caldav
    return caldav.DAVClient(url="https://caldav.icloud.com/", username=user, password=password)


def minutes(dt):
    local = dt.astimezone(TZ)
    return local.hour * 60 + local.minute


def block_for(begin, finish, day):
    if isinstance(begin, datetime):
        return minutes(begin), minutes(finish)
    if isinstance(begin, date) and begin <= day.date() < finish:
        return 8 * 60, 14 * 60 + 30
    return None


def watched_name(label):
    return os.environ.get(f"ICLOUD_{label.upper()}_CALENDAR", WATCH[label])


@app.get("/api/status")
def status():
    found = accounts()
    if not found:
        return jsonify(connected=False, calendars=[], error="No Apple ID is set on the server.")
    calendars = []
    errors = []
    for user, password, label in found:
        try:
            names = [getattr(calendar, "name", "") or "Untitled" for calendar in client_for(user, password).principal().calendars()]
            calendars.append({
                "account": label,
                "email": user,
                "watching": watched_name(label),
                "calendars": names,
            })
        except Exception as exc:
            errors.append(f"{label}: {exc}")
    return jsonify(connected=bool(calendars), calendars=calendars, error="; ".join(errors))


def notify(payload):
    host = os.environ.get("SMTP_HOST")
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    to = os.environ.get("BOOKING_EMAIL", user)
    if not (host and user and password and to):
        return "Email is not set up yet."
    message = EmailMessage()
    message["Subject"] = f"New booking · {payload.get('date')} {payload.get('start')}"
    message["From"] = user
    message["To"] = to
    message.set_content("\n".join([
        f"Name: {payload.get('name')}",
        f"Phone: {payload.get('phone')}",
        f"Address: {payload.get('address')}",
        f"Home: {payload.get('home')}",
        f"Service: {payload.get('kind')}",
        f"Date: {payload.get('date')}",
        f"Start minute: {payload.get('start')}",
        f"End minute: {payload.get('end')}",
        f"Total: {payload.get('total')}",
        f"Notes: {payload.get('notes')}",
    ]))
    with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587"))) as smtp:
        smtp.starttls()
        smtp.login(user, password)
        smtp.send_message(message)
    return "Email sent."


@app.get("/api/busy")
def busy():
    day = request.args.get("date", "")
    try:
        start = datetime.strptime(day, "%Y-%m-%d").replace(tzinfo=TZ)
    except ValueError:
        return jsonify(connected=False, busy=[], error="Pick a date."), 400
    end = start + timedelta(days=1)
    if not accounts():
        return jsonify(connected=False, busy=[], error="Apple Calendar is not connected on the server yet.")
    blocks = []
    errors = []
    for user, password, label in accounts():
        try:
            wanted = watched_name(label).lower()
            for calendar in client_for(user, password).principal().calendars():
                name = getattr(calendar, "name", "") or ""
                if name.lower() != wanted:
                    continue
                for event in calendar.search(start=start, end=end, event=True, expand=True):
                    component = event.icalendar_component
                    begin = component.get("dtstart").dt
                    finish = component.get("dtend").dt
                    block = block_for(begin, finish, start)
                    if not block:
                        continue
                    blocks.append({"start": block[0], "end": block[1], "calendar": f"{label}: {name}"})
        except Exception as exc:
            errors.append(f"{label}: {exc}")
    return jsonify(connected=not errors or bool(blocks), busy=blocks, error="; ".join(errors))


@app.post("/api/book")
def book():
    payload = request.get_json(force=True)
    family = [item for item in accounts() if item[2] == "family"]
    if not family:
        return jsonify(saved=False, error="Family calendar is not connected."), 400
    user, password, label = family[0]
    start = datetime.strptime(payload["date"], "%Y-%m-%d").replace(tzinfo=TZ) + timedelta(minutes=int(payload["start"]))
    finish = datetime.strptime(payload["date"], "%Y-%m-%d").replace(tzinfo=TZ) + timedelta(minutes=int(payload["end"]))
    try:
        calendars = client_for(user, password).principal().calendars()
        wanted = watched_name(label).lower()
        target = next((c for c in calendars if (c.name or "").lower() == wanted), None)
        if target is None:
            return jsonify(saved=False, error=f"No calendar named {watched_name(label)}."), 404
        target.save_event(
            dtstart=start,
            dtend=finish,
            summary=f"Mommy America · {payload.get('home', 'Cleaning')}",
            location=payload.get("address", ""),
            description=payload.get("notes", ""),
        )
    except Exception as exc:
        return jsonify(saved=False, error=str(exc)), 502
    try:
        emailed = notify(payload)
    except Exception as exc:
        emailed = f"Calendar saved, email failed: {exc}"
    return jsonify(saved=True, email=emailed)


@app.get("/api/email-test")
def email_test():
    try:
        result = notify({
            "name": "Test booking",
            "phone": "346-833-5791",
            "address": "Email test only",
            "home": "Test",
            "kind": "Email check",
            "date": "test",
            "start": 480,
            "end": 540,
            "total": 0,
            "notes": "Delete this. It is only a connection test.",
        })
    except Exception as exc:
        return jsonify(sent=False, error=str(exc)), 502
    return jsonify(sent=result == "Email sent.", message=result)
    return send_from_directory(".", "index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
