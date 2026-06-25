# 표시 계층 — 부작용 격리.
#   DryRunPlayer: 로그만 → 하드웨어 없이 로직 검증.
#   MpvPlayer   : 실제 — mpv를 --idle로 띄우고 JSON IPC 소켓으로 제어(파이에서 튜닝).
#   원칙: 무슨 일이 있어도 검은화면 금지 → 폴백은 항상 standby.
import json
import logging
import socket
import subprocess
import time

log = logging.getLogger("memoria.player")


class Player:
    def show_video(self, path): raise NotImplementedError
    def show_image(self, path): raise NotImplementedError
    def show_standby(self): raise NotImplementedError
    def set_notice(self, text): pass
    def set_volume(self, volume, muted): pass
    def restart(self): pass
    def stop(self): pass


class DryRunPlayer(Player):
    """노트북 검증용 — 실제 재생 대신 '무엇을 표시할지'만 로그."""
    def __init__(self):
        self.now = None

    def _set(self, what):
        if what != self.now:
            log.info("[화면] ▶ %s", what)
            self.now = what

    def show_video(self, path): self._set("VIDEO " + str(path))
    def show_image(self, path): self._set("IMAGE " + str(path))
    def show_standby(self): self._set("STANDBY(대기화면)")
    def set_notice(self, text): log.info("[화면] 알림문구: %s", text)
    def set_volume(self, volume, muted): log.info("[화면] 음량=%s 음소거=%s", volume, muted)
    def restart(self): log.info("[화면] 플레이어 재시작")
    def stop(self): log.info("[화면] 정지")


class MpvPlayer(Player):
    """실제 mpv 제어. 표시·디코드·루프는 mpv가 담당, 우리는 IPC로 '무엇을' 지시."""
    def __init__(self, socket_path="/tmp/mpv-memoria.sock", standby="/opt/memoria/standby.png"):
        self.sock_path = socket_path
        self.standby_path = standby
        self.now = None
        self._spawn()

    def _spawn(self):
        subprocess.Popen([
            "mpv", "--idle=yes", "--force-window=yes", "--fullscreen",
            "--no-osc", "--no-input-default-bindings", "--cursor-autohide=always",
            "--image-display-duration=inf", "--loop-file=inf",
            "--input-ipc-server=" + self.sock_path,
        ])
        time.sleep(1.0)
        self.now = None
        self.show_standby()

    def _cmd(self, *args):
        try:
            s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            s.connect(self.sock_path)
            s.sendall((json.dumps({"command": list(args)}) + "\n").encode("utf-8"))
            s.close()
        except OSError as e:
            log.warning("mpv 명령 실패: %s", e)

    def _load(self, path, tag):
        if tag == self.now:
            return
        self._cmd("loadfile", path, "replace")
        self.now = tag

    def show_video(self, path): self._load(path, "v:" + path)
    def show_image(self, path): self._load(path, "i:" + path)
    def show_standby(self): self._load(self.standby_path, "standby")

    def set_notice(self, text):
        # 간이 오버레이(추후 파이에서 ASS osd-overlay로 고도화)
        self._cmd("show-text", text, 3600000)

    def set_volume(self, volume, muted):
        self._cmd("set_property", "volume", max(0, min(100, int(volume or 0))))
        self._cmd("set_property", "mute", bool(muted))

    def restart(self):
        self._cmd("quit")
        time.sleep(0.5)
        self._spawn()

    def stop(self):
        self.show_standby()
