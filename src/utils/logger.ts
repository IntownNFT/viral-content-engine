const timestamp = () => new Date().toISOString().replace("T", " ").slice(0, 19);

export const log = {
  info: (msg: string) => console.log(`[${timestamp()}] INFO  ${msg}`),
  warn: (msg: string) => console.warn(`[${timestamp()}] WARN  ${msg}`),
  error: (msg: string) => console.error(`[${timestamp()}] ERROR ${msg}`),
  success: (msg: string) => console.log(`[${timestamp()}] OK    ${msg}`),
};
