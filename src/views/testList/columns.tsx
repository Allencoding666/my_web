import { message } from "@/utils/message";
import { tableData } from "./data";
import { ref, computed, onMounted } from "vue";
import { useTestOperateStore } from "@/store/modules/testOperate";
import { addDrawer } from "@/components/ReDrawer/index";
import { storeToRefs } from "pinia";

export function useColumns() {
  const search = ref("");
  const testOperateStore = useTestOperateStore();

  // 從 store 中取得 allLogs 的響應式引用
  const { allLogs } = storeToRefs(testOperateStore);

  // 在組件掛載時建立 WebSocket 連線
  onMounted(() => {
    testOperateStore.stWsConnect("tests/ws/test_manager").catch(error => {
      message(`WebSocket 連線失敗: ${error.message}`, { type: "error" });
    });
  });

  const filterTableData = computed(() =>
    tableData.filter(
      data =>
        !search.value ||
        data.testId.toLowerCase().includes(search.value.toLowerCase())
    )
  );

  const handleExcuteTest = async row => {
    const testId = row.testId;
    message(`執行測試 ${testId}，點擊 LiveMessage 可以查看即時訊息`);

    // 每次執行測試時，為該 testId 建立一個新的 logs 陣列
    try {
      testOperateStore.stWsExecuteTest(row.testId);
    } catch (error) {
      message(`執行測試 ${testId} 失敗，請點擊 LiveMessage 查看即時訊息`, {
        type: "error"
      });
      // 將錯誤訊息記錄到 Log 中
      const logs = allLogs.value.get(testId);
      if (logs) {
        logs.push({ text: `[ERROR] ${error.message}`, color: "red" });
      }
      return; // 發生錯誤時，中斷後續執行
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

  const handleStopTest = row => {
    const testId = row.testId;
    testOperateStore.stWsStopTest(testId);
    message(`已送出停止測試 ${testId} 的請求`, { type: "warning" });
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
          size="default"
          clearable
          placeholder="輸入測試ID進行搜尋"
        />
      ),
      cellRenderer: ({ row }) => (
        <>
          <el-button
            size="default"
            type="primary"
            onClick={() => handleExcuteTest(row)}
          >
            ExcuteTest
          </el-button>
          <el-button
            size="default"
            type="primary"
            onClick={() => liveMessage(row)}
          >
            LiveMessage
          </el-button>
          <el-button
            size="default"
            type="danger"
            onClick={() => handleStopTest(row)}
          >
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
