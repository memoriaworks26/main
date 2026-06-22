# ─────────────────────────────────────────────────────────────
# 개인정보 안전장치 회귀 테스트 — 완전파기(purge_reservation)와
# 감사로그(access_log) 추기전용 보장을 검증. (법적 이행 안전망)
# 임시 픽스처 생성 → 검증 → 전량 삭제(멱등).
# ─────────────────────────────────────────────────────────────
from _harness import sql, mint, admin_create_user, admin_delete_user, admin_preclean, rest, Report

R = Report("purge/audit")
admin_preclean("patest_")
users = {}
SID = "aaaaaaaa-0000-0000-0000-000000000001"
try:
    users["master"] = admin_create_user("patest_master@example.com")
    users["worker"] = admin_create_user("patest_worker@example.com")
    sql(f"""
    insert into memoria.biz_units(id,name) values ('33333333-3333-3333-3333-333333333333','TEST_BIZ_P');
    insert into memoria.partners(id,biz_unit_id,id_code,name) values ('P-TESTP1','33333333-3333-3333-3333-333333333333','tp1','테스트P');
    insert into memoria.staff(auth_user_id,biz_unit_id,name,login_id,role,status,perms) values
      ('{users['master']}','33333333-3333-3333-3333-333333333333','M','tpm','master','active','{{}}'),
      ('{users['worker']}','33333333-3333-3333-3333-333333333333','W','tpw','worker','active','{{production}}');
    insert into memoria.reservations(id,partner_id,deceased,chief,phone,status) values ('R-TESTP1','P-TESTP1','펫P','보호자P','010-0000-0009','published');
    insert into memoria.submissions(id,token,reservation_id,pet_name) values ('{SID}','tok_testp1','R-TESTP1','펫P');
    insert into memoria.submission_assets(submission_id,kind,name) values ('{SID}','photo','p.jpg');
    insert into memoria.videos(id,partner_id,reservation_id,deceased,status,final_path,source_path) values ('V-TESTP1','P-TESTP1','R-TESTP1','펫P','published','p/f.mp4','p/s.zip');
    insert into memoria.settlement_items(partner_id,reservation_id,deceased,ymd,amount,status) values ('P-TESTP1','R-TESTP1','펫P','2026-06-01',75000,'waiting');
    """)
    tm, tw = mint(users["master"]), mint(users["worker"])

    s, d = rest("POST", "rpc/purge_reservation", tw, body={"p_reserv": "R-TESTP1"})
    R.check("purge: worker(비master) 거부", s in (400, 401, 403, 404) or (isinstance(d, str) and "forbidden" in d), f"s={s}")

    s, d = rest("POST", "rpc/purge_reservation", tm, body={"p_reserv": "R-TESTP1"})
    R.check("purge: master 성공", s in (200, 204), f"s={s}")

    c = sql("select (select count(*) from memoria.reservations where id='R-TESTP1') r,(select count(*) from memoria.submissions where reservation_id='R-TESTP1') s,(select count(*) from memoria.submission_assets where submission_id='" + SID + "') a,(select count(*) from memoria.videos where reservation_id='R-TESTP1') v,(select count(*) from memoria.settlement_items where reservation_id='R-TESTP1') si")[0]
    R.check("purge: 예약·제출·자산·영상·정산 전부 0", all(int(c[k]) == 0 for k in ("r", "s", "a", "v", "si")), str(c))

    log = sql("select count(*) c from memoria.access_log where action='purge' and target_id='R-TESTP1'")[0]
    R.check("audit: purge 기록됨", int(log["c"]) >= 1)

    _, d = rest("GET", "access_log?select=id&target_id=eq.R-TESTP1", tm)
    R.check("audit: master 조회 가능", isinstance(d, list) and len(d) >= 1)
    _, d = rest("GET", "access_log?select=id", tw)
    R.check("audit: worker 조회 0", isinstance(d, list) and not d)

    s, _ = rest("PATCH", "access_log?target_id=eq.R-TESTP1", tm, body={"action": "view"})
    R.check("audit: update 거부(추기전용)", s in (401, 403))
    s, _ = rest("DELETE", "access_log?target_id=eq.R-TESTP1", tm)
    still = int(sql("select count(*) c from memoria.access_log where target_id='R-TESTP1'")[0]["c"])
    R.check("audit: delete 거부·행 보존", s in (401, 403, 404) and still >= 1, f"s={s} still={still}")
finally:
    try:
        sql(f"""
        delete from memoria.access_log where target_id='R-TESTP1';
        delete from memoria.videos where id='V-TESTP1';
        delete from memoria.settlement_items where partner_id='P-TESTP1';
        delete from memoria.submission_assets where submission_id='{SID}';
        delete from memoria.submissions where id='{SID}';
        delete from memoria.reservations where id='R-TESTP1';
        delete from memoria.staff where login_id in ('tpm','tpw');
        delete from memoria.partners where id='P-TESTP1';
        delete from memoria.biz_units where name='TEST_BIZ_P';
        """)
    except Exception as e:
        print("(cleanup warn)", e)
    for v in users.values():
        admin_delete_user(v)

import sys
sys.exit(R.finish())
