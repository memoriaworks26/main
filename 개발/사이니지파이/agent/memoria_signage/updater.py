# OTA 자기업데이트 — 현장 재방문 없이 에이전트 코드만 원격 갱신(함대 확장 대비).
#   매니페스트(JSON): { "version": "0.2.0", "url": "<tarball .tar.gz>", "sha256": "<hex>" }
#   레이아웃: /opt/memoria/current -> versions/<버전>.
#   안전성:
#     · 새 버전을 임시폴더에 받아 sha256 검증·압축해제 후에만 심링크를 원자적 교체(os.replace)
#     · 어느 단계든 실패하면 current는 그대로 → 깨진 코드로 안 바뀜
#     · 이전 버전 폴더 보존 → 롤백 가능
#     · 부팅 시에만 적용(재생 도중 교체 안 함) → systemd 재시작으로 새 코드 진입
import hashlib
import io
import json
import logging
import os
import tarfile
import tempfile
import urllib.request

log = logging.getLogger("memoria.updater")


def _ver_tuple(v):
    return tuple(int(x) for x in str(v).split(".") if x.isdigit())


def is_newer(remote, local):
    try:
        return _ver_tuple(remote) > _ver_tuple(local)
    except (TypeError, ValueError):
        return False


def fetch_manifest(url, timeout=10):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def apply_update(manifest, install_dir, timeout=60):
    """새 버전 설치 + current 심링크 원자적 교체. 반환: 적용한 버전(없으면 None). 실패 시 예외."""
    ver, url, sha = manifest.get("version"), manifest.get("url"), manifest.get("sha256")
    if not ver or not url:
        return None
    versions = os.path.join(install_dir, "versions")
    os.makedirs(versions, exist_ok=True)
    dest = os.path.join(versions, ver)

    if not os.path.isdir(dest):                       # 이미 받은 버전이면 재다운로드 생략
        with urllib.request.urlopen(url, timeout=timeout) as r:
            blob = r.read()
        if sha and hashlib.sha256(blob).hexdigest() != sha:
            raise ValueError("sha256 불일치 — 손상/위변조 의심, 적용 중단")
        tmp = tempfile.mkdtemp(dir=versions)          # 같은 파티션 → os.replace 원자적
        with tarfile.open(fileobj=io.BytesIO(blob)) as tf:
            tf.extractall(tmp)                        # tarball 최상위에 memoria_signage/ 포함
        os.replace(tmp, dest)

    cur = os.path.join(install_dir, "current")
    link_tmp = cur + ".new"
    try:
        os.remove(link_tmp)
    except OSError:
        pass
    os.symlink(dest, link_tmp)
    os.replace(link_tmp, cur)                         # 심링크 원자적 스왑
    return ver


def check_and_update(manifest_url, install_dir, local_version):
    """부팅 시 호출. 새 버전 적용했으면 버전 문자열 반환(호출자는 종료→재시작), 아니면 None."""
    try:
        manifest = fetch_manifest(manifest_url)
    except Exception as e:                            # noqa: BLE001 — 업데이트 실패는 치명적 아님
        log.warning("업데이트 확인 실패(현 버전 유지): %s", e)
        return None
    if not is_newer(manifest.get("version"), local_version):
        return None
    log.info("새 버전 %s 발견 → 설치", manifest.get("version"))
    try:
        return apply_update(manifest, install_dir)
    except Exception as e:                            # noqa: BLE001 — 적용 실패해도 현 버전으로 계속
        log.warning("업데이트 적용 실패(현 버전 유지): %s", e)
        return None
