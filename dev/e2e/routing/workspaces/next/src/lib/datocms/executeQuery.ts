import { executeQuery as libExecuteQuery } from "@datocms/cda-client";

export async function executeQuery<Result>(query: string, variables?: Record<string, unknown>) {
  return libExecuteQuery<Result>(query, {
    variables,
    token: process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN!,
  });
}
