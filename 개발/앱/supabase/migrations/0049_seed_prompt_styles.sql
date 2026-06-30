-- 0049_seed_prompt_styles.sql — 기본 프롬프트 4유형 × 3스타일 시드.
--   유형: 이미지1(영정 스타일) · 이미지2(화풍변경) · 'AI영상 A'(앞·인트로) · 'AI영상 B'(뒤·아웃트로).
--   body는 생성 템플릿에 스타일 조각으로 주입(이미지1=액자/배경/빛, 이미지2=화풍/기법, AI영상=무빙/무드).
--   멱등·비파괴: 고정 id + on conflict do nothing(운영자가 콘솔에서 손본 body 보존),
--               active는 'target별 활성이 없을 때만' 의도 기본값 1개 지정(운영자 선택 보존).
--   ※ 운영 mgyb엔 2026-06-30 Management API로 직접 적용 완료. 이 파일은 DB 리셋·신규 환경 재현용.
--     (구 시드 0039의 이미지1/2 행이 함께 있을 수 있음 — 콘솔에서 정리, 동작엔 무해)
insert into memoria.ai_prompts (id, target, name, body, active) values
 ('pr-img1-warm','이미지1','따뜻한 원목 액자','따뜻한 원목 결의 추모 액자, 황금빛 보케 배경, 작은 들꽃과 은은한 촛불, 포근하고 따뜻한 빛', true),
 ('pr-img1-sky','이미지1','하늘·무지개다리','맑은 하늘빛 추모 액자, 흰구름과 부드러운 무지개 빛무리 배경, 흰 꽃과 깃털 장식, 천상의 평온한 빛', false),
 ('pr-img1-ink','이미지1','흰 꽃 제단','은은한 흰 꽃과 안개꽃으로 두른 품위 있는 추모 액자, 미색 실크 배경, 부드러운 자연광, 정갈하고 평온한 분위기', false),
 ('pr-img2-ink','이미지2','수묵 담채','부드러운 수묵 담채화 기법, 번지는 먹과 옅은 채색, 여백의 미와 은은한 분위기', true),
 ('pr-img2-oil','이미지2','파스텔 유화','따뜻한 파스텔 톤 유화 기법, 부드러운 붓터치와 은은한 광택, 결이 살아있는 질감', false),
 ('pr-img2-film','이미지2','빈티지 필름','세피아 빈티지 필름 톤, 부드러운 입자감과 오래된 사진의 따뜻한 정서', false),
 ('pr-aiA-start','AI영상 A','잔잔한 시작','잔잔하게 다가오는 따뜻한 추억의 시작, 아주 느린 줌인, 부드럽게 번지는 빛, 평온하고 포근한 무드', true),
 ('pr-aiA-bokeh','AI영상 A','빛망울 인트로','은은한 빛망울이 모여드는 도입부, 부드러운 페이드인과 느린 패럴랙스 카메라, 따뜻하고 설레는 추모 무드', false),
 ('pr-aiA-sun','AI영상 A','햇살 시작','창으로 스며드는 아침 햇살처럼 밝아오는 시작, 천천히 열리는 빛, 잔잔하고 희망적인 무드', false),
 ('pr-aiB-fare','AI영상 B','잔잔한 작별','잔잔하게 멀어지는 작별의 여운, 아주 느린 줌아웃, 부드러운 페이드아웃, 그리움과 평온이 어린 무드', true),
 ('pr-aiB-bokeh','AI영상 B','빛망울 엔딩','빛망울이 천천히 흩어지는 마무리, 부드러운 디졸브와 느린 카메라, 따뜻한 작별의 추모 무드', false),
 ('pr-aiB-sunset','AI영상 B','노을 마무리','노을빛으로 물드는 마무리, 천천히 잦아드는 빛과 잔잔한 입자, 평온하고 애틋한 무드', false)
on conflict (id) do nothing;

-- target별 활성 1개 — 이미 활성이 있으면 건드리지 않음(운영자 선택 보존).
update memoria.ai_prompts set active = true where id = 'pr-img1-warm'
  and not exists (select 1 from memoria.ai_prompts c where c.target = '이미지1' and c.active);
update memoria.ai_prompts set active = true where id = 'pr-img2-ink'
  and not exists (select 1 from memoria.ai_prompts c where c.target = '이미지2' and c.active);
update memoria.ai_prompts set active = true where id = 'pr-aiA-start'
  and not exists (select 1 from memoria.ai_prompts c where c.target = 'AI영상 A' and c.active);
update memoria.ai_prompts set active = true where id = 'pr-aiB-fare'
  and not exists (select 1 from memoria.ai_prompts c where c.target = 'AI영상 B' and c.active);
