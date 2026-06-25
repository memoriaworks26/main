# 사이니지 파이 에이전트 (두뇌)

호실 TV 무인 플레이어의 핵심 로직. **하드웨어 없이 노트북에서 돌려볼 수 있게** 부작용(HTTP·다운로드·mpv)을 분리했다.

```
memoria_signage/
  config.py   설정·provision.json·토큰 저장
  api.py      device-enroll / device-sync 호출 (stdlib만, 의존성 0)
  cache.py    영상 video_id로 1회 다운로드 + 현재+다음만 보관(나머지 삭제)
  player.py   DryRunPlayer(로그) / MpvPlayer(실제 mpv IPC)
  agent.py    두뇌 — 등록→폴링→콘텐츠 반영→명령 실행 (순수 흐름)
  __main__.py 진입점 + CLI
systemd/      자동 실행 유닛
tests/        로직 검증(파이·백엔드 없이)
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

## 파이에 올리는 법 (하드웨어 도착 후)

1. `sudo apt install -y mpv python3`
2. 이 폴더를 `/opt/memoria` 에 배치
3. `provision.example.json` → SD `/boot/provision.json` (device·code·server 채움)
4. `systemd/memoria-signage.service` → `/etc/systemd/system/` 복사 후
   `sudo systemctl enable --now memoria-signage`
5. 전원 + 인터넷 → 자동 등록 → 재생

## 아직 파이에서 해야 하는 것 (하드웨어 의존)

이 두뇌는 완성. 파이에서 붙이고 튜닝할 글루:
- **MpvPlayer 실측 튜닝** — HDMI 출력·하드웨어 디코드·알림 ASS 오버레이·standby 이미지
- **키오스크 부팅** — 커서·부팅로그 숨김, 스플래시, 화면보호기 off
- **캡티브 포털** — 와이파이 없을 때 핫스팟+설정페이지(랜선이면 자동 건너뜀)
- **USB 비상재생** — udev로 미디어 자동재생(noexec)
- **하드웨어 워치독·NTP·읽기전용 루트**
- **마스터 SD이미지** — 위를 다 구워 파이마다 복제
