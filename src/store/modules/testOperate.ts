import { apiCheckConnection, apiExecuteTest } from "@/api/testOperate";
import { wsTestUrl } from "@/api/utils";
import { message } from "@/utils/message";
import { defineStore } from "pinia";
import { ref } from "vue";

// 定義 UI 函式庫接受的訊息類型
type LogColor = "inherit" | "orange" | "red" | "green";

// 定義後端 WebSocket 可能傳來的類型
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
  // 3. 建立一個強型別的對照表
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

      wsInstance.value.onmessage = event => {
        // 在這裡處理從後端收到的即時訊息
        // 例如：更新測試日誌、進度條、測試結果等

        try {
          const messageData = JSON.parse(event.data);
          const { test_id: testId, type, message: msg, log } = messageData;

          if (!testId) {
            console.warn("Received a message without testId:");
            return;
          }

          const logs = allLogs.value.get(testId);
          if (!logs) return;

          const logItem: LogItem = {
            text: `[${new Date().toLocaleTimeString()}] ${log}`
          };

          if (msg) {
            message(msg, { type: type });
          }

          if (log) {
            logItem.color = colorMap[type as BackendMessageType];
            logs.push(logItem);
          }

          // // 判斷訊息類型
          // if (type === "result") {
          //   if (msg) {
          //     message(msg, {
          //       type: colorMap[status as "PASS" | "FAIL"]
          //     });
          //   }
          //   if (log) {
          //     logItem.color = status === "PASS" ? "green" : "red";
          //     logs.push(logItem);
          //   }
          // } else if (type === "error") {
          //   message(msg, { type: "error" });
          //   logItem.color = "red";
          //   logs.push(logItem);
          // } else if (type === "warning") {
          //   message(msg, { type: "warning" });
          // }
        } catch (e) {
          // 如果不是 JSON 格式，當作一般日誌處理
          // 這邊需要一個方法來確定這個日誌屬於哪個測試，
          // 如果後端無法提供 test_id，這裡的處理會比較困難。
          // 暫時假設所有非 JSON 訊息都添加到最後一個觸發的測試中 (這不是一個完美的解決方案)
          console.warn("Received non-JSON message:", event.data, e);
        }
      };

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

  /** 透過已建立的 WebSocket 連線發送測試指令 */
  const stWsExecuteTest = (testId: string) => {
    if (wsInstance.value && isWsOpen.value) {
      wsInstance.value.send(testId);
      result.value = `已發送測試指令: ${testId}`;

      const logs = allLogs.value.get(testId);
      if (logs) {
        logs.push({
          text: `[${new Date().toLocaleTimeString()}] 已傳送測試ID至後端: ${testId}`
        });
      }
    } else {
      result.value = "WebSocket 尚未連線，請先連線。";
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
    stWsExecuteTest
  };
});
