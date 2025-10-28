<script setup lang="tsx">
import { useTestOperateStore } from "@/store/modules/testOperate";
import { storeToRefs } from "pinia";
import { ref } from "vue";
import { useColumns } from "./columns";

defineOptions({
  name: "testList"
});

const testOperateStore = useTestOperateStore();
const { stApiCheckConnection, stApiExecuteTest, stWsConnect, stWsExecuteTest } =
  testOperateStore;
const { result, wsInstance, isWsOpen } = storeToRefs(testOperateStore);

const { columns, filterTableData } = useColumns();
</script>

<!-- <template>
  <p>測試列表的template</p>
  <button @click="check">確認連線</button>
  <div v-if="result === 'default'">
    <p>尚未測試連線</p>
  </div>
  <div v-else>
    <p>{{ result }}</p>
  </div>
  <br />
  <button @click="execute">執行測試</button>
</template> -->

<template>
  <div>
    <pure-table :data="filterTableData" :columns="columns" />
  </div>
</template>
