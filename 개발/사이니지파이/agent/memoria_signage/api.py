# 서버 API 클라이언트(device-enroll / device-sync) — 표준 라이브러리만(외부 의존성 0).
import json
import socket
import urllib.error
import urllib.request


class ApiError(Exception):
    pass


def local_ip():
    """하트비트용 자기 IP(콘솔 표시). 실패해도 무시."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return None


class Api:
    def __init__(self, server, timeout=10):
        self.server = server.rstrip("/")   # 예: https://xxx.supabase.co/functions/v1
        self.timeout = timeout

    def _post(self, path, body):
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            self.server + path, data=data,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            try:
                msg = json.loads(e.read().decode("utf-8")).get("error", str(e))
            except (ValueError, OSError):
                msg = str(e)
            raise ApiError("%s %s: %s" % (path, e.code, msg))
        except (urllib.error.URLError, socket.timeout, OSError) as e:
            raise ApiError("%s 연결 실패: %s" % (path, e))

    def enroll(self, code, ip=None):
        r = self._post("/device-enroll", {"code": code, "ip": ip})
        if not r.get("ok") or not r.get("token"):
            raise ApiError("등록 거부: " + str(r.get("error") or r))
        return r["token"]

    def sync(self, token, ip=None, current_video_id=None):
        return self._post("/device-sync", {"token": token, "ip": ip, "current_video_id": current_video_id})
