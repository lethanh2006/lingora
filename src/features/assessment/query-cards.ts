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
} as const;
