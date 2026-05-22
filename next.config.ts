import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig = {
  reactStrictMode: true,
  // @resvg/resvg-js trae bindings nativos (.node) que no pueden bundlearse por webpack.
  // Debe ser resuelto directamente por Node en runtime del servidor.
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default withNextIntl(nextConfig);
