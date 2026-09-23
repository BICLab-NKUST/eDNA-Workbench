# eDNA WorkBench 技術債與風險清單

本文件用來追蹤 2026-08-23 專案盤點時確認的風險。這些項目目前只做紀錄，尚未修改產品行為。

優先級定義：

- **P0**：可能造成資料損失、安全事件或主要流程完全不可用，應立即處理。
- **P1**：會造成核心功能失效、背景工作失控或發布不可靠，應優先排入近期工作。
- **P2**：不一定立刻中斷功能，但會持續增加維護成本、效能問題或交付風險。

狀態定義：`Open` 尚未處理、`In progress` 處理中、`Verified` 已修復並完成驗證。

## RISK-001：停止分析可能無法終止 Docker 工作

- 優先級：**P1**
- 狀態：`Open`
- 證據：分析路由依賴 `currentPythonProcess` 執行 `SIGTERM`／`SIGKILL`，但執行器只在步驟結束時用 `processCallback(null)` 清除參考；真正由 Docker service 建立的 `dockerProcess` 沒有傳回路由層。
- 相關位置：
  - [`backend-toolkit/src/routes/analysis.js`](../backend-toolkit/src/routes/analysis.js)
  - [`backend-toolkit/src/services/pythonExecutor.js`](../backend-toolkit/src/services/pythonExecutor.js)
  - [`backend-toolkit/src/services/dockerService.js`](../backend-toolkit/src/services/dockerService.js)
- 影響：介面顯示已停止，但容器內的分析可能仍持續消耗 CPU、記憶體與磁碟，並繼續寫入輸出。
- 建議：讓 Docker service 明確回傳或註冊可取消的工作控制器；停止 API 應等待容器確實退出後才更新狀態。
- 完成條件：建立長時間測試工作，呼叫停止後確認 Docker process/container 已退出、狀態一致、輸出不再增加，並有自動化測試覆蓋。

## RISK-002：Visualization API 的清除端點會呼叫不存在的方法

- 優先級：**P1**
- 狀態：`Open`
- 證據：[`backend-viz/routes/sequences.js`](../backend-viz/routes/sequences.js) 呼叫 `storage.clearSequences()` 與 `storage.clearGeneCounts()`，但 [`backend-viz/services/storageService.js`](../backend-viz/services/storageService.js) 未匯出這兩個方法。
- 影響：呼叫清除端點時會發生 runtime error，舊序列與 gene count 狀態可能無法重設。
- 建議：在 storage service 實作並匯出清除方法，或將端點改成目前實際存在的統一 reset API。
- 完成條件：清除端點回傳成功；再次讀取時資料為空；連續呼叫仍安全；加入 route/service 測試。

## RISK-003：前端存在大量靜態檢查問題

- 優先級：**P1**
- 狀態：`Open`
- 證據：盤點時 `npm run lint` 回報 **69 errors / 17 warnings**。其中 [`FormattedGeneFATable.jsx`](../frontend/src/features/HaplotypeNetwork/components/GeneTable/Table/FormattedGeneFATable.jsx) 使用未定義的 `toggleLocationSelection`；另有未使用變數、prop 與 React Hooks dependency 警告。
- 影響：未定義 callback 可能在使用者操作時直接造成頁面錯誤；其餘問題會掩蓋新的 regression。
- 建議：先修 runtime 等級錯誤，再分批清理 unused/dependency 問題；修正完成前避免直接以全域 disable 規則壓掉訊號。
- 完成條件：前端 lint 為 0 errors；所有 Hooks 警告逐項確認；Haplotype Network 的 location selection 有互動測試。

## RISK-004：缺少自動化測試、後端 lint 與有效 CI 閘門

- 優先級：**P1**
- 狀態：`Open`
- 證據：Jest 找不到測試；`backend-toolkit` lint 因缺少 ESLint 設定而無法執行；目前未追蹤的 CI／Docker 輔助檔案不足以證明每次變更都會執行 build、lint 與 test。
- 影響：核心分析生命週期、資料清除、API 契約及打包問題只能靠人工發現，重構與發布風險高。
- 建議：先為 RISK-001、RISK-002 建立 regression tests，再補 API smoke tests、前端關鍵互動測試及跨平台 build job。
- 完成條件：CI 在固定 Node/Python 版本上自動執行前後端 lint、單元／整合測試及 production build；任何一步失敗會阻止合併。

## RISK-005：建置依賴未明確鎖定相容的 Node.js 版本

- 優先級：**P2**
- 狀態：`Open`
- 證據：系統 Node.js 20.11.1 無法滿足目前 Vite 的需求，專案內附 Node.js 23.5.0 可以完成 build；根目錄 [`package.json`](../package.json) 沒有 `engines` 或等價的版本宣告。
- 影響：不同開發機與 CI 可能得到「同一份程式碼，有人可建置、有人不可建置」的結果。
- 建議：以受支援的 Node.js LTS 版本作為單一基準（建議 Node 22 LTS），加入 `engines`、版本檔與 CI pinning，並確認下載／封裝腳本一致。
- 完成條件：全新環境依照文件可重現 install、build、test；錯誤版本會在安裝前得到清楚提示。

## RISK-006：前端 bundle 與圖片資產偏大

- 優先級：**P2**
- 狀態：`Open`
- 證據：production build 的主要 JavaScript 約 **1.79 MB**（gzip 約 **577 KB**）；最大首頁圖片約 **5.22 MB**，另有約 **6.9 MB** 的 public icon；完整 `frontend/dist` 約 **19 MB**。
- 影響：桌面程式首次載入、記憶體使用與安裝包大小增加；低效能設備上的等待更明顯。
- 建議：依功能做 route/feature code splitting，將照片轉成適當尺寸的 WebP/AVIF，檢查圖示是否包含不必要解析度，並建立 bundle budget。
- 完成條件：定義並通過可量測的 JS、單張圖片與總資產上限；主要頁面功能與畫質通過人工驗證。

## RISK-007：產品命名與執行設定存在歷史漂移

- 優先級：**P2**
- 狀態：`Open`
- 證據：repository 名稱使用 `MEVPLab`，產品使用 `eDNA WorkBench`，工作資料夾仍出現 `.dna-barcode-toolkit`，且 Docker image／作者等設定有硬編碼或舊名稱。
- 影響：維護者不易判斷哪些名稱是公開契約；改名、資料遷移、部署及除錯容易指向不同位置。
- 建議：指定唯一產品名稱與 internal slug；把 image、資料目錄與服務位址集中到設定；對既有使用者資料提供向後相容的遷移流程。
- 完成條件：文件、UI、package metadata、資料目錄與部署設定遵循已決定的命名規則；舊資料能安全升級。

## 建議處理順序

1. RISK-001：停止分析與實際 process/container 狀態一致。
2. RISK-002：修復 visualization clear API。
3. RISK-003：先消除 runtime lint errors，再清理其餘問題。
4. RISK-004：以以上問題建立第一批 regression tests 與 CI。
5. RISK-005：鎖定可重現的 Node.js／工具鏈版本。
6. RISK-006、RISK-007：安排效能與一致性整理。

## 維護方式

- 每次修復時更新狀態、修復 PR／commit、驗證方式與日期。
- 只有在完成條件全部通過後才標記為 `Verified`。
- 新發現的問題使用下一個 `RISK-xxx` 編號加入，避免只留在聊天或個人筆記。
