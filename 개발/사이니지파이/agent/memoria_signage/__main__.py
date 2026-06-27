# 진입점 + CLI.
#   파이(운영):   python -m memoria_signage            (provision.json 자동 사용)
#   노트북 검증:  python -m memoria_signage --fake --dry-run        (백엔드 없이 로직만)
#                python -m memoria_signage --dry-run --server <URL> --code <코드>   (실서버 연동)
import argparse
import logging

from . import __version__
from .agent import Agent
from .api import Api
from .cache import Cache
from .config import Config, DEFAULT_PROVISION, DEFAULT_STATE_DIR, DEFAULT_CACHE_DIR, POLL_INTERVAL
from .player import DryRunPlayer, MpvPlayer

log = logging.getLogger("memoria.main")

INSTALL_DIR = "/opt/memoria"   # OTA 레이아웃 루트(current -> versions/<ver>)


class FakeApi:
    """백엔드 없이 로직만 — 등록은 가짜 토큰, sync는 샘플 응답(영상↔대기 번갈아)."""
    def __init__(self):
        self.n = 0

    def enroll(self, code, ip=None, hw=None):
        return "FAKE-TOKEN"

    def sync(self, token, ip=None, current_video_id=None):
        self.n += 1
        if self.n % 3 == 0:
            return {"ok": True, "mode": "대기", "volume": 50, "muted": False, "content": {"kind": "none"}}
        return {
            "ok": True, "mode": "제작영상", "volume": 70, "muted": False, "cmd": None,
            "content": {"kind": "video", "id": "V-DEMO", "url": "fake://demo.mp4", "expires_at": None},
        }


def main(argv=None):
    p = argparse.ArgumentParser(prog="memoria_signage", description="메모리아 사이니지 파이 에이전트")
    p.add_argument("--provision", help="provision.json 경로 (기본 %s)" % DEFAULT_PROVISION)
    p.add_argument("--server", help="엣지함수 베이스 URL (provision보다 우선)")
    p.add_argument("--code", help="등록코드 (테스트 — provision 없이)")
    p.add_argument("--dry-run", action="store_true", help="실제 재생·다운로드 안 함(로그만)")
    p.add_argument("--fake", action="store_true", help="백엔드 없이 가짜 응답으로 로직만 검증")
    p.add_argument("--once", action="store_true", help="한 사이클만 실행 후 종료")
    a = p.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s", datefmt="%H:%M:%S")
    testing = a.dry_run or a.fake

    cfg = Config(
        provision_path=a.provision or DEFAULT_PROVISION,
        state_dir="./.memoria-state" if testing else DEFAULT_STATE_DIR,
        cache_dir="./.memoria-cache" if testing else DEFAULT_CACHE_DIR,
    )
    prov = cfg.load_provision()
    server = a.server or prov.get("server")
    code = a.code or ("FAKE" if a.fake else prov.get("code"))
    if a.server or a.code or a.fake:                       # CLI 오버라이드(테스트 편의)
        cfg.load_provision = lambda: {"code": code, "server": server}

    # OTA 자기업데이트 — 부팅 시 1회만(재생 도중 아님). 새 버전이면 교체 후 종료 → systemd 재시작.
    if not testing and prov.get("update_url"):
        from .updater import check_and_update
        applied = check_and_update(prov["update_url"], INSTALL_DIR, __version__)
        if applied:
            log.info("업데이트 %s 적용 — 재시작", applied)
            return

    if a.fake:
        api = FakeApi()
    elif server:
        api = Api(server)
    else:
        p.error("서버 주소 필요 — --server 또는 provision.json")
        return

    cache = Cache(cfg.cache_dir, enabled=not testing)
    player = DryRunPlayer() if testing else MpvPlayer()
    reboot = (lambda: log.info("[테스트] reboot 호출됨")) if testing else None

    # 네트워크 보장 — 랜선이면 즉시 통과, 와이파이 미설정이면 캡티브 포털로 현장 입력(실모드만).
    if not testing and server:
        from .netsetup import ensure_network, NmcliWifi
        ensure_network(prov, NmcliWifi(), player, server + "/device-sync")

    try:
        Agent(cfg, api, cache, player, poll=POLL_INTERVAL, reboot=reboot).run(once=a.once)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
