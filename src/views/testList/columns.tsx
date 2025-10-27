import { message } from "@/utils/message";
import { tableData } from "./data";
import { ref, computed, onBeforeUnmount, shallowRef } from "vue";
import { useTestOperateStore } from "@/store/modules/testOperate";
import { addDrawer } from "@/components/ReDrawer/index";

export function useColumns() {
  // 對於不需要深度追蹤的複雜物件，使用 shallowRef 可以提升性能
  const allLogs = shallowRef(
    new Map<string, { text: string; color?: string }[]>()
  );
  const search = ref("");
  const testOperateStore = useTestOperateStore();

  // 將單一 ws ref 改為一個 Map 來儲存多個連線
  const testConnections = new Map<string, WebSocket>();

  const filterTableData = computed(() =>
    tableData.filter(
      data =>
        !search.value ||
        data.testId.toLowerCase().includes(search.value.toLowerCase())
    )
  );

  // 元件卸載時，關閉所有連線
  onBeforeUnmount(() => {
    for (const ws of testConnections.values()) {
      ws.close();
    }
    testConnections.clear();
  });

  const handleExcuteTest = async row => {
    const testId = row.testId;

    message(`執行測試 ${testId}，點擊 LiveMessage 可以查看即時訊息`);

    // 增加一個檢查，如果測試已在執行中，則提示用戶，避免重複執行
    if (testConnections.has(testId)) {
      message(`測試 ${testId} 正在執行中`, { type: "warning" });
      liveMessage(row); // 可以選擇直接打開訊息面板
      return;
    }

    // 每次執行測試時，為該 testId 建立一個新的 logs 陣列
    if (!allLogs.value.has(testId)) {
      allLogs.value.set(testId, []);
    }
    const logs = allLogs.value.get(testId);
    // 清空上次的日誌
    logs.length = 0;

    let ws: WebSocket;
    try {
      logs.push({
        text: `[${new Date().toLocaleTimeString()}] 開始連線...`
      });
      ws = await testOperateStore.stWsConnect("tests/ws/run_tests");
      testConnections.set(testId, ws);
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

    ws.send(row.testId);
    logs.push({
      text: `[${new Date().toLocaleTimeString()}] 連線成功，已傳送測試ID至後端: ${
        row.testId
      }`
    });

    ws.onmessage = event => {
      try {
        const messageData = JSON.parse(event.data);
        // 判斷訊息類型
        if (messageData.type === "result") {
          logs.push({
            text: `[${new Date().toLocaleTimeString()}] ${messageData.message}`,
            color: messageData.status === "PASS" ? "green" : "red"
          });
          message(`${messageData.message}`, {
            type: messageData.status === "PASS" ? "success" : "error"
          });
        } else if (messageData.type === "error") {
          message(`${messageData.message}`, { type: "error" });
          logs.push({
            text: `[${new Date().toLocaleTimeString()}] ${messageData.message}`,
            color: "red"
          });
        } else if (messageData.type === "warning") {
          message(`${messageData.message}`, { type: "warning" });
        } else {
          logs.push({
            text: `[${new Date().toLocaleTimeString()}] ${messageData.message}`
          });
        }
      } catch {
        // 如果不是 JSON 格式，當作一般日誌處理
        logs.push({ text: event.data });
      }
    };
    ws.onerror = event => {
      logs.push({
        text: `[${new Date().toLocaleTimeString()}] ws錯誤: ${JSON.stringify(
          event
        )}`,
        color: "red"
      });
      // 連線出錯後，從 Map 中移除
      testConnections.delete(testId);
    };
    ws.onclose = () => {
      logs.push({ text: `[${new Date().toLocaleTimeString()}] ws關閉` });
      // 連線關閉後，從 Map 中移除
      testConnections.delete(testId);
    };
  };

  const liveMessage = row => {
    const testId = row.testId;
    // 取得對應 testId 的 logs，如果不存在就給一個空陣列
    const logs = allLogs.value.get(testId) ?? [];

    addDrawer({
      title: `測試 ${testId} 即時訊息`,
      contentRenderer: () => (
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
      )
    });
  };

  const StopTest = row => {
    const testId = row.testId;
    const ws = testConnections.get(testId);
    if (ws) {
      // 主動關閉連線。後續的清理工作會由 onclose 事件處理
      ws.close();
      testConnections.delete(testId);
      message(`已送出停止測試 ${testId} 的請求`, { type: "warning" });
    } else {
      message(`測試 ${testId} 不在執行中或已結束`, { type: "info" });
    }
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
