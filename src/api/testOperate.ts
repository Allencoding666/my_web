import { http } from "@/utils/http";
import { apiTestUrl } from "./utils";

/** 單一報告的資訊 */
export interface ReportInfo {
  file_name: string;
  url: string;
  created_at: string;
}

/** 測試報告列表的回應模型 */
export interface ReportListResponse {
  reports: ReportInfo[];
}

/** api: 取得test status */
export const apiGetStatus = () => {
  return http.request<any>("get", apiTestUrl(`status`));
};

/** api: 停止測試 */
export const apiPostStopTest = (testId?: string) => {
  return http.request<any>("post", apiTestUrl(`stop_tests`), {
    data: { test_id: testId }
  });
};

/** api: 取得test log */
export const apiGetLog = (testId?: string) => {
  return http.request<any>("get", apiTestUrl(`log/${testId}`));
};

/** api: 取得test report */
export const apiGetReport = (testId?: string) => {
  return http.request<ReportListResponse>(
    "get",
    apiTestUrl(`reports/${testId}`)
  );
};
