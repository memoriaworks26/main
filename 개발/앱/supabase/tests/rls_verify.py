# ─────────────────────────────────────────────────────────────
# RLS 교차접근 회귀 테스트 — 역할별로 실제 PostgREST 세션을 띄워
# "남의 데이터/권한 밖 데이터에 닿는 경로가 0인지"를 적대적으로 검증.
# 임시 픽스처(테스트 사업부·파트너·예약·영상·정산 + auth 유저)를 만들고
# 검증 후 전량 삭제(멱등). 기대값 위반 시 비정상 종료(CI 게이트용).
# ─────────────────────────────────────────────────────────────
from _harness import sql, mint, admin_create_user, admin_delete_user, admin_preclean, rest, Report, ANON

R = Report("RLS 교차접근")
admin_preclean("rlstest_")
users = {}
try:
    for k in ["master", "wprod", "wother", "collab", "puserx", "pusery"]:
        users[k] = admin_create_user(f"rlstest_{k}@example.com")

    sql(f"""
    insert into memoria.biz_units(id,name) values
      ('11111111-1111-1111-1111-111111111111','TEST_BIZ_X'),
      ('22222222-2222-2222-2222-222222222222','TEST_BIZ_Y');
    insert into memoria.partners(id,biz_unit_id,id_code,name) values
      ('P-TESTX1','11111111-1111-1111-1111-111111111111','tx1','테스트파트너X1'),
      ('P-TESTY1','22222222-2222-2222-2222-222222222222','ty1','테스트파트너Y1');
    insert into memoria.staff(auth_user_id,biz_unit_id,name,login_id,role,status,perms) values
      ('{users['master']}','11111111-1111-1111-1111-111111111111','M','tm','master','active','{{}}'),
      ('{users['wprod']}','11111111-1111-1111-1111-111111111111','WP','twp','worker','active','{{production}}'),
      ('{users['wother']}','22222222-2222-2222-2222-222222222222','WO','two','worker','active','{{production,customers,settlement}}'),
      ('{users['collab']}','11111111-1111-1111-1111-111111111111','C','tc','collab','active','{{}}');
    insert into memoria.partner_members(auth_user_id,partner_id) values
      ('{users['puserx']}','P-TESTX1'),
      ('{users['pusery']}','P-TESTY1');
    insert into memoria.reservations(id,partner_id,deceased,chief,phone,status) values
      ('R-TESTX1','P-TESTX1','펫X','보호자X','010-0000-0001','review'),
      ('R-TESTY1','P-TESTY1','펫Y','보호자Y','010-0000-0002','review');
    insert into memoria.settlement_items(partner_id,reservation_id,deceased,ymd,amount,status)
      values ('P-TESTX1','R-TESTX1','펫X','2026-06-01',75000,'waiting');
    insert into memoria.videos(id,partner_id,reservation_id,deceased,status,final_path,source_path)
      values ('V-TESTX1','P-TESTX1','R-TESTX1','펫X','published','x/final.mp4','x/src.zip');
    """)

    tok = {k: mint(v) for k, v in users.items()}

    # 1. 파트너X → 자기 예약만
    _, d = rest("GET", "reservations?select=partner_id", tok["puserx"])
    ids = sorted(x["partner_id"] for x in d) if isinstance(d, list) else []
    R.check("파트너X: 자기 예약만(P-TESTX1)", ids == ["P-TESTX1"], f"got={ids}")

    # 2. anon → 운영테이블/회사정보 0
    s, d = rest("GET", "reservations?select=id", ANON)
    R.check("anon: reservations 직접 차단", (isinstance(d, list) and not d) or s in (401, 403), f"s={s}")
    s, d = rest("GET", "company?select=biz_no", ANON)
    R.check("anon: company 직접 차단", (isinstance(d, list) and not d) or s in (401, 403), f"s={s}")

    # 3. worker(production만) → 예약 보임 / settlement 0
    _, d = rest("GET", "reservations?select=id", tok["wprod"])
    R.check("worker(prod): 예약 보임", isinstance(d, list) and any(x["id"] == "R-TESTX1" for x in d))
    _, d = rest("GET", "settlement_items?select=id", tok["wprod"])
    R.check("worker(prod): settlement 0(권한없음)", isinstance(d, list) and not d)

    # 4. 사업부 격리
    _, d = rest("GET", "reservations?select=partner_id", tok["wother"])
    px = [x for x in d if x["partner_id"] == "P-TESTX1"] if isinstance(d, list) else None
    py = [x for x in d if x["partner_id"] == "P-TESTY1"] if isinstance(d, list) else None
    R.check("사업부격리: workerY가 bizX 예약 0", px == [])
    R.check("사업부격리: workerY가 bizY 예약 봄", bool(py))

    # 5. collab
    _, d = rest("GET", "reservations?select=id", tok["collab"])
    R.check("collab: 예약 0", isinstance(d, list) and not d)
    _, d = rest("GET", "settlement_items?select=id", tok["collab"])
    R.check("collab: settlement 0", isinstance(d, list) and not d)
    _, d = rest("GET", "videos?select=id&status=eq.published", tok["collab"])
    R.check("collab: 발행 영상 보임", isinstance(d, list) and len(d) >= 1)
    s, _ = rest("POST", "videos", tok["collab"], body={"id": "V-HACK", "partner_id": "P-TESTX1"})
    R.check("collab: videos insert 거부", s in (401, 403), f"s={s}")

    # 6. 파트너X → settlement 0 (파트너 정책 없음)
    _, d = rest("GET", "settlement_items?select=id", tok["puserx"])
    R.check("파트너X: settlement 0", isinstance(d, list) and not d)

    # 7. 파트너Y → 타 파트너(X) 예약 0
    _, d = rest("GET", "reservations?select=id&partner_id=eq.P-TESTX1", tok["pusery"])
    R.check("파트너Y: 타파트너 예약 0", isinstance(d, list) and not d)

    # 8. [0020 하드닝] anon은 내부함수 직접호출 불가(공개 API 4종만 허용).
    #     authenticated/service_role은 유지되어야 정책 평가·RPC 무손상.
    s, _ = rest("POST", "rpc/is_master", ANON, body={})
    R.check("anon: 내부함수(is_master) 직접호출 차단", s in (401, 403), f"s={s}")
    s, _ = rest("POST", "rpc/purge_reservation", ANON, body={"p_reserv": "x"})
    R.check("anon: purge_reservation 직접호출 차단", s in (401, 403), f"s={s}")
    s, _ = rest("POST", "rpc/resolve_link", ANON, body={"p_token": "nope"}, profile="public")
    R.check("anon: resolve_link 공개 API 유지", s == 200, f"s={s}")
    s, _ = rest("POST", "rpc/is_master", tok["master"], body={})
    R.check("staff: 내부함수 실행권한 유지(정책 평가용)", s == 200, f"s={s}")
finally:
    try:
        sql("""
        delete from memoria.videos where id in ('V-TESTX1','V-HACK');
        delete from memoria.settlement_items where partner_id in ('P-TESTX1','P-TESTY1');
        delete from memoria.reservations where id in ('R-TESTX1','R-TESTY1');
        delete from memoria.partner_members where partner_id in ('P-TESTX1','P-TESTY1');
        delete from memoria.staff where login_id in ('tm','twp','two','tc');
        delete from memoria.partners where id in ('P-TESTX1','P-TESTY1');
        delete from memoria.biz_units where name in ('TEST_BIZ_X','TEST_BIZ_Y');
        """)
    except Exception as e:
        print("(fixture cleanup warn)", e)
    for v in users.values():
        admin_delete_user(v)

import sys
sys.exit(R.finish())
