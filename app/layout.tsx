import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoThai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "ถามคู่มือสารเคมีเกษตร",
  description:
    "ถามตอบจากคู่มือคำแนะนำการใช้สารป้องกันกำจัดศัตรูพืช กรมวิชาการเกษตร พร้อมอ้างอิงเอกสาร ฉบับ และหน้า",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={notoThai.variable}>
      <body>{children}</body>
    </html>
  );
}
