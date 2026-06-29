#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# web(프론트) 운영 배포 스크립트 — 작업트리 그대로(미커밋 WIP 포함) Railway에 올린다.
#
# 왜 이 스크립트가 필요한가 (2026-06-29 배포 실패에서 정리):
#   · railway CLI(2.95.4)의 `railway up`은 어디서 실행하든 git 루트 전체를 업로드한다.
#     이 레포는 앱이 서브디렉터리 `개발/앱`에 있고 루트엔 package.json이 없어,
#     railpack이 Node 앱을 못 찾고 빌드가 FAILED 난다.
#   · PATH 인자(`railway up "개발/앱"`)는 macOS 한글경로 NFC/NFD 정규화 차이로
#     "prefix not found" 에러가 난다.
#   · 옛 `--path-as-root` 플래그는 현재 CLI에 없다.
#   해결: 앱 폴더를 ASCII 이름의 git 밖 임시폴더로 복사한 뒤 거기서 `railway up` 하면
#         CWD 전체가 빌드 컨텍스트가 되어 정상 빌드된다.
#
# 사용법:  레포 루트에서  ./배포-web.sh
# 주의:    GitHub 오토디플로이가 아니라 수동 배포다. 커밋만 푸시해도 자동 배포 안 됨.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
APP="$REPO/개발/앱"
PROJECT="607a0e0b-c2d7-4d47-ae94-bdc3cc8b39f5"
SERVICE="web"
ENVIRONMENT="production"
PROD_URL="https://web-production-05eaf6.up.railway.app"

STAGE="$(mktemp -d /tmp/memoria-web-deploy.XXXXXX)"
trap 'rm -rf "$STAGE"' EXIT

echo "▸ [1/4] 로컬 빌드 사전검증 (깨진 번들 라이브 방지)"
( cd "$APP" && npm run build >/dev/null )

echo "▸ [2/4] 스테이징 복사 → $STAGE  (node_modules·dist·시크릿 제외)"
rsync -a \
  --exclude node_modules --exclude dist --exclude '.git' \
  --exclude '.env.local' --exclude '.env' --exclude '.env.example' \
  "$APP/" "$STAGE/"
# 혹시 모를 시크릿 누출 방지(이중 안전장치)
rm -f "$STAGE/.env.local" "$STAGE/.env" "$STAGE/.env.example"

echo "▸ [3/4] Railway 배포 (web / production)"
( cd "$STAGE" && railway up --ci -p "$PROJECT" -s "$SERVICE" -e "$ENVIRONMENT" )

echo "▸ [4/4] 라이브 반영 검증 (번들 해시 대조)"
LOCAL_HASH="$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' "$APP/dist/index.html" | head -1)"
LIVE_HASH="$(curl -s "$PROD_URL/" | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)"
echo "   local = $LOCAL_HASH"
echo "   live  = $LIVE_HASH"
if [ -n "$LOCAL_HASH" ] && [ "$LOCAL_HASH" = "$LIVE_HASH" ]; then
  echo "✓ 배포 완료 — 라이브가 방금 빌드한 번들을 서빙 중"
else
  echo "✗ 해시 불일치 — 'railway deployment list'로 상태 확인 필요 (CDN 캐시 지연일 수도 있음)"
  exit 1
fi
