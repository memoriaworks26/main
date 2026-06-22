-- 0016_device_room_label.sql — 사이니지 디바이스 배선: 호실 텍스트(room_id 정규화 전).
alter table memoria.signage_devices add column if not exists room_label text;
