import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder=".", static_url_path="")
TZ = ZoneInfo("America/Chicago")


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
            principal = client_for(user, password).principal()
            for calendar in principal.calendars():
                name = getattr(calendar, "name", "") or label
                for event in calendar.search(start=start, end=end, event=True, expand=True):
                    component = event.icalendar_component
                    begin = component.get("dtstart").dt
                    finish = component.get("dtend").dt
                    if not isinstance(begin, datetime):
                        continue
                    blocks.append({
                        "start": minutes(begin),
                        "end": minutes(finish),
                        "calendar": f"{label}: {name}",
                    })
        except Exception as exc:
            errors.append(f"{label}: {exc}")
    return jsonify(connected=not errors or bool(blocks), busy=blocks, error="; ".join(errors))


@app.post("/api/book")
def book():
    payload = request.get_json(force=True)
    personal = [item for item in accounts() if item[2] == "personal"]
    if not personal:
        return jsonify(saved=False, error="Personal Apple Calendar is not connected."), 400
    user, password, _ = personal[0]
    start = datetime.strptime(payload["date"], "%Y-%m-%d").replace(tzinfo=TZ) + timedelta(minutes=int(payload["start"]))
    finish = datetime.strptime(payload["date"], "%Y-%m-%d").replace(tzinfo=TZ) + timedelta(minutes=int(payload["end"]))
    try:
        calendars = client_for(user, password).principal().calendars()
        target = next((c for c in calendars if "home" in (c.name or "").lower()), calendars[0])
        target.save_event(
            dtstart=start,
            dtend=finish,
            summary=f"Mommy America · {payload.get('home', 'Cleaning')}",
            location=payload.get("address", ""),
            description=payload.get("notes", ""),
        )
    except Exception as exc:
        return jsonify(saved=False, error=str(exc)), 502
    return jsonify(saved=True)


@app.get("/")
def home():
    return send_from_directory(".", "index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
