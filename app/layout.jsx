export const metadata = {
  title: "BPA Multi-Site Starter",
  description: "Single Next.js repo serving shop/clinic/mother/admin using middleware rewrite.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
