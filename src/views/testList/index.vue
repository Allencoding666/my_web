<!-- <script setup lang="ts">
import { useTestOperateStore } from "@/store/modules/testOperate";
import { storeToRefs } from "pinia";
import { ref } from "vue";
defineOptions({
  name: "testList"
});

const testOperateStore = useTestOperateStore();
const { check, execute } = testOperateStore;
const { result } = storeToRefs(testOperateStore);
</script>

<template>
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
<script setup lang="ts">
import { useColumns } from "./columns";

const { columns, filterTableData } = useColumns();
</script>

<template>
  <pure-table :data="filterTableData" :columns="columns">
    <!-- <template #nameHeader>
      <span class="flex items-center">
        <IconifyIconOffline :icon="Calendar" />
        日期123
      </span>
    </template> -->
  </pure-table>
</template>
