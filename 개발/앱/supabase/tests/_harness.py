# ─────────────────────────────────────────────────────────────
# 공용 검증 하네스 — RLS/권한 회귀 테스트의 공통 유틸.
#   시크릿은 전부 환경변수에서 읽는다(레포에 하드코딩 금지).
#   필요한 env: SB_REF, SB_PAT, SB_SERVICE_KEY, SB_ANON_KEY, SB_JWT_SECRET
#   (SB_URL은 SB_REF로 유도, 필요 시 override)
# 실행: supabase/tests/run.sh  (또는 env export 후 python3 rls_verify.py)
# ─────────────────────────────────────────────────────────────
import os, sys, json, hmac, hashlib, base64, urllib.request, urllib.error

UA = {"User-Agent": "curl/8.4.0"}  # Management API는 UA 없으면 403

def _env(name):
    v = os.environ.get(name)
    if not v:
        sys.stderr.write(f"[harness] 환경변수 {name} 누락 — supabase/tests/README.md 참고\n")
        sys.exit(2)
    return v

REF        = _env("SB_REF")
PAT        = _env("SB_PAT")
SERVICE    = _env("SB_SERVICE_KEY")
ANON       = _env("SB_ANON_KEY")
JWT_SECRET = _env("SB_JWT_SECRET")
BASE       = os.environ.get("SB_URL", f"https://{REF}.supabase.co")
MGMT       = f"https://api.supabase.com/v1/projects/{REF}/database/query"


# ── Management API로 임의 SQL(소유자 권한, RLS 우회) ──
def sql(q):
    req = urllib.request.Request(MGMT, data=json.dumps({"query": q}).encode(),
        headers={"Authorization": f"Bearer {PAT}", "Content-Type": "application/json", **UA})
    return json.load(urllib.request.urlopen(req))


# ── 역할 시뮬레이션용 HS256 JWT 발급(sub=auth uid, role=authenticated) ──
def _b64(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
def mint(sub):
    h = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    p = _b64(json.dumps({"sub": sub, "role": "authenticated", "aud": "authenticated",
                         "iat": 1782043061, "exp": 2097619061}).encode())
    sig = _b64(hmac.new(JWT_SECRET.encode(), f"{h}.{p}".encode(), hashlib.sha256).digest())
    return f"{h}.{p}.{sig}"


# ── Auth admin (service_role): 테스트 유저 생성/삭제/선청소 ──
def admin_create_user(email, password="Test!2345pw"):
    req = urllib.request.Request(f"{BASE}/auth/v1/admin/users",
        data=json.dumps({"email": email, "password": password, "email_confirm": True}).encode(),
        headers={"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}", "Content-Type": "application/json", **UA})
    return json.load(urllib.request.urlopen(req))["id"]

def admin_delete_user(uid):
    try:
        urllib.request.urlopen(urllib.request.Request(f"{BASE}/auth/v1/admin/users/{uid}",
            headers={"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}", **UA}, method="DELETE"))
    except Exception as e:
        print("  (del user warn)", e)

def admin_preclean(prefix):
    """이전 실행 잔여 테스트 유저(prefix 이메일) 제거 — 멱등 재실행."""
    try:
        d = json.load(urllib.request.urlopen(urllib.request.Request(
            f"{BASE}/auth/v1/admin/users?per_page=200",
            headers={"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}", **UA})))
        for u in d.get("users", []):
            if (u.get("email") or "").startswith(prefix):
                admin_delete_user(u["id"])
    except Exception as e:
        print("  (preclean warn)", e)


# ── PostgREST(역할 세션) 호출 — RLS가 실제 적용되는 경로 ──
def rest(method, path, token, body=None, profile="memoria"):
    h = {"apikey": ANON, "Authorization": f"Bearer {token}", "Accept-Profile": profile, **UA}
    data = None
    if body is not None:
        data = json.dumps(body).encode(); h["Content-Type"] = "application/json"; h["Content-Profile"] = profile
    try:
        r = urllib.request.urlopen(urllib.request.Request(f"{BASE}/rest/v1/{path}", data=data, headers=h, method=method))
        return r.status, json.loads(r.read() or "null")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:140]


# ── 결과 수집/리포트 ──
class Report:
    def __init__(self, title):
        self.title = title; self.rows = []
    def check(self, name, cond, extra=""):
        self.rows.append(bool(cond))
        print(("PASS" if cond else "FAIL"), "-", name, (f"  [{extra}]" if extra else ""))
    def finish(self):
        ok = sum(self.rows); tot = len(self.rows)
        print(f"\n=== {self.title}: {ok}/{tot} PASSED ===")
        return 0 if ok == tot else 1
