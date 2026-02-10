import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const ALLOWED_LOCALES = ["en", "he"] as const;
type AllowedLocale = (typeof ALLOWED_LOCALES)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("locale")?.value;
  const locale: AllowedLocale = ALLOWED_LOCALES.includes(raw as AllowedLocale)
    ? (raw as AllowedLocale)
    : "en";
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
