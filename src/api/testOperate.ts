import { http } from "@/utils/http";
import { apiTestUrl, wsTestUrl } from "./utils";

/** api: 確認連線狀態 */
export const apiCheckConnection = () => {
  return http.request<any>("get", apiTestUrl(""));
};

/** api: 執行測試 */
export const apiExecuteTest = (data?: object) => {
  return http.request<any>(
    "get",
    apiTestUrl("tests/run_tests/?test_ids=ClientTest00001"),
    { data }
  );
};

/** ws: 連線 */
export const wsConnect = (url): Promise<WebSocket> => {
  return new Promise((resolve, reject) => {
    const ws: WebSocket = new WebSocket(wsTestUrl(url));

    // 成功打開連線時，resolve Promise
    ws.onopen = () => {
      // 移除錯誤處理器，避免連線成功後又觸發 reject
      ws.onerror = null;
      resolve(ws);
    };

    // 發生錯誤時，reject Promise
    ws.onerror = errorEvent => {
      // 建立一個更有意義的錯誤物件
      const error = new Error("WebSocket connection failed.");
      // 您可以選擇性地將原始事件附加到錯誤上
      (error as any).event = errorEvent;
      reject(error);
    };
  });
};
