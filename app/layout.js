import "./globals.css";

export const metadata = {
  title: "Kindle 提醒面板",
  description: "Kindle reminder panel"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
