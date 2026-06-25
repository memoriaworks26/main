# 영상 로컬 캐시 — video_id로 1회 다운로드, 보관 대상(현재+다음)만 남기고 삭제(개인정보).
import logging
import os
import urllib.parse
import urllib.request

log = logging.getLogger("memoria.cache")


class Cache:
    def __init__(self, cache_dir, enabled=True):
        self.dir = cache_dir
        self.enabled = enabled           # False = 드라이런(다운로드 안 하고 '의도'만 로그)
        if enabled:
            os.makedirs(cache_dir, exist_ok=True)

    def _list(self):
        try:
            return os.listdir(self.dir)
        except FileNotFoundError:
            return []

    def _existing(self, vid):
        for f in self._list():
            if f.split(".")[0] == vid:
                return os.path.join(self.dir, f)
        return None

    def _target(self, vid, url):
        ext = os.path.splitext(urllib.parse.urlparse(url).path)[1] or ".mp4"
        return os.path.join(self.dir, vid + ext)

    def ensure(self, vid, url):
        """video_id 파일이 없으면 다운로드. 반환: 로컬 경로(드라이런=가상 경로, 실패=None)."""
        hit = self._existing(vid)
        if hit:
            return hit
        target = self._target(vid, url)
        if not self.enabled:
            log.info("[드라이런] 다운로드 생략 — %s ← %s", os.path.basename(target), str(url)[:60])
            return target
        tmp = target + ".part"
        try:
            log.info("다운로드 시작 %s", vid)
            urllib.request.urlretrieve(url, tmp)
            os.replace(tmp, target)       # 원자적 교체(부분파일 재생 방지)
            log.info("다운로드 완료 %s", os.path.basename(target))
            return target
        except Exception as e:                       # noqa: BLE001 — 어떤 실패든 폴백
            log.warning("다운로드 실패 %s: %s", vid, e)
            try:
                os.remove(tmp)
            except OSError:
                pass
            return None

    def keep_only(self, ids):
        """보관 대상(현재+다음) 외 파일 삭제 — 만료·교체분. 식 끝난 영상 즉시 제거(개인정보)."""
        keep = {i for i in ids if i}
        for f in self._list():
            if f.endswith(".part"):
                continue
            if f.split(".")[0] not in keep:
                try:
                    os.remove(os.path.join(self.dir, f))
                    log.info("캐시 삭제 %s", f)
                except OSError:
                    pass
