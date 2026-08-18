export const ASSESSMENT_QUERY_CARDS = {
  listPublishedBlueprints: {
    id: "Q-ASM-01",
    useCase: "Liệt kê đề thi đã publish trên trang /exams",
    collection: "examBlueprints",
    filters: ["status == published"],
    orderBy: [],
    limit: 20,
    readBudget: 20,
  },
  getPublishedBlueprint: {
    id: "Q-ASM-02",
    useCase: "Đọc chi tiết đề thi đã publish bằng stable ID",
    collection: "examBlueprints",
    filters: ["documentId == blueprintId", "status == published (application guard)"],
    orderBy: [],
    limit: 1,
    readBudget: 1,
  },
  getLatestPublishedFormVersion: {
    id: "Q-ASM-03",
    useCase: "Chọn form exam mới nhất khi bắt đầu attempt",
    collection: "examFormVersions",
    filters: ["blueprintId ==", "status == published"],
    orderBy: ["publishedAt desc"],
    limit: 1,
    readBudget: 1,
  },
} as const;
