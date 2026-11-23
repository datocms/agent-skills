import { executeQuery as libExecuteQuery } from "@datocms/cda-client";

export function executeQuery<Result>(query: string, variables?: Record<string, unknown>) {
  return libExecuteQuery<Result>(query, { variables, token: import.meta.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN });
}
