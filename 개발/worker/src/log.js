const ts = () => new Date().toISOString().slice(11, 19);
export const log = {
  info: (m) => console.log(`[${ts()}] ${m}`),
  warn: (m) => console.warn(`[${ts()}] ! ${m}`),
  error: (m) => console.error(`[${ts()}] ✗ ${m}`),
};
