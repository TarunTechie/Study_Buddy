import "./globals.css";
import localFont from 'next/font/local'

const myFont = localFont({
  src: [
    {
      path: "../public/fonts/KashieMercy.ttf",
      weight: "500",
      style:"normal"
    }
  ],
  variable:'--font-logo'
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={myFont.variable}>
        {children}
      </body>
    </html>
  );
}
