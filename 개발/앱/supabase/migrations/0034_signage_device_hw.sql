-- ─────────────────────────────────────────────────────────────
-- 0034_signage_device_hw.sql — 디바이스 하드웨어 식별(시리얼·모델·MAC) 보고 저장.
--   디바이스 'RPI-0441'은 관리자가 붙인 라벨이라, 물리 장비 대조용으로 파이의
--   보드 고유값을 함께 보관한다. 파이가 device-enroll 때 1회 보고(변하지 않음).
--     · hw_serial : /proc/cpuinfo Serial (보드 고유 16자리)
--     · model     : /proc/device-tree/model (예: Raspberry Pi 4 Model B)
--     · mac       : 1차 NIC MAC
-- ─────────────────────────────────────────────────────────────
alter table memoria.signage_devices
  add column if not exists hw_serial text,
  add column if not exists model     text,
  add column if not exists mac       text;
