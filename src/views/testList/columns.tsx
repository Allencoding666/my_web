import { message } from "@/utils/message";
import { tableData } from "./data";
import { ref, computed, onBeforeUnmount } from "vue";
import { useTestOperateStore } from "@/store/modules/testOperate";

// 需是hooks写法（函数中有return），避免失去响应性
export function useColumns() {
  const search = ref("");
  const testOperateStore = useTestOperateStore();
  // const ws = ref<WebSocket | null>(null);

  // 將單一 ws ref 改為一個 Map 來儲存多個連線
  const testConnections = new Map<string, WebSocket>();

  const filterTableData = computed(() =>
    tableData.filter(
      data =>
        !search.value ||
        data.testId.toLowerCase().includes(search.value.toLowerCase())
    )
  );

  const handleEdit = (index: number, row) => {
    message(`您修改了第 ${index} 行，数据为：${JSON.stringify(row)}`, {
      type: "success"
    });
  };

  const handleDelete = (index: number, row) => {
    message(`您删除了第 ${index} 行，数据为：${JSON.stringify(row)}`);
  };

  // 元件卸載時，關閉所有連線
  onBeforeUnmount(() => {
    for (const ws of testConnections.values()) {
      ws.close();
    }
    testConnections.clear();
  });

  const handleExcuteTest = async row => {
    const testId = row.testId;

    // 如果此測試已在執行，可以選擇提示使用者或忽略
    if (testConnections.has(testId)) {
      const existingWs = testConnections.get(testId);
      if (existingWs.readyState < 2) {
        // CONNECTING or OPEN
        message(`測試 ${testId} 已在執行中`, { type: "warning" });
        return;
      }
    }

    let ws: WebSocket;
    try {
      ws = await testOperateStore.connectWs();
      testConnections.set(testId, ws);
      message(`測試 ${testId} 開始連線...`, { type: "info" });
    } catch (error) {
      message(`測試 ${testId} 連線ws失敗: ${error}`, { type: "error" });
      return;
    }

    ws.onopen = () => {
      ws.send(row.testId);
    };
    ws.onmessage = event => {
      message(`測試 ${testId} 收到訊息: ${event.data}`, { type: "info" });
    };
    ws.onerror = event => {
      message(`測試 ${testId} ws錯誤: ${JSON.stringify(event)}`, {
        type: "error"
      });
      // 連線出錯後，從 Map 中移除
      testConnections.delete(testId);
    };
    ws.onclose = event => {
      message(`測試 ${testId} ws關閉: ${JSON.stringify(event)}`, {
        type: "warning"
      });
      // 連線關閉後，從 Map 中移除
      testConnections.delete(testId);
    };
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
      cellRenderer: ({ index, row }) => (
        <>
          <el-button size="middle" onClick={() => handleEdit(index + 1, row)}>
            Edit
          </el-button>
          <el-button
            size="middle"
            type="danger"
            onClick={() => handleDelete(index + 1, row)}
          >
            Delete
          </el-button>
          <el-button
            size="middle"
            type="primary"
            onClick={() => handleExcuteTest(row)}
          >
            ExcuteTest
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
