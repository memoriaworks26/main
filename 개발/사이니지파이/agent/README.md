# 사이니지 파이 에이전트 (두뇌)

호실 TV 무인 플레이어의 핵심 로직. **하드웨어 없이 노트북에서 돌려볼 수 있게** 부작용(HTTP·다운로드·mpv)을 분리했다.

```
memoria_signage/
  config.py   설정·provision.json·토큰 저장
  api.py      device-enroll / device-sync 호출 (stdlib만, 의존성 0)
  cache.py    영상 video_id로 1회 다운로드 + 현재+다음만 보관(나머지 삭제)
  player.py   DryRunPlayer(로그) / MpvPlayer(실제 mpv IPC)
  agent.py    두뇌 — 등록→폴링→콘텐츠 반영→명령 실행 (순수 흐름)
  updater.py  OTA 자기업데이트(매니페스트·sha256·원자적 심링크 교체·롤백)
  __main__.py 진입점 + CLI (부팅 시 OTA 확인)
setup.sh      마스터 이미지용 엔진 설치(기준 파이 1회)
systemd/      자동 실행 유닛
tests/        로직·OTA 검증(파이·백엔드 없이)
```

## 핵심 동작

```
부팅 → 대기화면 즉시 표시(검은화면 금지)
     → 토큰 있나? 없으면 provision.json의 등록코드로 device-enroll → 토큰 저장
     → 3초마다 device-sync:
          음량/음소거 반영
          명령(restart/reboot/refresh/redownload) 실행
          콘텐츠: video → video_id로 캐시(현재+다음) → mpv 재생
                  image → 캐시 → 표시
                  none  → 대기화면
          알림 모드면 문구 오버레이
     → 네트워크/다운로드 실패해도 화면 안 비움(직전/대기 유지)
```

## 노트북에서 테스트 (하드웨어 없이)

```bash
cd 개발/사이니지파이/agent

# 1) 백엔드도 없이 — 로직만(영상↔대기 번갈아 로그)
python3 -m memoria_signage --fake --dry-run

# 2) 실제 배포된 서버에 붙여서 — 등록부터 한 사이클
python3 -m memoria_signage --dry-run --once \
  --server https://<프로젝트>.supabase.co/functions/v1 --code TEST1234

# 3) 단위 테스트
python3 -m unittest -v
```

`--dry-run` = 실제 재생·다운로드 안 하고 "무엇을 할지"만 로그.

## 배포 모델: 마스터 이미지(A) + OTA

- **출고(안정성)** — 기준 파이 1대에 엔진 설치 → 검증 → SD를 이미지로 떠서 복제(붕어빵 틀).
  네트워크 불안정해도 부팅됨, 100대가 동일, 실패가 작업대에서 남.
- **운영(확장)** — 에이전트 코드만 **OTA 자기업데이트**. 현장 재방문 없이 버그수정 전 함대 반영.

### 마스터 이미지 만들기 (첫 파이, 1회)

```bash
# 기준 파이(Raspberry Pi OS 64-bit)에서:
sudo bash setup.sh            # 패키지·에이전트(/opt/memoria/current)·systemd·NTP
# /boot/provision.json 넣고
sudo systemctl start memoria-signage
# 화면에 영상 뜨는지·콘솔 온라인 확인 → MpvPlayer/키오스크 튜닝
# 검증되면 이 SD를 이미지로 추출:
#   sudo dd if=/dev/sdX of=memoria-signage-v1.img bs=4M
```

### 새 파이 (이후, 5분)

```
빈 SD ← 마스터 이미지 굽기 → provision.json 코드만 교체 → 전원+인터넷 → 자동 등록·재생
```

### OTA 자기업데이트

- 레이아웃: `/opt/memoria/current -> versions/<버전>` (심링크)
- provision.json에 `update_url`(매니페스트 JSON) 지정 시, **부팅마다 1회** 확인:
  - 매니페스트 `{ "version", "url"(tarball), "sha256" }` → 새 버전이면 임시폴더에 받아 **sha256 검증·압축해제 후에만** 심링크 원자적 교체 → 종료 → systemd가 새 코드로 재시작
  - 실패(네트워크·해시)면 **현 버전 그대로** — 깨진 코드로 안 바뀜. 이전 버전 폴더 보존(롤백)
  - 재생 도중엔 안 바꿈(부팅 시에만)

## 아직 파이에서 해야 하는 것 (하드웨어 의존)

이 두뇌는 완성. 파이에서 붙이고 튜닝할 글루:
- **MpvPlayer 실측 튜닝** — HDMI 출력·하드웨어 디코드·알림 ASS 오버레이·standby 이미지
- **키오스크 부팅** — 커서·부팅로그 숨김, 스플래시, 화면보호기 off
- **캡티브 포털** — 와이파이 없을 때 핫스팟+설정페이지(랜선이면 자동 건너뜀)
- **USB 비상재생** — udev로 미디어 자동재생(noexec)
- **하드웨어 워치독·NTP·읽기전용 루트**
- **마스터 SD이미지** — 위를 다 구워 파이마다 복제
