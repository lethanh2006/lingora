import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Lingora – Học ngôn ngữ mỗi ngày",
    short_name: "Lingora",
    description: "Học và luyện từ vựng tiếng Anh, Nhật, Trung theo từng chủ đề.",
    lang: "vi",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fdfcf9",
    theme_color: "#118568",
    orientation: "any",
    categories: ["education"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Chọn chủ đề học",
        short_name: "Học ngay",
        description: "Mở danh sách chủ đề từ vựng",
        url: "/learn",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Luyện tập",
        short_name: "Luyện tập",
        description: "Tiếp tục một phiên luyện từ vựng",
        url: "/review",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
