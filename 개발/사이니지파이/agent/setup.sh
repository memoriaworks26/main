#!/usr/bin/env bash
# 마스터 이미지 빌드 — 기준 파이 1대에 '엔진'을 설치한다.
#   이 스크립트를 돌리고 검증한 파이의 SD를 '이미지'로 떠서 새 파이에 복제(붕어빵 틀).
#   사용:  sudo bash setup.sh        (Raspberry Pi OS 64-bit 위에서)
#   멱등: 다시 돌려도 안전.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "sudo로 실행하세요"; exit 1; }

APP=/opt/memoria
SRC="$(cd "$(dirname "$0")" && pwd)"

echo "[1/6] 패키지 설치 (mpv·python3)"
apt-get update
apt-get install -y mpv python3 ca-certificates

echo "[2/6] 에이전트 배치 — OTA 호환 레이아웃 (current -> versions/base)"
install -d "$APP/versions/base"
cp -a "$SRC/." "$APP/versions/base/"
ln -sfn "$APP/versions/base" "$APP/current"
install -d /var/lib/memoria-signage/cache
install -d "$APP/assets"
# TODO: 브랜드 대기화면을 /opt/memoria/assets/standby.png 로 교체(검은화면 폴백용)

echo "[3/6] 시간 동기화(NTP) + 시간대"
timedatectl set-ntp true || true
timedatectl set-timezone Asia/Seoul || true

echo "[4/6] 서비스 등록 (부팅 자동실행 + 죽으면 재시작)"
cp "$APP/current/systemd/memoria-signage.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable memoria-signage

echo "[5/6] (파이 검증 필요) 키오스크·캡티브포털·워치독·USB"
# 아래는 실제 파이에서 튜닝 — 마커만 남김:
#   · MpvPlayer: KMS/DRM 출력(--vo=gpu --gpu-context=drm), 커서·부팅로그 숨김, 스플래시
#   · 캡티브 포털: 인터넷 없을 때 핫스팟+설정페이지(랜선이면 자동 건너뜀)
#   · USB 비상재생(udev, noexec) / 하드웨어 워치독 / 읽기전용 루트

echo "[6/6] 완료"
echo "  → /boot/provision.json 넣고:  sudo systemctl start memoria-signage  (또는 재부팅)"
echo "  → 화면에 영상 뜨는지·콘솔 온라인 확인 후, 이 SD를 이미지로 떠서 마스터로 보관"
echo "     (예: 다른 PC에서  sudo dd if=/dev/sdX of=memoria-signage-v1.img bs=4M)"
