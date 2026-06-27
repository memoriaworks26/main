# 네트워크 보장(캡티브 포털) + 라이브컨트롤 정지/재생 — 하드웨어·HTTP 없이 로직만.
import unittest

from memoria_signage.agent import Agent
from memoria_signage.cache import Cache
from memoria_signage.player import DryRunPlayer
from memoria_signage.netsetup import ensure_network, DryRunWifi


class RecPlayer(DryRunPlayer):
    def __init__(self):
        super().__init__()
        self.paused = None
        self.notices = []

    def set_paused(self, paused):
        self.paused = paused

    def set_notice(self, text):
        self.notices.append(text)


class FakeApi:
    def __init__(self, resp):
        self.resp = resp
    def enroll(self, code, ip=None, hw=None):
        return "T"
    def sync(self, token, ip=None, current_video_id=None):
        return self.resp


class TestEnsureNetwork(unittest.TestCase):
    def test_internet_ok_no_hotspot(self):
        wifi = DryRunWifi()
        started = []
        wifi.start_hotspot = lambda *a: started.append(1) or "10.42.0.1"
        ok = ensure_network({}, wifi, RecPlayer(), "http://s", has_net=lambda u: True)
        self.assertTrue(ok)
        self.assertEqual(started, [])           # 랜선=핫스팟 안 띄움

    def test_provision_wifi_connects(self):
        calls = {"n": 0}
        def has_net(u):                          # 처음 False, connect 뒤 True
            calls["n"] += 1
            return calls["n"] > 1
        wifi = DryRunWifi(connect_ok=True)
        ok = ensure_network({"wifi": {"ssid": "Venue", "password": "p"}}, wifi, RecPlayer(), "http://s", has_net=has_net)
        self.assertTrue(ok)
        self.assertEqual(wifi.connected, "Venue")

    def test_captive_portal_flow(self):
        seq = iter([False, True])                # 초기 인터넷X → 포털입력·연결 후 O (has_net 2회)
        wifi = DryRunWifi(connect_ok=True)
        player = RecPlayer()
        ok = ensure_network(
            {}, wifi, player, "http://s",
            portal=lambda timeout=0: {"ssid": "VenueWifi", "password": "pw"},
            has_net=lambda u: next(seq),
        )
        self.assertTrue(ok)
        self.assertEqual(wifi.connected, "VenueWifi")
        self.assertTrue(any("Memoria-Setup" in (n or "") for n in player.notices))  # 안내문구 노출

    def test_captive_timeout_keeps_standby(self):
        wifi = DryRunWifi()
        ok = ensure_network({}, wifi, RecPlayer(), "http://s",
                            portal=lambda timeout=0: None, has_net=lambda u: False)
        self.assertFalse(ok)                     # 시간초과 → 실패 반환(검은화면 아님)


class TestLiveControlPaused(unittest.TestCase):
    def _agent(self, resp):
        p = RecPlayer()
        a = Agent(None, FakeApi(resp), Cache("/tmp/x", enabled=False), p, poll=0)
        a.token = "T"
        a.tick()
        return p

    def test_paused_true_applied(self):
        p = self._agent({"ok": True, "mode": "대기", "paused": True, "content": {"kind": "none"}})
        self.assertTrue(p.paused)

    def test_paused_false_applied(self):
        p = self._agent({"ok": True, "mode": "제작영상", "paused": False,
                         "content": {"kind": "none"}})
        self.assertFalse(p.paused)


if __name__ == "__main__":
    unittest.main()
