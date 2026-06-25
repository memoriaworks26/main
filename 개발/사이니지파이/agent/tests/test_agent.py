# 에이전트 두뇌 로직 검증 — 하드웨어·백엔드 없이(가짜 api + 드라이런 플레이어 + 비활성 캐시).
#   실행:  cd 개발/사이니지파이/agent && python -m unittest -v
import unittest

from memoria_signage.agent import Agent
from memoria_signage.cache import Cache
from memoria_signage.config import Config
from memoria_signage.player import DryRunPlayer


class FakeApi:
    def __init__(self, responses):
        self.responses = responses
        self.i = 0
        self.synced = []          # 매 sync에 보고된 current_video_id 기록

    def enroll(self, code, ip=None):
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


if __name__ == "__main__":
    unittest.main()
