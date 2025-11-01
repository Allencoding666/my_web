import { apiCheckConnection, apiExecuteTest } from "@/api/testOperate";
import { wsTestUrl } from "@/api/utils";
import { message } from "@/utils/message";
import { defineStore } from "pinia";
import { ref } from "vue";

// 定義 UI 函式庫接受的訊息類型
type LogColor = "inherit" | "orange" | "red" | "green";

// 定義後端 WebSocket 可能傳來的類型 (用於顏色對照)
type BackendMessageType = "info" | "warning" | "error" | "success";

interface LogItem {
  text: string;
  color?: LogColor;
}

export const useTestOperateStore = defineStore("testOperate", () => {
  const result = ref("default");
  const wsInstance = ref<WebSocket | null>(null);
  const isWsOpen = ref(false);
  const allLogs = ref(new Map<string, LogItem[]>());
  // 新增一個暫存日誌的地方，它不是響應式的
  const tempLogs = new Map<string, LogItem[]>();
  // 建立一個強型別的對照表，來針對後端回傳的資料，決定log字體顏色
  const colorMap: Record<BackendMessageType, LogColor> = {
    info: "inherit",
    warning: "orange",
    error: "red",
    success: "green"
  };

  const stApiCheckConnection = async () => {
    try {
      const res = await apiCheckConnection();
      result.value = `連線成功: ${JSON.stringify(res)}`;
    } catch (error) {
      result.value = `連線失敗: ${error}`;
    }
    return result.value;
  };

  const stApiExecuteTest = async () => {
    return await apiExecuteTest();
  };

  /** 建立並管理一個持久的 WebSocket 連線 */
  const stWsConnect = (url: string): Promise<void> => {
    // 使用 Promise 包裝非同步的連線過程
    return new Promise((resolve, reject) => {
      console.log("Attempting to connect to WebSocket...");
      if (wsInstance.value && isWsOpen.value) {
        console.log("WebSocket is already connected.");
        resolve(); // 如果已經連線，直接 resolve
        return;
      }

      // 如果正在連線中，也等待該次連線完成
      if (wsInstance.value && !isWsOpen.value) {
        wsInstance.value.onopen = () => {
          isWsOpen.value = true;
          result.value = "WebSocket 連線成功！";
          console.log("WebSocket connected");
          resolve();
        };
        wsInstance.value.onerror = error => {
          isWsOpen.value = false;
          wsInstance.value = null;
          result.value = `WebSocket 發生錯誤: ${error}`;
          console.error("WebSocket error:", error);
          reject(error);
        };
        return;
      }

      wsInstance.value = new WebSocket(wsTestUrl(url));

      wsInstance.value.onopen = () => {
        isWsOpen.value = true;
        result.value = "WebSocket 連線成功！";
        console.log("WebSocket connected");
        resolve(); // 連線成功時 resolve Promise
      };

      wsInstance.value.onmessage = event => handleWsMessage(event.data);

      wsInstance.value.onclose = () => {
        isWsOpen.value = false;
        wsInstance.value = null;
        result.value = "WebSocket 連線已中斷。";
        console.log("WebSocket disconnected");
      };

      wsInstance.value.onerror = error => {
        isWsOpen.value = false;
        wsInstance.value = null;
        result.value = `WebSocket 發生錯誤: ${error}`;
        console.error("WebSocket error:", error);
        reject(error); // 連線失敗時 reject Promise
      };
    });
  };

  /**
   * 處理 WebSocket 訊息的共用邏輯
   * @param messageData 從 WebSocket 收到的已解析的 JSON 資料
   */
  const handleWsMessage = (messageData: any) => {
    try {
      const { test_id: testId, type, message: msg, log } = messageData;

      if (!testId) {
        console.warn("Received a message without testId:", messageData);
        return;
      }

      // 確保 allLogs 中有該 testId 的條目
      if (!allLogs.value.has(testId)) {
        allLogs.value.set(testId, []);
      }
      // 將log存入暫存區
      const logs = tempLogs.get(testId);
      if (!logs) return; // 如果沒有這個 testId 的暫存區，直接忽略

      // 只有當有 log 內容時才建立 logItem
      if (log) {
        const logItem: LogItem = {
          text: `[${new Date().toLocaleTimeString()}] ${log}`,
          color: colorMap[type as BackendMessageType]
        };
        logs.push(logItem);
      }

      // 3. 只有當測試結束 (success/error) 時，才一次性更新 UI 並顯示通知
      if (type === "success" || type === "error") {
        // 將暫存的日誌寫入響應式的 allLogs
        allLogs.value.set(testId, [...logs]);
        // 清空暫存
        tempLogs.delete(testId);
        // 顯示本地通知
        message(msg, { type: type });
      }
    } catch (e) {
      console.warn("Error processing WebSocket message:", messageData, e);
    }
  };

  /** 透過已建立的 WebSocket 連線發送測試指令 */
  const stWsExecuteTest = (testId: string) => {
    if (wsInstance.value && isWsOpen.value) {
      const command = {
        command: "execute_test",
        test_id: testId
      };
      wsInstance.value.send(JSON.stringify(command));
      result.value = `已發送測試指令: ${testId}`;

      // **重要**：在觸發測試時，清空 UI 日誌和暫存日誌
      allLogs.value.set(testId, []);
      tempLogs.set(testId, []);
      // 可以在 UI 上顯示一條開始訊息
      allLogs.value.get(testId)?.push({
        text: `[${new Date().toLocaleTimeString()}] 已傳送測試ID至後端: ${testId}`
      });
    } else {
      // 拋出錯誤讓 UI 層捕獲
      const errorMsg = "WebSocket 尚未連線，無法執行測試。";
      message(errorMsg, { type: "error" });
      throw new Error(errorMsg);
    }
  };

  /** 透過已建立的 WebSocket 連線發送停止指令 */
  const stWsStopTest = (testId: string) => {
    if (wsInstance.value && isWsOpen.value) {
      // 根據後端 API 設計，發送一個停止指令
      // 這裡假設後端接受 JSON 格式的指令
      const command = {
        command: "stop",
        test_id: testId
      };
      wsInstance.value.send(JSON.stringify(command));
    } else {
      message("WebSocket 尚未連線，無法停止測試。", { type: "error" });
    }
  };

  return {
    result,
    wsInstance,
    isWsOpen,
    allLogs,
    stApiCheckConnection,
    stApiExecuteTest,
    stWsConnect,
    stWsExecuteTest,
    stWsStopTest
  };
});
