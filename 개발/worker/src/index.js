// 렌더 워커 메인 루프 — 큐 폴링 → claim → render → done/실패.
//   node src/index.js          상시 폴링(로컬·서버 공통)
//   node src/index.js --once   1건만 처리하고 종료(테스트/CI)
import { loadConfig } from "./config.js";
import { log } from "./log.js";
import { claimJob, fetchAssets, completeJob, failJob } from "./queue.js";
import { renderJob } from "./render/index.js";

const cfg = loadConfig();
const ONCE = process.argv.includes("--once");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let stopping = false;
process.on("SIGINT", () => { log.warn("종료 요청(SIGINT) — 현재 작업 후 정지"); stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

// 한 건 처리. 처리했으면 true, 큐 비었으면 false.
async function processOne() {
  const job = await claimJob();
  if (!job) return false;
  log.info(`claim job=${job.id} attempt=${job.render_attempts} reserv=${job.reservation_id || "-"}`);
  try {
    const assets = await fetchAssets(job);
    const result = await renderJob(job, assets, cfg);
    await completeJob(job, result);
    log.info(`done  job=${job.id} → ${result.finalPath}`);
  } catch (e) {
    const status = await failJob(job, e);
    log.error(`fail  job=${job.id} (${status}) ${e.message}`);
  }
  return true;
}

async function main() {
  log.info(`렌더 워커 시작 — stub=${cfg.stub} interval=${cfg.pollMs}ms maxAttempts=${cfg.maxAttempts} once=${ONCE}`);
  // [QA] 배포 안전장치 — STUB가 켜진 채 운영되면 보호자에게 가짜(stub) 영상이 전달됨.
  if (cfg.stub) log.warn("⚠️ WORKER_STUB=ON — 실제 렌더 없이 stub 결과를 반환합니다. 운영 배포 시 반드시 WORKER_STUB=0 으로 실행하세요.");
  if (ONCE) {
    const did = await processOne();
    if (!did) log.info("큐 비어있음");
    process.exit(0);
  }
  while (!stopping) {
    let did = false;
    try { did = await processOne(); }
    catch (e) { log.error("루프 오류: " + e.message); }
    if (!did) await sleep(cfg.pollMs);
  }
  log.info("워커 종료");
  process.exit(0);
}

main().catch((e) => { log.error("치명적: " + (e.stack || e.message)); process.exit(1); });
