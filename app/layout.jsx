import "./globals.css";
import "./font.css";
import PluginInit from "@/src/helper/PluginInit";

export const metadata = {
  title: "BPA Web Panels (Wowdash)",
  description: "BPA multi-panel web using Wowdash Tailwind admin template",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Vendor / template styles served from /public/assets */}
        <link rel="stylesheet" href="/assets/css/remixicon.css" />
        <link rel="stylesheet" href="/assets/css/lib/bootstrap.min.css" />
        <link rel="stylesheet" href="/assets/css/lib/apexcharts.css" />
        <link rel="stylesheet" href="/assets/css/lib/dataTables.min.css" />
        <link rel="stylesheet" href="/assets/css/lib/editor-katex.min.css" />
        <link rel="stylesheet" href="/assets/css/lib/editor.atom-one-dark.min.css" />
        <link rel="stylesheet" href="/assets/css/lib/editor.quill.snow.css" />
        <link rel="stylesheet" href="/assets/css/lib/flatpickr.min.css" />
        <link rel="stylesheet" href="/assets/css/lib/full-calendar.css" />
        <link rel="stylesheet" href="/assets/css/lib/jquery-jvectormap-2.0.5.css" />
        <link rel="stylesheet" href="/assets/css/lib/magnific-popup.css" />
        <link rel="stylesheet" href="/assets/css/lib/slick.css" />
        <link rel="stylesheet" href="/assets/css/lib/prism.css" />
        <link rel="stylesheet" href="/assets/css/lib/file-upload.css" />
        <link rel="stylesheet" href="/assets/css/lib/audioplayer.css" />
        <link rel="stylesheet" href="/assets/css/lib/animate.min.css" />
        <link rel="stylesheet" href="/assets/css/style.css" />
        <link rel="stylesheet" href="/assets/css/extra.css" />
      </head>
      <body>
        {children}
        <PluginInit />
      </body>
    </html>
  );
}
