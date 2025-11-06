<script setup lang="tsx">
import { useTestOperateStore } from "@/store/modules/testOperate";
import { storeToRefs } from "pinia";
import { ref } from "vue";
import { useColumns } from "./columns";

defineOptions({
  name: "testList"
});

const search = ref("");
const { columns, filterTableData } = useColumns(search);
</script>

<template>
  <div>
    <div style="margin-bottom: 16px">
      <el-input
        v-model="search"
        size="default"
        clearable
        placeholder="輸入測試id進行搜尋"
        style="width: 240px"
      />
    </div>
    <pure-table :data="filterTableData" :columns="columns" />
  </div>
</template>
