import { executeTest, checkConnection } from "@/api/testOperate";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useTestOperateStore = defineStore("testOperate", () => {
  const result = ref("default");

  const check = async () => {
    try {
      const res = await checkConnection();
      result.value = `連線成功: ${JSON.stringify(res)}`;
    } catch (error) {
      result.value = `連線失敗: ${error}`;
    }
    return result.value;
  };
  const execute = async () => {
    return await executeTest();
  };
  return {
    result,
    execute,
    check
  };
});
