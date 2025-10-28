import { message } from "@/utils/message";
import { tableData } from "./data";
import { ref, computed, onUnmounted } from "vue";
import { useTestOperateStore } from "@/store/modules/testOperate";
import { addDrawer } from "@/components/ReDrawer/index";
import { storeToRefs } from "pinia";

export function useColumns() {
  const search = ref("");
  const testOperateStore = useTestOperateStore();

  // 從 store 中取得 allLogs 的響應式引用
  const { allLogs } = storeToRefs(testOperateStore);

  const filterTableData = computed(() =>
    tableData.filter(
      data =>
        !search.value ||
        data.testId.toLowerCase().includes(search.value.toLowerCase())
    )
  );

  onUnmounted(() => {
    // 離開頁面時可以選擇性地中斷連線
    testOperateStore.wsInstance?.close();
  });

  const handleExcuteTest = async row => {
    const testId = row.testId;
    message(`執行測試 ${testId}，點擊 LiveMessage 可以查看即時訊息`);

    // 每次執行測試時，為該 testId 建立一個新的 logs 陣列
    allLogs.value.set(testId, []);
    const logs = allLogs.value.get(testId);
    // 清空上次的日誌
    logs.length = 0;

    try {
      logs.push({
        text: `[${new Date().toLocaleTimeString()}] 開始連線...`
      });
      // 如果尚未連線，則等待連線成功
      if (!testOperateStore.isWsOpen) {
        await testOperateStore.stWsConnect("tests/ws/run_tests");
      }
      testOperateStore.stWsExecuteTest(row.testId);
    } catch (error) {
      logs.push({
        text: `[${new Date().toLocaleTimeString()}] 連線ws失敗: ${error}`,
        color: "red"
      });
      message(`執行測試 ${testId} 失敗，請點擊 LiveMessage 查看即時訊息`, {
        type: "error"
      });
      return;
    }
  };

  const liveMessage = row => {
    const testId = row.testId;

    addDrawer({
      title: `測試 ${testId} 即時訊息`,
      size: 700,
      // 讓 contentRenderer 成為一個響應式的渲染函式
      contentRenderer: () => {
        // 在渲染函式內部訪問響應式資料
        const logs = allLogs.value.get(testId) ?? [];
        return (
          <div>
            {logs.length === 0 ? (
              <p>暫無訊息</p>
            ) : (
              logs.map(logItem => (
                <p
                  style={{
                    whiteSpace: "pre-wrap",
                    margin: 0,
                    color: logItem.color ?? "inherit"
                  }}
                >
                  {logItem.text}
                </p>
              ))
            )}
          </div>
        );
      }
    });
  };

  const StopTest = row => {
    console.log(`StopTest clicked ${row}`);
    // const testId = row.testId;
    // const ws = testConnections.get(testId);
    // if (ws) {
    //   // 主動關閉連線。後續的清理工作會由 onclose 事件處理
    //   ws.close();
    //   testConnections.delete(testId);
    //   message(`已送出停止測試 ${testId} 的請求`, { type: "warning" });
    // } else {
    //   message(`測試 ${testId} 不在執行中或已結束`, { type: "info" });
    // }
  };

  const columns: TableColumnList = [
    {
      label: "測試id",
      prop: "testId"
    },
    {
      label: "描述",
      prop: "description"
    },
    {
      label: "測試結果",
      prop: "testResult"
    },
    {
      align: "right",
      // 自定义表头，tsx用法
      headerRenderer: () => (
        <el-input
          v-model={search.value}
          size="middle"
          clearable
          placeholder="輸入測試ID進行搜尋"
        />
      ),
      cellRenderer: ({ row }) => (
        <>
          <el-button
            size="middle"
            type="primary"
            onClick={() => handleExcuteTest(row)}
          >
            ExcuteTest
          </el-button>
          <el-button
            size="middle"
            type="primary"
            onClick={() => liveMessage(row)}
          >
            LiveMessage
          </el-button>
          <el-button size="middle" type="primary" onClick={() => StopTest(row)}>
            StopTest
          </el-button>
        </>
      )
    }
  ];

  return {
    columns,
    filterTableData
  };
}
