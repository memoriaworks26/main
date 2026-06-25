# 에이전트 두뇌 로직 + OTA 검증 — 하드웨어·백엔드·네트워크 없이.
#   실행:  cd 개발/사이니지파이/agent && python3 -m unittest discover -s tests -v
import hashlib
import io
import os
import tarfile
import tempfile
import unittest

from memoria_signage.agent import Agent
from memoria_signage.cache import Cache
from memoria_signage.config import Config
from memoria_signage.player import DryRunPlayer
from memoria_signage import updater


class FakeApi:
    def __init__(self, responses):
        self.responses = responses
        self.i = 0
        self.synced = []          # 매 sync에 보고된 current_video_id 기록

    def enroll(self, code, ip=None, hw=None):
        return "T"

    def sync(self, token, ip=None, current_video_id=None):
        self.synced.append(current_video_id)
        r = self.responses[min(self.i, len(self.responses) - 1)]
        self.i += 1
        return r


def make_agent(responses):
    cfg = Config(provision_path="/nonexistent", state_dir="/tmp/m-state", cache_dir="/tmp/m-cache")
    cfg.load_provision = lambda: {"code": "X"}
    cfg.load_token = lambda: None
    cfg.save_token = lambda t: None
    cfg.clear_token = lambda: None
    api = FakeApi(responses)
    agent = Agent(cfg, api, Cache("/tmp/m-cache", enabled=False), DryRunPlayer(), poll=0)
    return agent, api


class AgentLogicTest(unittest.TestCase):
    def test_enroll(self):
        agent, _ = make_agent([{"content": {"kind": "none"}}])
        self.assertTrue(agent.ensure_token())
        self.assertEqual(agent.token, "T")

    def test_video_then_standby(self):
        agent, api = make_agent([
            {"ok": True, "volume": 70, "muted": False, "content": {"kind": "video", "id": "V1", "url": "fake://a.mp4"}},
            {"ok": True, "volume": 70, "muted": False, "content": {"kind": "none"}},
        ])
        agent.token = "T"
        agent.tick()
        self.assertEqual(agent.current_video_id, "V1")     # 영상 반영
        agent.tick()
        self.assertIsNone(agent.current_video_id)           # 대기로 전환
        self.assertEqual(api.synced[1], "V1")               # 직전 영상 id 보고(하트비트)

    def test_revoked_clears_token(self):
        agent, _ = make_agent([{"error": "unauthorized device"}])
        agent.token = "T"
        agent.tick()
        self.assertIsNone(agent.token)                      # 폐기 → 토큰 삭제

    def test_command_refresh_resets(self):
        agent, _ = make_agent([{"content": {"kind": "none"}, "cmd": "refresh"}])
        agent.token = "T"
        agent.current_video_id = "V9"
        agent.tick()
        self.assertIsNone(agent.current_video_id)           # refresh → 다음 틱 재반영


class UpdaterTest(unittest.TestCase):
    def test_is_newer(self):
        self.assertTrue(updater.is_newer("0.2.0", "0.1.0"))
        self.assertFalse(updater.is_newer("0.1.0", "0.1.0"))
        self.assertFalse(updater.is_newer("0.1.0", "0.2.0"))

    def test_apply_update_swaps_symlink(self):
        # 로컬 tarball(file://)로 OTA 적용 — 네트워크·하드웨어 없이 원자적 교체 검증.
        install = tempfile.mkdtemp()
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tf:
            data = b"new-version"
            ti = tarfile.TarInfo("memoria_signage/_marker.txt")
            ti.size = len(data)
            tf.addfile(ti, io.BytesIO(data))
        blob = buf.getvalue()
        tarpath = os.path.join(install, "pkg.tar.gz")
        with open(tarpath, "wb") as f:
            f.write(blob)
        manifest = {"version": "0.2.0", "url": "file://" + tarpath, "sha256": hashlib.sha256(blob).hexdigest()}

        ver = updater.apply_update(manifest, install)
        self.assertEqual(ver, "0.2.0")
        cur = os.path.join(install, "current")
        self.assertTrue(os.path.islink(cur))                # current는 심링크
        self.assertEqual(os.path.realpath(cur), os.path.realpath(os.path.join(install, "versions", "0.2.0")))
        self.assertTrue(os.path.exists(os.path.join(cur, "memoria_signage", "_marker.txt")))

    def test_apply_update_rejects_bad_sha(self):
        install = tempfile.mkdtemp()
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tf:
            ti = tarfile.TarInfo("memoria_signage/x.txt"); ti.size = 1
            tf.addfile(ti, io.BytesIO(b"y"))
        tarpath = os.path.join(install, "p.tar.gz")
        with open(tarpath, "wb") as f:
            f.write(buf.getvalue())
        manifest = {"version": "9.9.9", "url": "file://" + tarpath, "sha256": "deadbeef"}
        with self.assertRaises(ValueError):                 # 해시 불일치 → 적용 중단
            updater.apply_update(manifest, install)
        self.assertFalse(os.path.exists(os.path.join(install, "current")))   # current 안 만들어짐


if __name__ == "__main__":
    unittest.main()
