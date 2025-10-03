import { http } from "@/utils/http";
import { testUrlApi, testUrlWs } from "./utils";

/** 確認連線狀態 */
export const checkConnection = () => {
  return http.request<any>("get", testUrlApi(""));
};

/** 執行測試 */
export const executeTest = (data?: object) => {
  return http.request<any>(
    "get",
    testUrlApi("tests/run_tests/?test_ids=ClientTest00001"),
    { data }
  );
};

/** 執行測試ws */
export const executeTestWs = () => {
  const ws: WebSocket = new WebSocket(testUrlWs("tests/ws/run_tests"));
  return ws;
};
