# 설정·경로·상태(토큰) 저장. 부작용 최소(파일 IO만). 파이/노트북 공통.
import json
import os

# provision.json: SD 루트(/boot)에 출고 시 넣는 부팅 설정 — { device, code, server, wifi }
DEFAULT_PROVISION = "/boot/provision.json"
# 런타임 상태(토큰)·캐시 — 파이의 영속 파티션
DEFAULT_STATE_DIR = os.environ.get("MEMORIA_STATE", "/var/lib/memoria-signage")
DEFAULT_CACHE_DIR = os.environ.get("MEMORIA_CACHE", "/var/lib/memoria-signage/cache")

POLL_INTERVAL = 3        # device-sync 폴링 주기(초)
ENROLL_RETRY = 10        # 등록 실패 시 재시도 간격(초)


class Config:
    def __init__(self, provision_path=DEFAULT_PROVISION, state_dir=DEFAULT_STATE_DIR, cache_dir=DEFAULT_CACHE_DIR):
        self.provision_path = provision_path
        self.state_dir = state_dir
        self.cache_dir = cache_dir
        self.token_path = os.path.join(state_dir, "token.json")

    def load_provision(self):
        try:
            with open(self.provision_path, encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, ValueError):
            return {}

    def load_token(self):
        try:
            with open(self.token_path, encoding="utf-8") as f:
                return json.load(f).get("token")
        except (FileNotFoundError, ValueError):
            return None

    def save_token(self, token):
        os.makedirs(self.state_dir, exist_ok=True)
        tmp = self.token_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump({"token": token}, f)
        os.replace(tmp, self.token_path)   # 원자적 저장

    def clear_token(self):
        try:
            os.remove(self.token_path)
        except FileNotFoundError:
            pass
