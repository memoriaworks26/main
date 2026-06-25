# 에이전트 본체(두뇌) — 등록 → 폴링 → 콘텐츠 반영 → 명령 실행.
#   부작용은 api/cache/player에 위임 → 이 파일은 '무엇을 언제' 결정하는 순수 흐름.
#   검은화면 금지: 어떤 실패(네트워크·다운로드)에도 화면을 비우지 않고 직전/대기화면 유지.
import logging
import os
import time

from .api import ApiError, local_ip

log = logging.getLogger("memoria.agent")


class Agent:
    def __init__(self, config, api, cache, player, poll=3, reboot=None):
        self.cfg = config
        self.api = api
        self.cache = cache
        self.player = player
        self.poll = poll
        self.reboot = reboot or (lambda: os.system("sudo reboot"))
        self.token = None
        self.current_video_id = None
        self.last_volume = None

    # ── 등록(토큰 확보) ──
    def ensure_token(self):
        self.token = self.cfg.load_token()
        if self.token:
            return True
        code = self.cfg.load_provision().get("code")
        if not code:
            log.error("등록코드 없음(provision.json) — 등록 불가")
            return False
        try:
            self.token = self.api.enroll(code, ip=local_ip())
            self.cfg.save_token(self.token)
            log.info("등록 완료 — 토큰 저장")
            return True
        except ApiError as e:
            log.warning("등록 실패: %s", e)
            return False

    # ── 한 번의 동기화 사이클 ──
    def tick(self):
        try:
            resp = self.api.sync(self.token, ip=local_ip(), current_video_id=self.current_video_id)
        except ApiError as e:
            log.warning("sync 실패(%s) — 현재 화면 유지", e)   # 끊겨도 검은화면 금지
            return
        if resp.get("error") == "unauthorized device":
            log.warning("토큰 무효(폐기됨) — 토큰 삭제 후 재등록")
            self.cfg.clear_token()
            self.token = None
            return
        self._apply(resp)

    def _apply(self, resp):
        # 음량(변경 시에만)
        vol = (resp.get("volume"), resp.get("muted"))
        if vol != self.last_volume:
            self.player.set_volume(resp.get("volume"), resp.get("muted"))
            self.last_volume = vol

        # 일회성 명령
        if resp.get("cmd"):
            self._run_cmd(resp["cmd"])

        # 콘텐츠
        content = resp.get("content") or {"kind": "none"}
        kind = content.get("kind")
        nxt = resp.get("next") or {}
        if kind == "video":
            vid, url = content.get("id"), content.get("url")
            self.cache.keep_only([vid, nxt.get("id")])     # 현재(+서버가 주면 다음) 외 삭제
            if nxt.get("id") and nxt.get("url"):
                self.cache.ensure(nxt["id"], nxt["url"])    # 다음 영상 미리 받기(빈틈 방지)
            path = self.cache.ensure(vid, url)
            if path:
                self.player.show_video(path)
                self.current_video_id = vid
            else:
                self.player.show_standby()                  # 다운로드 전/실패 → 대기화면
        elif kind == "image":
            path = self.cache.ensure(content.get("id"), content.get("url"))
            self.player.show_image(path) if path else self.player.show_standby()
            self.current_video_id = None
        else:
            self.player.show_standby()
            self.current_video_id = None

        # 알림 오버레이(알림 모드)
        notice = resp.get("notice")
        if notice and notice.get("enabled") and notice.get("text"):
            self.player.set_notice(notice["text"])

    def _run_cmd(self, cmd):
        log.info("명령 수신: %s", cmd)
        if cmd == "restart":
            self.player.restart()
            self.current_video_id = None      # 재시작 후 다음 틱에 재반영
        elif cmd == "reboot":
            self.reboot()
        elif cmd == "refresh":
            self.current_video_id = None
        elif cmd == "redownload":
            self.cache.keep_only([])          # 캐시 비우고 다음 틱에 재다운로드
            self.current_video_id = None

    # ── 메인 루프 ──
    def run(self, once=False):
        self.player.show_standby()            # 부팅 즉시 대기화면(검은화면 금지)
        while not self.ensure_token():
            if once:
                return
            time.sleep(10)
        while True:
            self.tick()
            if once:
                return
            time.sleep(self.poll)
