import {
  apiCheckConnection,
  apiExecuteTest,
  wsConnect
} from "@/api/testOperate";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useTestOperateStore = defineStore("testOperate", () => {
  const result = ref("default");

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

  const stWsConnect = async url => {
    return await wsConnect(url);
  };

  return {
    result,
    stApiCheckConnection,
    stApiExecuteTest,
    stWsConnect
  };
});
