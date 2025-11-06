const Layout = () => import("@/layout/index.vue");

export default {
  path: "/testList",
  name: "TestList",
  component: Layout,
  redirect: "/testList/index",
  meta: {
    title: "測試列表",
    rank: 1
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
