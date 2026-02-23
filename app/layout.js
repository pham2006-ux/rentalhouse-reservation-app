import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
});

export const metadata = {
  title: '内見予約 変更・キャンセル | 不動産管理',
  description: '内見予約の変更・キャンセルを行うページです。受付番号と電話番号でログインしてください。',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className={notoSansJP.className}>{children}</body>
    </html>
  );
}
