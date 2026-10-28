"""
plantcare_server.py — PlantCare AI server (runs on the laptop)

  * Receives readings from the NodeMCU:   POST /api/readings
  * Gives the latest reading to the app:  GET  /api/latest
  * Serves the PlantCare web app itself:  http://<laptop-IP>:5000/
  * Appends every valid reading to readings.csv (next to this file)

Setup (once):   pip install flask
Run:            python plantcare_server.py
Then put the printed laptop IP into the NodeMCU sketch (SERVER_URL) and open
http://<laptop-IP>:5000 on the phone.
"""

import csv
import os
import socket
import threading
import time

from flask import Flask, jsonify, request, send_from_directory

PORT = 5000
STALE_AFTER_S = 10  # no valid POST for this long -> the app shows "Stale"
PROTOCOL_VERSION = 3  # the app checks this; 3 = STM32 "PLANT MONITOR V3" line format

# Day/night for the app, from this laptop's clock (local time, 24 h).
# The STM32 has no way to receive this (one-way wire), so it is used by the app only.
DAY_START_HOUR = 6    # 06:00 counts as day
DAY_END_HOUR = 18     # 18:00 onwards counts as night

HERE = os.path.dirname(os.path.abspath(__file__))
APP_DIST = os.path.normpath(os.path.join(HERE, "..", "app", "dist"))
CSV_PATH = os.path.join(HERE, "readings.csv")

STATUS_NAMES = {0: "HIGH STRESS", 1: "MODERATE STRESS", 2: "SUITABLE"}
WARN_NAMES = ("NONE", "NEEDS WATER", "SOIL TOO WET", "NEEDS MORE LIGHT", "TOO MUCH LIGHT",
              "HUMIDITY LOW", "HUMIDITY HIGH")
MAX_MINUTES = 0xFFFFFFFF // 60
# Reading fields sent by the NodeMCU (see PROTOCOL.md), with their allowed ranges.
INT_FIELDS = {
    "seq": (0, 2**32), "esp_uptime_ms": (0, 2**32), "ml_class": (0, 2),
    "ml_provisional": (0, 1), "day": (-1, 1),
    "sunlight_pct": (0, 100), "soil_pct": (0, 100), "hum_rh_est": (0, 100),
    "ldr_adc": (0, 4095), "hum_adc": (0, 4095), "soil_raw": (0, 4095),
    "low_light_min": (0, MAX_MINUTES), "high_light_min": (0, MAX_MINUTES),
}
DIAG_FIELDS = ("esp_valid_lines", "esp_invalid_lines", "uart_bytes", "rssi", "bridge_version")
CSV_FIELDS = ["received_at_iso", "server_seq", "esp_ip", "laptop_is_day", "plant", "ml_class",
              "ml_status", "ml_provisional", "day", "sunlight_pct", "soil_pct", "hum_rh_est",
              "ldr_adc", "hum_adc", "soil_raw", "low_light_min", "high_light_min",
              "warn1", "warn2", "seq", "esp_uptime_ms"]

app = Flask(__name__, static_folder=None)
lock = threading.Lock()
state = {
    "reading": None,       # last valid reading (dict, same fields the app expects)
    "received_at": None,   # time.time() of that reading
    "server_seq": 0,       # increases by 1 per accepted reading
    "posts_ok": 0,
    "posts_rejected": 0,
    "last_reject_reason": "",
    "last_reject_at": None,
    "esp_ip": None,
    "diag": {},
}


OLD_SKETCH_REASON = "old NodeMCU sketch: upload the new prototype.ino"


def is_int(v, lo, hi):
    return isinstance(v, int) and not isinstance(v, bool) and lo <= v <= hi


def validate(d):
    """Returns (clean_reading, None) or (None, reason)."""
    if not isinstance(d, dict):
        return None, "body is not a JSON object"
    if "sunlight_pct" not in d and ("pot_adc" in d or "temp_c_assumed" in d):
        return None, OLD_SKETCH_REASON
    if d.get("plant") not in ("ALOE_VERA", "POTHOS"):
        return None, "plant"
    for k, (lo, hi) in INT_FIELDS.items():
        if not is_int(d.get(k), lo, hi):
            return None, k
    if d.get("ml_status") != STATUS_NAMES[d["ml_class"]]:
        return None, "ml_status does not match ml_class"
    for k in ("warn1", "warn2"):
        if d.get(k) not in WARN_NAMES:
            return None, k
    clean = {"type": "reading", "plant": d["plant"], "ml_status": d["ml_status"],
             "warn1": d["warn1"], "warn2": d["warn2"]}
    clean.update({k: d[k] for k in INT_FIELDS})
    return clean, None


def laptop_clock():
    """Day/night from this laptop's local clock."""
    t = time.localtime()
    is_day = DAY_START_HOUR <= t.tm_hour < DAY_END_HOUR
    return {"is_day": is_day, "laptop_time": time.strftime("%Y-%m-%dT%H:%M:%S", t),
            "day_start_hour": DAY_START_HOUR, "day_end_hour": DAY_END_HOUR}


def rotate_old_csv():
    """If readings.csv was written by an older version (different columns), keep it under a new name."""
    if not os.path.exists(CSV_PATH):
        return
    try:
        with open(CSV_PATH, newline="") as f:
            header = next(csv.reader(f), None)
    except OSError:
        return
    if header and header != CSV_FIELDS:
        old = os.path.join(HERE, time.strftime("readings_old_%Y%m%d_%H%M%S.csv"))
        try:
            os.replace(CSV_PATH, old)
            print(f"  Old-format readings.csv kept as {os.path.basename(old)}; starting a new readings.csv")
        except OSError as e:
            print(f"  [csv] could not rename the old readings.csv: {e}")


def append_csv(row):
    new_file = not os.path.exists(CSV_PATH)
    try:
        with open(CSV_PATH, "a", newline="") as f:
            w = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
            if new_file:
                w.writeheader()
            w.writerow(row)
    except OSError as e:  # e.g. the CSV is open in Excel
        print(f"[csv] could not write: {e}")


@app.after_request
def allow_cross_origin(resp):
    # Lets the app also work when it is served from another port (e.g. node serve.mjs on 8080).
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    if request.path.startswith("/assets/"):
        # Built files have a content hash in their name, so they can be cached forever.
        resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    else:
        # The API and the page itself must never come from the phone's cache. A cached old page
        # keeps running old code that rejects new readings, so the app looks frozen.
        resp.headers["Cache-Control"] = "no-store"
    return resp


@app.route("/api/readings", methods=["POST", "OPTIONS"])
def post_reading():
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json(silent=True)
    clean, reason = validate(data)
    with lock:
        if clean is None:
            state["posts_rejected"] += 1
            state["last_reject_reason"] = reason
            state["last_reject_at"] = time.time()
            print(f"[post] REJECTED ({reason}) from {request.remote_addr}: {request.get_data(as_text=True)[:200]}")
            return jsonify(ok=False, error=reason), 400
        clean["laptop_is_day"] = laptop_clock()["is_day"]
        state["server_seq"] += 1
        state["reading"] = clean
        state["received_at"] = time.time()
        state["posts_ok"] += 1
        state["esp_ip"] = request.remote_addr
        state["diag"] = {k: data[k] for k in DIAG_FIELDS if is_int(data.get(k), -1000, 2**32)}
        seq = state["server_seq"]
    warns = ", ".join(w for w in (clean["warn1"], clean["warn2"]) if w != "NONE") or "no warnings"
    print(f"[post] #{seq} from {request.remote_addr}: {clean['plant']} {clean['ml_status']} "
          f"soil={clean['soil_pct']}% hum={clean['hum_rh_est']}% sun={clean['sunlight_pct']}% "
          f"({'day' if clean['laptop_is_day'] else 'night'} by laptop clock; {warns})")
    append_csv({**clean, "server_seq": seq, "esp_ip": request.remote_addr,
                "received_at_iso": time.strftime("%Y-%m-%dT%H:%M:%S")})
    return jsonify(ok=True, server_seq=seq)


@app.route("/api/latest")
def latest():
    with lock:
        r = state["reading"]
        age_ms = int((time.time() - state["received_at"]) * 1000) if state["received_at"] else None
        diag = state["diag"]
        status = {
            "type": "status",
            "stm32_link": "ok" if age_ms is not None and age_ms <= STALE_AFTER_S * 1000 else "stale",
            "last_line_age_ms": age_ms,
            # ESP uptime now = uptime when it sent the reading + time since then
            "esp_uptime_ms": min(r["esp_uptime_ms"] + (age_ms or 0), 2**32) if r else 0,
            "valid_lines": diag.get("esp_valid_lines", state["posts_ok"]),
            "invalid_lines": diag.get("esp_invalid_lines", 0),
            "clients": None,
        }
        return jsonify(
            reading=r,
            reading_age_ms=age_ms,
            server_seq=state["server_seq"],
            status=status,
            clock=laptop_clock(),
            protocol=PROTOCOL_VERSION,
            server={"posts_ok": state["posts_ok"], "posts_rejected": state["posts_rejected"],
                    "last_reject_reason": state["last_reject_reason"],
                    "last_reject_age_ms": int((time.time() - state["last_reject_at"]) * 1000)
                    if state["last_reject_at"] else None,
                    "esp_ip": state["esp_ip"],
                    "uart_bytes": diag.get("uart_bytes"), "rssi": diag.get("rssi"),
                    "bridge_version": diag.get("bridge_version")},
        )


@app.route("/api/health")
def health():
    return jsonify(ok=True, time=time.time())


# ---------- the web app (built files in app/dist) ----------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def web_app(path):
    if not os.path.isfile(os.path.join(APP_DIST, "index.html")):
        return ("App not built. In the app folder run: npm install && npm run build", 500)
    target = os.path.join(APP_DIST, path)
    if path and os.path.isfile(target):
        return send_from_directory(APP_DIST, path)
    return send_from_directory(APP_DIST, "index.html")


def laptop_ips():
    ips = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))  # no packet is sent; just picks the active interface
        ips.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass
    return sorted(ip for ip in ips if not ip.startswith("127."))


if __name__ == "__main__":
    print("PlantCare AI server")
    ips = laptop_ips()
    if ips:
        for ip in ips:
            print(f"  App (open on phone):        http://{ip}:{PORT}")
            print(f"  NodeMCU SERVER_URL:         http://{ip}:{PORT}/api/readings")
    else:
        print("  Could not detect the laptop IP. Run ipconfig and use the hotspot adapter's IPv4 address.")
    rotate_old_csv()
    print(f"  Readings are logged to {CSV_PATH}")
    c = laptop_clock()
    print(f"  Laptop clock {c['laptop_time']}: {'day' if c['is_day'] else 'night'} "
          f"(day = {DAY_START_HOUR}:00 to {DAY_END_HOUR}:00, change DAY_START_HOUR / DAY_END_HOUR at the top)")
    if not os.path.isfile(os.path.join(APP_DIST, "index.html")):
        print(f"  WARNING: app not found at {APP_DIST}. Build it with: cd app && npm install && npm run build")
    app.run(host="0.0.0.0", port=PORT, threaded=True)
