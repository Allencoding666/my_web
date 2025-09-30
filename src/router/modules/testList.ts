export default {
  path: "/testList",
  redirect: "/testList/index",
  meta: {
    title: "測試列表",
    rank: 9
  },
  children: [
    {
      path: "/testList/index",
      name: "testList",
      component: () => import("@/views/testList/index.vue"),
      meta: {
        title: "測試列表"
      }
    }
  ]
} satisfies RouteConfigsTable;
