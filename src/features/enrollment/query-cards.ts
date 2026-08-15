export const ENROLLMENT_QUERY_CARDS = {
  getEnrollment: {
    id: "Q-ENR-01",
    useCase: "Đọc trạng thái ghi danh của user trong một program",
    path: "users/{uid}/enrollments/{programId}",
    readBudget: 1,
  },
  createEnrollment: {
    id: "Q-ENR-02",
    useCase: "Tạo enrollment idempotent sau khi kiểm tra program đã publish",
    reads: ["programs/{programId}", "users/{uid}/enrollments/{programId}"],
    writes: ["users/{uid}/enrollments/{programId}"],
    readBudget: 2,
    writeBudget: 1,
  },
} as const;
