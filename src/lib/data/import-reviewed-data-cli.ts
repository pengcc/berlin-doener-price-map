export type ReviewedDataImportArgs = {
  inputPath: string | undefined;
  write: boolean;
};

export function parseReviewedDataImportArgs(
  args: string[],
): ReviewedDataImportArgs {
  let inputPath: string | undefined;
  let write = false;

  for (const arg of args) {
    if (arg === "--write") {
      write = true;
      continue;
    }

    if (arg === "--") {
      continue;
    }

    inputPath ??= arg;
  }

  return { inputPath, write };
}
