import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import type { Locale } from "@/i18n/routing";
import { getLegalConfig } from "@/lib/legal/legal-config";

type Props = {
  params: Promise<{ locale: Locale }>;
};

function InfoSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border border-neutral-900/10 bg-white p-5">
      <h2 className="font-semibold text-xl">{title}</h2>
      <div className="mt-4 text-neutral-700 text-sm leading-6">{children}</div>
    </section>
  );
}

function MissingValue({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex border border-amber-700/20 bg-amber-50 px-2 py-1 text-amber-950">
      {children}
    </span>
  );
}

export default async function ImprintPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "ImprintPage" });
  const legalConfig = getLegalConfig();

  return (
    <AppShell activeHref="/imprint" dataMode="production" locale={locale}>
      <PageHeader
        eyebrow={t("eyebrow")}
        intro={t("intro")}
        title={t("title")}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <InfoSection title={t("operator.title")}>
          <dl className="grid gap-4">
            <div>
              <dt className="font-medium text-neutral-950">
                {t("operator.name")}
              </dt>
              <dd className="mt-1">
                {legalConfig.operatorName ?? (
                  <MissingValue>{t("operator.missingName")}</MissingValue>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-950">
                {t("operator.address")}
              </dt>
              <dd className="mt-1 whitespace-pre-line">
                {legalConfig.operatorAddress ?? (
                  <MissingValue>{t("operator.missingAddress")}</MissingValue>
                )}
              </dd>
            </div>
          </dl>
        </InfoSection>

        <InfoSection title={t("contact.title")}>
          <dl>
            <div>
              <dt className="font-medium text-neutral-950">
                {t("contact.email")}
              </dt>
              <dd className="mt-1">
                {legalConfig.contactEmail ? (
                  <a
                    className="text-neutral-950 underline underline-offset-4"
                    href={`mailto:${legalConfig.contactEmail}`}
                  >
                    {legalConfig.contactEmail}
                  </a>
                ) : (
                  <MissingValue>{t("contact.missing")}</MissingValue>
                )}
              </dd>
            </div>
          </dl>
        </InfoSection>

        <InfoSection title={t("disclaimer.title")}>
          <div className="grid gap-3">
            <p>{t("disclaimer.learning")}</p>
            <p>{t("disclaimer.accuracy")}</p>
            <p>{t("disclaimer.store")}</p>
          </div>
        </InfoSection>

        <InfoSection title={t("readiness.title")}>
          <p>{t("readiness.body")}</p>
        </InfoSection>
      </div>
    </AppShell>
  );
}
