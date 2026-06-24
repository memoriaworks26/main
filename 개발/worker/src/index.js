// 렌더 워커 메인 루프 — 큐 폴링 → claim → render → done/실패.
//   node src/index.js          상시 폴링(로컬·서버 공통)
//   node src/index.js --once   1건만 처리하고 종료(테스트/CI)
import { loadConfig } from "./config.js";
import { log } from "./log.js";
import { claimJob, claimComposeJob, fetchAssets, completeJob, completeBlocks, failJob, failCompose, requeueStale } from "./queue.js";
import { composeFinal } from "./render/index.js";
import { generateBlocks } from "./render/blocks-gen.js";

const cfg = loadConfig();
const ONCE = process.argv.includes("--once");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let stopping = false;
process.on("SIGINT", () => { log.warn("종료 요청(SIGINT) — 현재 작업 후 정지"); stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

// 한 건 처리(2단계). 1) 블록 생성(queued) 2) 합성(compose_queued). 처리했으면 true.
async function processOne() {
  // 1단계: 블록 생성(Seedream 타이틀 + Kling AI영상) → blocks_ready
  const genJob = await claimJob();
  if (genJob) {
    log.info(`gen   job=${genJob.id} attempt=${genJob.render_attempts} reserv=${genJob.reservation_id || "-"}`);
    try {
      const assets = await fetchAssets(genJob);
      const res = await generateBlocks(genJob, assets);
      await completeBlocks(genJob);
      log.info(`blocks job=${genJob.id} count=${res.count} → blocks_ready`);
    } catch (e) {
      const status = await failJob(genJob, e);
      log.error(`fail-gen job=${genJob.id} (${status}) ${e.message}`);
    }
    return true;
  }
  // 2단계: 최종 합성(관리자 「최종 렌더」) → done
  const cJob = await claimComposeJob();
  if (cJob) {
    log.info(`compose job=${cJob.id} reserv=${cJob.reservation_id || "-"}`);
    try {
      const assets = await fetchAssets(cJob);
      const result = await composeFinal(cJob, assets);
      await completeJob(cJob, result);
      log.info(`done  job=${cJob.id} → ${result.finalPath}`);
    } catch (e) {
      await failCompose(cJob, e);
      log.error(`fail-compose job=${cJob.id} ${e.message}`);
    }
    return true;
  }
  return false;
}

// 워커 루프 1가닥 — 큐가 비면 pollMs 쉬고 다시 시도. concurrency 만큼 병렬 실행.
async function workerLoop(n) {
  while (!stopping) {
    let did = false;
    try { did = await processOne(); }
    catch (e) { log.error(`루프#${n} 오류: ` + e.message); }
    if (!did) await sleep(cfg.pollMs);
  }
}

// 리퍼 — 멈춘 rendering을 주기적으로 재큐/실패 처리(Railway 재배포·크래시 복구).
async function reaperLoop() {
  while (!stopping) {
    try {
      const n = await requeueStale(cfg.staleMinutes, cfg.maxAttempts);
      if (n) log.warn(`리퍼: 멈춘 렌더 ${n}건 복구(재큐/실패)`);
    } catch (e) { log.error("리퍼 오류: " + e.message); }
    // reaperMs를 잘게 쪼개 쉬어 종료 응답성 확보
    for (let waited = 0; waited < cfg.reaperMs && !stopping; waited += 1000) await sleep(1000);
  }
}

async function main() {
  log.info(`렌더 워커 시작 — stub=${cfg.stub} concurrency=${cfg.concurrency} interval=${cfg.pollMs}ms maxAttempts=${cfg.maxAttempts} stale=${cfg.staleMinutes}m once=${ONCE}`);
  // [QA] 배포 안전장치 — STUB가 켜진 채 운영되면 보호자에게 가짜(stub) 영상이 전달됨.
  if (cfg.stub) log.warn("⚠️ WORKER_STUB=ON — 실제 렌더 없이 stub 결과를 반환합니다. 운영 배포 시 반드시 WORKER_STUB=0 으로 실행하세요.");
  if (ONCE) {
    await requeueStale(cfg.staleMinutes, cfg.maxAttempts).catch((e) => log.error("리퍼 오류: " + e.message));
    const did = await processOne();
    if (!did) log.info("큐 비어있음");
    process.exit(0);
  }
  // concurrency 가닥의 워커 + 리퍼 1가닥 동시 실행. claim은 SKIP LOCKED라 가닥/레플리카 간 충돌 없음.
  const loops = Array.from({ length: cfg.concurrency }, (_, i) => workerLoop(i + 1));
  loops.push(reaperLoop());
  await Promise.all(loops);
  log.info("워커 종료");
  process.exit(0);
}

main().catch((e) => { log.error("치명적: " + (e.stack || e.message)); process.exit(1); });
