import "./globals.css";

export const metadata = {
  title: "AI ให้เลขเด็ด | ระบบทำนายเลข",
  description:
    "ระบบวิเคราะห์เลขเพื่อความบันเทิง จากวันเกิด ความฝัน กระแส Social และข้อมูลที่สมาชิกบันทึก",
  manifest: "/manifest.json",
  themeColor: "#12063a",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
