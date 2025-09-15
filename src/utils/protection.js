// 極簡保護 - 只保留 debugger 陷阱
export function initProtection() {
  // 週期性 debugger（生產環境啟用）
  if (__PRODUCTION__) {
    setInterval(() => { debugger; }, 3000);
  }
}