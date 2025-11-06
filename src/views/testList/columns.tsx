import { computed, onMounted, onBeforeUnmount, type Ref } from "vue";
import { storeToRefs } from "pinia";
import { message } from "@/utils/message";
import { useTestOperateStore } from "@/store/modules/testOperate";
import { addDrawer } from "@/components/ReDrawer/index";
import { Loading } from "@element-plus/icons-vue";

export function useColumns(search: Ref<string>) {
  const testOperateStore = useTestOperateStore();

  // 從 store 中取得 testList 和 tests 的響應式引用
  const { testList } = storeToRefs(testOperateStore);

  // 在組件掛載時建立 WebSocket 連線
  onMounted(() => {
    // 初始載入一次狀態
    testOperateStore.stApiGetStatus();
    testOperateStore.stWsConnect("/test_manager").catch(error => {
      message(`WebSocket 連線失敗: ${error.message}`, { type: "error" });
    });

    window.addEventListener("beforeunload", testOperateStore.stWsDisconnect);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", testOperateStore.stWsDisconnect);
  });

  /**
   * 一個高階函式，用於包裝 cellRenderer。
   * 當 row.status 為 'running' 時，顯示載入圖示，否則顯示原始內容。
   * @param originalRenderer - 原始的 cellRenderer 函式
   */
  const withLoadingState = (
    originalRenderer: (scope: { row?: any }) => JSX.Element | null
  ) => {
    return (scope: { row?: any }) => {
      if (scope.row && scope.row.status === "running") {
        return (
          <div class="flex items-center justify-center">
            <el-icon class="is-loading" size="20">
              <Loading />
            </el-icon>
          </div>
        );
      }
      return originalRenderer(scope);
    };
  };

  const filterTableData = computed(() =>
    testList.value.filter(
      data =>
        !search.value ||
        data.testId.toLowerCase().includes(search.value.toLowerCase())
    )
  );

  const handleExcuteTest = async row => {
    await testOperateStore.stWsExecuteTest(row.testId);
  };

  const testLog = async row => {
    const testId = row.testId;
    // 使用 await 等待 stApiGetLog 的 Promise 解析，以取得後端回傳的 log
    const { data } = await testOperateStore.stApiGetLog(row.testId);

    addDrawer({
      title: `最後一次測試 ${testId} 的log`,
      size: 700,
      contentRenderer: () => {
        // 直接使用從 API 取得的 log 資料
        return (
          <div>
            {!data.log ? (
              <p>暫無訊息</p>
            ) : (
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {data.log}
              </pre>
            )}
          </div>
        );
      }
    });
  };

  const testReport = async row => {
    const testId = row.testId;
    const data = await testOperateStore.stApiGetReport(row.testId);

    addDrawer({
      title: `${testId} 的測試報告`,
      size: 700,
      contentRenderer: () => {
        return (
          <div>
            {data.length === 0 ? (
              <p>暫無報告</p>
            ) : (
              <ul>
                {data.map(report => (
                  <li key={report.file_name} style={{ marginBottom: "8px" }}>
                    <a
                      href={report.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {report.file_name}
                    </a>
                    <span style={{ marginLeft: "10px", color: "#888" }}>
                      ({report.created_at})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }
    });
  };
  const handleStopTest = row => {
    const testId = row.testId;
    testOperateStore.stApiStopTest(testId);
  };

  const columns: TableColumnList = [
    {
      label: "測試id",
      prop: "testId",
      align: "center"
    },
    {
      label: "描述",
      prop: "description",
      align: "center"
    },
    {
      label: "測試結果",
      prop: "last_result",
      align: "center",
      cellRenderer: withLoadingState(({ row }) => {
        if (!row.last_result) return null;

        const resultMap = {
          PASS: { type: "success" },
          FAIL: { type: "danger" },
          ERROR: { type: "danger" },
          "NO TEST LOG": { type: "warning" }
        };

        const resultInfo = resultMap[row.last_result] || {
          type: "info" // 未知結果使用預設樣式
        };
        return (
          <el-tag
            disable-transitions={true}
            effect={"dark"}
            type={resultInfo.type}
          >
            {row.last_result}
          </el-tag>
        );
      })
    },
    {
      label: "測試時間",
      prop: "start_time",
      align: "center",
      cellRenderer: withLoadingState(({ row }) => <span>{row.start_time}</span>)
    },
    {
      label: "執行時間(秒)",
      prop: "execution_time",
      align: "center",
      cellRenderer: withLoadingState(({ row }) => (
        <span>{row.execution_time}</span>
      ))
    },
    {
      label: "測試狀態",
      prop: "status",
      align: "center",
      cellRenderer: ({ row }) => {
        const statusMap = {
          idle: { text: "閒置中", type: "info" },
          running: { text: "執行中", type: "primary" },
          stopped: { text: "已停止", type: "warning" }
        };

        const statusInfo = statusMap[row.status] || {
          text: row.status, // 如果出現未知的狀態，直接顯示原文
          type: "warning"
        };

        return <el-tag type={statusInfo.type}>{statusInfo.text}</el-tag>;
      }
    },
    {
      label: "操作",
      prop: "actions",
      align: "center",
      cellRenderer: ({ row }) => (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            alignItems: "center"
          }}
        >
          <el-button
            type="primary"
            style={{ margin: 0 }}
            onClick={() => handleExcuteTest(row)}
            loading={row.status === "running"}
          >
            執行測試
          </el-button>
          <el-button
            type="danger"
            style={{ margin: 0 }}
            onClick={() => handleStopTest(row)}
            disabled={row.status !== "running"}
          >
            中斷測試
          </el-button>
          <el-button
            type="primary"
            style={{ margin: 0 }}
            onClick={() => testLog(row)}
            loading={row.status === "running"}
          >
            測試日誌
          </el-button>
          <el-button
            type="primary"
            style={{ margin: 0 }}
            onClick={() => testReport(row)}
          >
            測試報告
          </el-button>
        </div>
      )
    }
  ];

  return {
    columns,
    filterTableData
  };
}
