import {
  apiGetStatus,
  apiPostStopTest,
  apiGetLog,
  apiGetReport,
  type ReportInfo
} from "@/api/testOperate";
import { wsTestUrl } from "@/api/utils";
import { message } from "@/utils/message";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useTestOperateStore = defineStore("testOperate", () => {
  const wsInstance = ref<WebSocket | null>(null);
  const isWsOpen = ref(false);
  const testList = ref<any[]>([]);

  const stApiGetStatus = async () => {
    try {
      const resp = await apiGetStatus();
      const testDataObject = resp.data;

      if (testDataObject && typeof testDataObject === "object") {
        // 將後端回傳的物件轉換為陣列
        testList.value = Object.keys(testDataObject).map(testId => ({
          testId: testId,
          ...testDataObject[testId]
        }));
      }
    } catch (error) {
      message(`Error: 獲取Test Status失敗，${error.message}`, {
        type: "error"
      });
    }
  };

  const stApiStopTest = async (testId: string) => {
    try {
      const resp = await apiPostStopTest(testId);
      if (resp.data.level === "error") {
        // 停止測試遇到異常才推播觸發停止測試的ws，其他情況，會推播給所有有追蹤該testId的ws
        message(resp.data.message, { type: resp.data.level });
      }
      // 停止後立即重新獲取狀態以更新 UI
      await stApiGetStatus();
    } catch (error) {
      message(`Error: 停止測試失敗，${error.message}`, { type: "error" });
    }
  };

  const stApiGetLog = async (testId: string) => {
    try {
      return await apiGetLog(testId);
    } catch (error) {
      message(`Error: 獲取Test Log失敗，${error.message}`, { type: "error" });
    }
  };

  const stApiGetReport = async (testId: string): Promise<ReportInfo[]> => {
    try {
      const resp = await apiGetReport(testId); // resp 的型別現在是 ReportListResponse
      return resp.reports; // 直接從 resp 取用 reports 陣列
    } catch (error) {
      message(`Error: 獲取測試報告列表失敗，${error.message}`, {
        type: "error"
      });
      return []; // 錯誤時返回一個空的報告陣列，型別一致
    }
  };

  /**
   * 處理 WebSocket 訊息的共用邏輯
   * @param msg 從 WebSocket 收到的原始訊息字串
   */
  const handleWsMessage = (msg: string) => {
    try {
      const { type, data } = JSON.parse(msg);

      if (type === "message") {
        // 顯示後端推播的通用訊息
        if (data.message) message(data.message, { type: data.level });
      } else if (type === "test_result") {
        console.log("type", type);
        stApiGetStatus();
      }
    } catch (e) {
      console.warn(
        `Error: error processing WebSocket message，${msg} (${e})`,
        msg,
        e
      );
    }
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
          console.log("WebSocket connected");
          resolve();
        };
        wsInstance.value.onerror = error => {
          const errorMsg = "WebSocket is connecting but an error occurred.";
          isWsOpen.value = false;
          wsInstance.value = null;
          console.error("WebSocket error:", errorMsg, error);
          reject(new Error(errorMsg));
        };
        return;
      }

      wsInstance.value = new WebSocket(wsTestUrl(url));

      wsInstance.value.onopen = () => {
        isWsOpen.value = true;
        console.log("WebSocket connected");
        resolve(); // 連線成功時 resolve Promise
      };

      wsInstance.value.onmessage = event => handleWsMessage(event.data);

      wsInstance.value.onclose = () => {
        isWsOpen.value = false;
        wsInstance.value = null;
        console.log("WebSocket disconnected");
      };

      wsInstance.value.onerror = error => {
        const errorMsg = "WebSocket connection failed.";
        isWsOpen.value = false;
        wsInstance.value = null;
        console.error("WebSocket error:", errorMsg, error);
        reject(new Error(errorMsg)); // 連線失敗時 reject Promise
      };
    });
  };

  /** 透過已建立的 WebSocket 連線發送測試指令 */
  const stWsExecuteTest = async (testId: string) => {
    try {
      if (!wsInstance.value || !isWsOpen.value) {
        // 等待連線成功
        await stWsConnect("/test_manager");
      }
      const command = {
        command: "execute_test",
        test_id: testId
      };
      wsInstance.value.send(JSON.stringify(command));
      stApiGetStatus();
    } catch (error) {
      message(`Error: 執行測試，發生錯誤: ${error}`, { type: "error" });
    }
  };

  const stWsDisconnect = () => {
    if (wsInstance.value) {
      console.log("Closing WebSocket connection due to page unload.");
      // 使用 1000 (Normal Closure) 代碼，這是客戶端允許使用的標準代碼
      wsInstance.value.close(1000, "Page is unloading");
    }
  };

  return {
    wsInstance,
    isWsOpen,
    testList,
    stApiGetStatus,
    stApiStopTest,
    stApiGetLog,
    stApiGetReport,
    stWsConnect,
    stWsExecuteTest,
    stWsDisconnect
  };
});
