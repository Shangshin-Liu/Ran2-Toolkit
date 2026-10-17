/**
 * 網站維護狀態設定檔 (src/config/maintenance.js)
 * - 本地開發模式 (npm run dev)：直接以此檔案作為維護攔截設定，方便本地測試各頁面維護狀態
 * - 正式環境 (Production)：作為 Firestore (metadata/maintenance) 尚未載入或連線失敗時的預設 Fallback 設定
 */
export const maintenanceConfig = {
  password: 'ran2admin',
  home: {
    enabled: false,
    title: '網站系統維護中',
    message: '亂2萬事通正在進行核心資料優化與安全升級，我們將盡快恢復服務，感謝您的耐心等待。'
  },
  tasks: {
    enabled: false,
    title: '任務指南維護中',
    message: '任務資料庫目前正進行資料結構優化與最新官方任務同步調整。'
  },
  simulator: {
    enabled: false,
    title: '配點模擬維護中',
    message: '配點模擬功能目前正處於設計與規劃階段，敬請期待最新功能釋出！'
  },
  parties: {
    enabled: false,
    title: '組隊招募系統維護中',
    message: '組隊招募與討論板塊正在進行架構最佳化以提供更快速的反應時間。'
  },
  function1: {
    enabled: true,
    title: '此功能虛位以待',
    message: '原功能涉及複雜問題，已超出維護可行範圍，新功能尚在構思若有甚麼idea還贏透過首頁的「聯絡我們」分享你的想法'
  },
  function2: {
    enabled: true,
    title: '此功能虛位以待',
    message: '原功能涉及複雜問題，已超出維護可行範圍，新功能尚在構思若有甚麼idea還贏透過首頁的「聯絡我們」分享你的想法'
  }
}
