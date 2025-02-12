import type { Account, Report } from "../schema";
import { serializeAccount } from "./account";

export function serializeReport(
  report: Report,
  targetAccount: Account & { successor: Account | null },
  baseUrl: URL | string,
  // biome-ignore lint/suspicious/noExplicitAny: JSON
): Record<string, any> {
  return {
    id: report.id,
    comment: report.comment,
    created_at: report.created,
    target_account: serializeAccount(targetAccount, baseUrl),
    status_ids: Array.isArray(report.posts) ? report.posts : [],
    // forward report
    forwarded: true,
    category: "other",
    rule_ids: null,
  };
}
