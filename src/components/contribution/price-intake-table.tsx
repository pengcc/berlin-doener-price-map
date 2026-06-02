"use client";

import { useMemo, useState } from "react";
import {
  createEmptyPriceIntakeRow,
  formatPriceIntakeRowsAsCsv,
  formatPriceIntakeRowsAsMarkdown,
  type PriceIntakeErrorCode,
  type PriceIntakeField,
  type PriceIntakeRow,
  validatePriceIntakeRows,
} from "@/lib/contribution/price-intake";
import { productTypes, sourceTypes } from "@/lib/validation/options";

type PriceIntakeTableText = {
  addRow: string;
  copyMarkdown: string;
  copied: string;
  downloadCsv: string;
  errors: Record<PriceIntakeErrorCode, string>;
  fields: Record<PriceIntakeField, string>;
  generate: string;
  intro: string;
  manualReview: string;
  openIssue: string;
  outputLabel: string;
  removeRow: string;
  rowHeader: string;
  rowLabel: string;
  statusInvalid: string;
  statusValid: string;
  title: string;
};

type Props = {
  bulkIssueUrl: string;
  productLabels: Record<string, string>;
  sourceLabels: Record<string, string>;
  text: PriceIntakeTableText;
};

type IntakeRowState = PriceIntakeRow & {
  key: string;
};

function createRow(key: string): IntakeRowState {
  return {
    ...createEmptyPriceIntakeRow(),
    key,
  };
}

function getRowLabel(template: string, rowIndex: number) {
  return template.replace("{number}", String(rowIndex + 1));
}

export function PriceIntakeTable({
  bulkIssueUrl,
  productLabels,
  sourceLabels,
  text,
}: Props) {
  const [rows, setRows] = useState<IntakeRowState[]>([createRow("row-1")]);
  const [hasValidated, setHasValidated] = useState(false);
  const [copied, setCopied] = useState(false);
  const validation = useMemo(() => validatePriceIntakeRows(rows), [rows]);
  const markdownOutput = validation.valid
    ? formatPriceIntakeRowsAsMarkdown(validation.normalizedRows)
    : "";
  const csvOutput = validation.valid
    ? formatPriceIntakeRowsAsCsv(validation.normalizedRows)
    : "";

  function updateRow(rowKey: string, field: PriceIntakeField, value: string) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.key === rowKey ? { ...row, [field]: value } : row,
      ),
    );
    setCopied(false);
  }

  function addRow() {
    setRows((currentRows) => [
      ...currentRows,
      createRow(`row-${currentRows.length + 1}-${Date.now()}`),
    ]);
    setCopied(false);
  }

  function removeRow(rowKey: string) {
    setRows((currentRows) =>
      currentRows.length === 1
        ? currentRows
        : currentRows.filter((row) => row.key !== rowKey),
    );
    setCopied(false);
  }

  async function copyMarkdown() {
    if (!markdownOutput) {
      return;
    }

    await navigator.clipboard.writeText(markdownOutput);
    setCopied(true);
  }

  function downloadCsv() {
    if (!csvOutput) {
      return;
    }

    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "berlin-doener-price-observations.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="border border-neutral-900/10 bg-white p-5">
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-xl">{text.title}</h2>
        <p className="text-neutral-700 text-sm leading-6">{text.intro}</p>
        <p className="border border-amber-700/20 bg-amber-50 p-3 text-amber-950 text-sm leading-6">
          {text.manualReview}
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[88rem] border-neutral-900/10 border-y text-left text-sm">
          <thead className="bg-neutral-100 text-neutral-600">
            <tr>
              <th className="w-24 p-3 font-medium">{text.rowHeader}</th>
              <th className="w-44 p-3 font-medium">{text.fields.shopName}</th>
              <th className="w-64 p-3 font-medium">
                {text.fields.shopAddress}
              </th>
              <th className="w-40 p-3 font-medium">{text.fields.district}</th>
              <th className="w-40 p-3 font-medium">{text.fields.observedAt}</th>
              <th className="w-32 p-3 font-medium">{text.fields.priceEuro}</th>
              <th className="w-48 p-3 font-medium">
                {text.fields.productType}
              </th>
              <th className="w-48 p-3 font-medium">{text.fields.sourceType}</th>
              <th className="w-56 p-3 font-medium">{text.fields.sourceUrl}</th>
              <th className="w-64 p-3 font-medium">
                {text.fields.sourceContext}
              </th>
              <th className="w-56 p-3 font-medium">{text.fields.notes}</th>
              <th className="w-28 p-3 font-medium">{text.removeRow}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr className="border-neutral-900/10 border-t" key={row.key}>
                <td className="p-3 align-top text-neutral-600">
                  {getRowLabel(text.rowLabel, rowIndex)}
                </td>
                <td className="p-3 align-top">
                  <input
                    aria-label={`${getRowLabel(text.rowLabel, rowIndex)} ${text.fields.shopName}`}
                    className="min-h-10 w-full border border-neutral-900/15 px-2"
                    onChange={(event) =>
                      updateRow(row.key, "shopName", event.target.value)
                    }
                    value={row.shopName}
                  />
                </td>
                <td className="p-3 align-top">
                  <input
                    aria-label={`${getRowLabel(text.rowLabel, rowIndex)} ${text.fields.shopAddress}`}
                    className="min-h-10 w-full border border-neutral-900/15 px-2"
                    onChange={(event) =>
                      updateRow(row.key, "shopAddress", event.target.value)
                    }
                    value={row.shopAddress}
                  />
                </td>
                <td className="p-3 align-top">
                  <input
                    aria-label={`${getRowLabel(text.rowLabel, rowIndex)} ${text.fields.district}`}
                    className="min-h-10 w-full border border-neutral-900/15 px-2"
                    onChange={(event) =>
                      updateRow(row.key, "district", event.target.value)
                    }
                    value={row.district}
                  />
                </td>
                <td className="p-3 align-top">
                  <input
                    aria-label={`${getRowLabel(text.rowLabel, rowIndex)} ${text.fields.observedAt}`}
                    className="min-h-10 w-full border border-neutral-900/15 px-2"
                    onChange={(event) =>
                      updateRow(row.key, "observedAt", event.target.value)
                    }
                    placeholder="YYYY-MM-DD"
                    value={row.observedAt}
                  />
                </td>
                <td className="p-3 align-top">
                  <input
                    aria-label={`${getRowLabel(text.rowLabel, rowIndex)} ${text.fields.priceEuro}`}
                    className="min-h-10 w-full border border-neutral-900/15 px-2"
                    onChange={(event) =>
                      updateRow(row.key, "priceEuro", event.target.value)
                    }
                    value={row.priceEuro}
                  />
                </td>
                <td className="p-3 align-top">
                  <select
                    aria-label={`${getRowLabel(text.rowLabel, rowIndex)} ${text.fields.productType}`}
                    className="min-h-10 w-full border border-neutral-900/15 bg-white px-2"
                    onChange={(event) =>
                      updateRow(row.key, "productType", event.target.value)
                    }
                    value={row.productType}
                  >
                    {productTypes.map((productType) => (
                      <option key={productType} value={productType}>
                        {productLabels[productType] ?? productType}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3 align-top">
                  <select
                    aria-label={`${getRowLabel(text.rowLabel, rowIndex)} ${text.fields.sourceType}`}
                    className="min-h-10 w-full border border-neutral-900/15 bg-white px-2"
                    onChange={(event) =>
                      updateRow(row.key, "sourceType", event.target.value)
                    }
                    value={row.sourceType}
                  >
                    {sourceTypes.map((sourceType) => (
                      <option key={sourceType} value={sourceType}>
                        {sourceLabels[sourceType] ?? sourceType}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3 align-top">
                  <input
                    aria-label={`${getRowLabel(text.rowLabel, rowIndex)} ${text.fields.sourceUrl}`}
                    className="min-h-10 w-full border border-neutral-900/15 px-2"
                    onChange={(event) =>
                      updateRow(row.key, "sourceUrl", event.target.value)
                    }
                    value={row.sourceUrl}
                  />
                </td>
                <td className="p-3 align-top">
                  <textarea
                    aria-label={`${getRowLabel(text.rowLabel, rowIndex)} ${text.fields.sourceContext}`}
                    className="min-h-24 w-full resize-y border border-neutral-900/15 p-2"
                    onChange={(event) =>
                      updateRow(row.key, "sourceContext", event.target.value)
                    }
                    value={row.sourceContext}
                  />
                </td>
                <td className="p-3 align-top">
                  <textarea
                    aria-label={`${getRowLabel(text.rowLabel, rowIndex)} ${text.fields.notes}`}
                    className="min-h-24 w-full resize-y border border-neutral-900/15 p-2"
                    onChange={(event) =>
                      updateRow(row.key, "notes", event.target.value)
                    }
                    value={row.notes}
                  />
                </td>
                <td className="p-3 align-top">
                  <button
                    className="min-h-10 border border-neutral-900/15 px-3 text-neutral-700 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={rows.length === 1}
                    onClick={() => removeRow(row.key)}
                    type="button"
                  >
                    {text.removeRow}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="inline-flex min-h-10 items-center border border-neutral-900/15 px-3 font-medium text-sm"
          onClick={addRow}
          type="button"
        >
          {text.addRow}
        </button>
        <button
          className="inline-flex min-h-10 items-center bg-neutral-950 px-3 font-medium text-sm text-white"
          onClick={() => setHasValidated(true)}
          type="button"
        >
          {text.generate}
        </button>
      </div>

      {hasValidated && !validation.valid ? (
        <div className="mt-5 border border-red-700/20 bg-red-50 p-4 text-red-950 text-sm">
          <p className="font-semibold">{text.statusInvalid}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {validation.errors.map((error) => (
              <li key={`${error.rowIndex}-${error.field}-${error.code}`}>
                {getRowLabel(text.rowLabel, error.rowIndex)} -{" "}
                {text.fields[error.field]}: {text.errors[error.code]}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasValidated && validation.valid ? (
        <div className="mt-5 border border-emerald-800/20 bg-emerald-50 p-4 text-emerald-950 text-sm">
          <p className="font-semibold">{text.statusValid}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="inline-flex min-h-10 items-center bg-neutral-950 px-3 font-medium text-sm text-white"
              onClick={copyMarkdown}
              type="button"
            >
              {copied ? text.copied : text.copyMarkdown}
            </button>
            <button
              className="inline-flex min-h-10 items-center border border-neutral-900/15 bg-white px-3 font-medium text-neutral-800 text-sm"
              onClick={downloadCsv}
              type="button"
            >
              {text.downloadCsv}
            </button>
            <a
              className="inline-flex min-h-10 items-center border border-neutral-900/15 bg-white px-3 font-medium text-neutral-800 text-sm"
              href={bulkIssueUrl}
              rel="noreferrer"
              target="_blank"
            >
              {text.openIssue}
            </a>
          </div>
          <label
            className="mt-4 block font-medium"
            htmlFor="price-intake-output"
          >
            {text.outputLabel}
          </label>
          <textarea
            className="mt-2 min-h-52 w-full border border-neutral-900/15 bg-white p-3 font-mono text-xs"
            id="price-intake-output"
            readOnly
            value={markdownOutput}
          />
        </div>
      ) : null}
    </section>
  );
}
