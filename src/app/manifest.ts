import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Elúa Kitchen",
    short_name: "Elúa",
    description: "Recetas, escalado y producción de Elúa",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf4ee",
    theme_color: "#fae5d6",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
