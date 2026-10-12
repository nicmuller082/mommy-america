import threading
import os
import smtplib
import uuid
from datetime import datetime, timedelta, date
from email.message import EmailMessage
from pathlib import Path
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


STORE = Path("/tmp/mommy-bookings.json")


def load_store():
    if not STORE.exists():
        return {}
    return json.loads(STORE.read_text())


def save_store(data):
    STORE.write_text(json.dumps(data))


def notify(payload, client=False):
    host = os.environ.get("SMTP_HOST")
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    to = payload.get("email") if client else os.environ.get("BOOKING_EMAIL", user)
    if not (host and user and password and to):
        return "Email is not set up yet."
    message = EmailMessage()
    message["Subject"] = f"Mommy America booking · {payload.get('date')}"
    message["From"] = user
    message["To"] = to
    manage = payload.get("manage", "")
    message.set_content("\n".join([
        f"Name: {payload.get('name')}",
        f"Phone: {payload.get('phone')}",
        f"Email: {payload.get('email')}",
        f"Address: {payload.get('address')}",
        f"Home: {payload.get('home')}",
        f"Service: {payload.get('kind')}",
        f"Date: {payload.get('date')}",
        f"Time: {payload.get('start')} to {payload.get('end')}",
        f"Total: {payload.get('total')}",
        f"Manage or change this booking: {manage}",
    ]))
    with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587")), timeout=12) as smtp:
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


def write_calendar(payload, start, finish):
    family = [item for item in accounts() if item[2] == "family"]
    if not family:
        return
    user, password, label = family[0]
    calendars = client_for(user, password).principal().calendars()
    wanted = watched_name(label).lower()
    target = next((c for c in calendars if (c.name or "").lower() == wanted), None)
    if target is None:
        return
    target.save_event(
        dtstart=start,
        dtend=finish,
        summary=f"Mommy America; {payload.get('home', 'Cleaning')}, {payload.get('name', '')}, {payload.get('phone', '')}",
        location=payload.get("address", ""),
        description=f"Contact: {payload.get('phone', '')}. {payload.get('kind', '')}. {payload.get('extras', '')}".strip(),
    )


@app.post("/api/book")
def book():
    payload = request.get_json(force=True)
    if not [item for item in accounts() if item[2] == "family"]:
        return jsonify(saved=False, error="Family calendar is not connected."), 400
    start = datetime.strptime(payload["date"], "%Y-%m-%d").replace(tzinfo=TZ) + timedelta(minutes=int(payload["start"]))
    finish = datetime.strptime(payload["date"], "%Y-%m-%d").replace(tzinfo=TZ) + timedelta(minutes=int(payload["end"]))
    ref = uuid.uuid4().hex[:10]
    payload["manage"] = request.host_url.rstrip("/") + "/manage/" + ref
    store = load_store()
    store[ref] = payload
    save_store(store)
    threading.Thread(target=lambda: (write_calendar(payload, start, finish), notify(payload), notify(payload, client=True)), daemon=True).start()
    return jsonify(saved=True, manage=payload["manage"])


@app.route("/manage/<ref>", methods=["GET", "POST"])
def manage(ref):
    store = load_store()
    booking = store.get(ref)
    if not booking:
        return "This booking link is no longer available.", 404
    note = ""
    if request.method == "POST":
        action = request.form.get("action")
        if action == "cancel":
            booking["status"] = "cancelled"
            note = "Cancelled. We will remove it from the calendar."
        else:
            booking["change"] = request.form.get("change", "")
            note = "Change request sent."
        store[ref] = booking
        save_store(store)
        try:
            notify({**booking, "notes": note + " " + booking.get("change", "")})
        except Exception:
            pass
    return f"""<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Manage booking</title>
    <body style="font-family:sans-serif;max-width:640px;margin:40px auto;padding:0 16px">
    <h1>Your Mommy America visit</h1>
    <p>{booking.get('name')} · {booking.get('home')} · {booking.get('kind')}</p>
    <p>{booking.get('date')} · {booking.get('address')}</p>
    <p>{booking.get('phone')} · {booking.get('email')}</p>
    <p>{note}</p>
    <form method="post"><label>Request a change<br><textarea name="change" rows="4" style="width:100%"></textarea></label><p><button name="action" value="change">Send change</button> <button name="action" value="cancel">Cancel visit</button></p></form>
    </body>"""
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


@app.get("/")
def home():
    return send_from_directory(".", "index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
