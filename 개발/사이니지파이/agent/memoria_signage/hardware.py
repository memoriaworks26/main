# 하드웨어 식별 — 라즈베리파이 보드 고유값(시리얼·모델·MAC). 등록(enroll) 시 1회 보고.
#   파이/리눅스에서만 실제 값, 그 외(노트북 테스트)는 None → 그대로 전송 생략.
import glob


def hw_serial():
    try:
        with open("/proc/cpuinfo", encoding="utf-8") as f:
            for line in f:
                if line.startswith("Serial"):
                    return line.split(":", 1)[1].strip()
    except OSError:
        pass
    return None


def hw_model():
    try:
        with open("/proc/device-tree/model", encoding="utf-8") as f:
            return f.read().replace("\x00", "").strip()
    except OSError:
        return None


def hw_mac():
    for path in sorted(glob.glob("/sys/class/net/*/address")):
        iface = path.rsplit("/", 2)[1]
        if iface == "lo":
            continue
        try:
            with open(path, encoding="utf-8") as f:
                mac = f.read().strip()
        except OSError:
            continue
        if mac and mac != "00:00:00:00:00:00":
            return mac
    return None


def hw_info():
    return {"serial": hw_serial(), "model": hw_model(), "mac": hw_mac()}
