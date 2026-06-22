#!/usr/bin/env bash
# RLS·개인정보 안전장치 회귀 하네스 러너.
#   시크릿은 supabase/tests/.env(gitignore)에서 로드하거나 미리 export.
#   필요 env: SB_REF SB_PAT SB_SERVICE_KEY SB_ANON_KEY SB_JWT_SECRET
# 사용:  bash supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

fail=0
echo "▶ RLS 교차접근 검증"
python3 rls_verify.py || fail=1
echo
echo "▶ purge/audit 검증"
python3 purge_audit_verify.py || fail=1
echo
if [ "$fail" -eq 0 ]; then echo "✅ 전체 통과"; else echo "❌ 실패 항목 있음"; fi
exit $fail
