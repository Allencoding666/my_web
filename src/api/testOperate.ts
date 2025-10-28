import { http } from "@/utils/http";
import { apiTestUrl } from "./utils";

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

// /** 改為透過 WebSocket 發送測試指令 */
// export const wsExecuteTest = async (
//   wsInstance,
//   isWsOpen,
//   result,
//   testId: string
// ) => {
//   if (wsInstance.value && isWsOpen.value) {
//     // const message = {
//     //   type: "run_test",
//     //   payload: {
//     //     test_id: testId
//     //   }
//     // };
//     wsInstance.value.send(testId);
//     result.value = `已發送測試指令: ${testId}`;
//   } else {
//     result.value = "WebSocket 尚未連線，請先連線。";
//     // 或者在這裡自動觸發連線
//     // await stWsConnect();
//     // await stApiExecuteTest(testId);
//   }
// };

// /** ws: 連線 */
// export const wsConnect = (url): Promise<WebSocket> => {
//   return new Promise((resolve, reject) => {
//     const ws: WebSocket = new WebSocket(wsTestUrl(url));

//     // 成功打開連線時，resolve Promise
//     ws.onopen = () => {
//       // 移除錯誤處理器，避免連線成功後又觸發 reject
//       ws.onerror = null;
//       resolve(ws);
//     };

//     // 發生錯誤時，reject Promise
//     ws.onerror = errorEvent => {
//       // 建立一個更有意義的錯誤物件
//       const error = new Error("WebSocket connection failed.");
//       // 您可以選擇性地將原始事件附加到錯誤上
//       (error as any).event = errorEvent;
//       reject(error);
//     };
//   });
// };
// export const wsConnect = (wsInstance, isWsOpen, result, url: string = "ws") => {
//   console.log("Attempting to connect to WebSocket...");
//   if (wsInstance.value && isWsOpen.value) {
//     console.log("WebSocket is already connected.");
//     return;
//   }

//   wsInstance.value = new WebSocket(wsTestUrl(url));

//   wsInstance.value.onopen = () => {
//     isWsOpen.value = true;
//     result.value = "WebSocket 連線成功！";
//     console.log("WebSocket connected");
//   };

//   wsInstance.value.onmessage = event => {
//     // 在這裡處理從後端收到的即時訊息
//     // 例如：更新測試日誌、進度條、測試結果等
//     console.log("Received data:", event.data);
//     result.value = `收到後端訊息: ${event.data}`;
//   };

//   wsInstance.value.onclose = () => {
//     isWsOpen.value = false;
//     wsInstance.value = null;
//     result.value = "WebSocket 連線已中斷。";
//     console.log("WebSocket disconnected");
//   };

//   wsInstance.value.onerror = error => {
//     isWsOpen.value = false;
//     wsInstance.value = null;
//     result.value = `WebSocket 發生錯誤: ${error}`;
//     console.error("WebSocket error:", error);
//   };
// };
