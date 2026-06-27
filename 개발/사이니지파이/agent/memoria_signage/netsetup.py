# 부팅 시 네트워크 보장 — 랜선=제로터치 / 와이파이=캡티브 포털.
#   원칙(유가족 앞): 검은화면 금지. 설정 중에도 TV엔 안내문구(대기화면 위 오버레이).
#   흐름: ①인터넷 되면 그대로 진행(랜선/기존 와이파이) → ②provision.json 와이파이 시도
#        → ③그래도 안 되면 파이가 핫스팟 + 캡티브 포털 띄움 → 폰으로 SSID/비번 입력 → 연결.
#   부작용(hostapd/nmcli/HTTP)은 WifiManager·portal로 격리 → 하드웨어 없이 로직 테스트 가능.
import logging
import socket
import subprocess
import threading
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

log = logging.getLogger("memoria.net")

SETUP_SSID = "Memoria-Setup"
SETUP_PW = "memoria1234"


def has_internet(url, timeout=4):
    """서버(엣지함수)에 닿으면 True. 못 닿으면 DNS(1.1.1.1:53)로 2차 확인."""
    try:
        urllib.request.urlopen(url, timeout=timeout)
        return True
    except Exception:
        try:
            socket.create_connection(("1.1.1.1", 53), timeout=timeout).close()
            return True
        except OSError:
            return False


class WifiManager:
    def connect(self, ssid, password): raise NotImplementedError
    def start_hotspot(self, ssid, password): raise NotImplementedError
    def stop_hotspot(self): pass


class DryRunWifi(WifiManager):
    """노트북 검증용 — 실제 무선 제어 없이 로그만."""
    def __init__(self, connect_ok=True):
        self.connect_ok = connect_ok
        self.connected = None

    def connect(self, ssid, password):
        log.info("[wifi] connect ssid=%s", ssid)
        if self.connect_ok:
            self.connected = ssid
        return self.connect_ok

    def start_hotspot(self, ssid, password):
        log.info("[wifi] 핫스팟 시작 ssid=%s", ssid)
        return "10.42.0.1"

    def stop_hotspot(self):
        log.info("[wifi] 핫스팟 종료")


class NmcliWifi(WifiManager):
    """실제 — NetworkManager(nmcli). 라즈베리파이 OS(Bookworm)는 NM 기본."""
    def _run(self, *args, timeout=40):
        return subprocess.run(["nmcli", *args], capture_output=True, text=True, timeout=timeout)

    def connect(self, ssid, password):
        try:
            r = self._run("device", "wifi", "connect", ssid, "password", password)
            if r.returncode != 0:
                log.warning("wifi 연결 실패: %s", (r.stderr or "").strip())
                return False
            return True
        except (OSError, subprocess.SubprocessError) as e:
            log.warning("nmcli 오류: %s", e)
            return False

    def start_hotspot(self, ssid, password):
        try:
            self._run("device", "wifi", "hotspot", "ssid", ssid, "password", password)
        except (OSError, subprocess.SubprocessError) as e:
            log.warning("핫스팟 오류: %s", e)
        return "10.42.0.1"   # NM 핫스팟 기본 게이트웨이

    def stop_hotspot(self):
        try:
            self._run("connection", "down", "Hotspot")
        except (OSError, subprocess.SubprocessError):
            pass


_PAGE = (
    "<!doctype html><meta charset=utf-8>"
    "<meta name=viewport content='width=device-width,initial-scale=1'>"
    "<title>Memoria 사이니지 설정</title>"
    "<body style='font-family:sans-serif;max-width:380px;margin:36px auto;padding:0 16px;color:#2a2a2a'>"
    "<h2 style='font-weight:700'>호실 사이니지 와이파이 설정</h2>"
    "{msg}"
    "<form method=post>"
    "<label>와이파이 이름(SSID)<br><input name=ssid autocapitalize=off style='width:100%;padding:10px;margin:6px 0;font-size:16px'></label>"
    "<label>비밀번호<br><input name=password type=password style='width:100%;padding:10px;margin:6px 0;font-size:16px'></label>"
    "<button style='width:100%;padding:13px;margin-top:10px;background:#b08a3e;color:#fff;border:0;border-radius:8px;font-size:16px'>연결</button>"
    "</form></body>"
)


def run_portal(host="0.0.0.0", port=80, timeout=900):
    """캡티브 포털 — SSID/비번 입력 폼. 제출되면 {ssid,password} 반환(시간초과면 None)."""
    creds, done = {}, threading.Event()

    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_GET(self):
            self._send(_PAGE.format(msg=""))

        def do_POST(self):
            n = int(self.headers.get("Content-Length", 0) or 0)
            q = urllib.parse.parse_qs(self.rfile.read(n).decode("utf-8"))
            creds["ssid"] = (q.get("ssid", [""])[0]).strip()
            creds["password"] = q.get("password", [""])[0]
            self._send("<body style='font-family:sans-serif;text-align:center;margin-top:60px'>"
                       "<h2>연결을 시도합니다…</h2><p>TV 화면을 확인해 주세요.</p></body>")
            done.set()

        def _send(self, html):
            b = html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(b)))
            self.end_headers()
            self.wfile.write(b)

    srv = HTTPServer((host, port), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    ok = done.wait(timeout)
    srv.shutdown()
    return creds if ok else None


def ensure_network(prov, wifi, player, server_url, deadline=900,
                   portal=run_portal, has_net=has_internet):
    """네트워크 보장. 성공 True. 검은화면 금지(설정 중 안내문구 표시)."""
    if has_net(server_url):
        log.info("네트워크 OK — 진행")
        return True

    # provision.json에 와이파이 있으면 먼저 시도(현장 사전입력 케이스)
    w = prov.get("wifi") or {}
    if w.get("ssid"):
        log.info("provision 와이파이 연결 시도: %s", w["ssid"])
        if wifi.connect(w["ssid"], w.get("password", "")) and has_net(server_url):
            return True

    # 캡티브 포털 — 파이가 핫스팟 + 설정 페이지
    gw = wifi.start_hotspot(SETUP_SSID, SETUP_PW)
    player.show_standby()
    player.set_notice(
        "인터넷 설정이 필요합니다\n"
        "① 휴대폰 와이파이에서 '%s' 선택 (비번 %s)\n"
        "② 브라우저에서 http://%s 접속\n"
        "③ 식장 와이파이 이름·비번 입력" % (SETUP_SSID, SETUP_PW, gw)
    )
    creds = portal(timeout=deadline)
    wifi.stop_hotspot()
    if not creds or not creds.get("ssid"):
        log.warning("설정 시간초과 — 대기화면 유지")
        return False

    ok = wifi.connect(creds["ssid"], creds.get("password", "")) and has_net(server_url)
    if ok:
        player.set_notice("")
        log.info("와이파이 연결 성공: %s", creds["ssid"])
    else:
        log.warning("입력한 와이파이로 연결 실패: %s", creds["ssid"])
    return ok
