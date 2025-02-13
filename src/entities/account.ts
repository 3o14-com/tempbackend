import xss from "xss";
import type { Account, AccountOwner, Follow } from "../schema";
import type { Uuid } from "../uuid";

export function serializeAccount(
  account: Account & { successor: Account | null },
  baseUrl: URL | string,
): Record<string, unknown> {
  // biome-ignore lint/style/noParameterAssign: make sure the URL is a URL
  baseUrl = new URL(baseUrl);
  const username = account.handle.replaceAll(/(?:^@)|(?:@[^@]+$)/g, "");
  const defaultAvatarUrl = new URL(
    "/image/avatars/original/missing.png",
    baseUrl,
  ).href;
  const defaultHeaderUrl = new URL(
    "/image/headers/original/missing.png",
    baseUrl,
  ).href;
  let acct = account.handle.replace(/^@/, "");
  if (acct.endsWith(`@${baseUrl.host}`)) {
    acct = acct.replace(/@[^@]+$/, "");
  }
  return {
    id: account.id,
    username,
    acct,
    display_name: account.name,
    locked: account.protected,
    bot: account.type === "Application" || account.type === "Service",
    created_at: account.published ?? account.updated,
    note: xss(account.bioHtml ?? ""),
    url: account.url ?? account.iri,
    avatar: account.avatarUrl ?? defaultAvatarUrl,
    avatar_static: account.avatarUrl ?? defaultAvatarUrl,
    header: account.coverUrl ?? defaultHeaderUrl,
    header_static: account.coverUrl ?? defaultHeaderUrl,
    followers_count: account.followersCount,
    following_count: account.followingCount,
    statuses_count: account.postsCount,
    moved:
      account.successor == null
        ? null
        : serializeAccount({ ...account.successor, successor: null }, baseUrl),
    last_status_at: null,
    fields: Object.entries(account.fieldHtmls).map(([name, value]) => ({
      name,
      value,
      verified_at: null,
    })),
  };
}

export function serializeAccountOwner(
  accountOwner: AccountOwner & {
    account: Account & { successor: Account | null };
  },
  baseUrl: URL | string,
): Record<string, unknown> {
  return {
    ...serializeAccount(accountOwner.account, baseUrl),
    discoverable: accountOwner.discoverable,
    source: accountOwner && {
      note: accountOwner.bio,
      privacy: accountOwner.visibility,
      sensitive: accountOwner.account.sensitive,
      language: accountOwner.language,
      follow_requests_count: 0,
      fields: Object.entries(accountOwner.fields).map(([name, value]) => ({
        name,
        value,
        verified_at: null,
      })),
    },
  };
}

export function serializeRelationship(
  account: Account & {
    followers: Follow[];
    following: Follow[];
  },
  currentAccountOwner: { id: Uuid },
): Record<string, unknown> {
  const following = account.followers.find(
    (f) => f.followerId === currentAccountOwner.id,
  );
  const followedBy = account.following.find(
    (f) => f.followingId === currentAccountOwner.id,
  );
  return {
    id: account.id,
    following: following?.approved != null,
    showing_reblogs: following?.shares === true,
    notifying: following?.notify === true,
    languages: following == null ? null : following.languages,
    followed_by: followedBy?.approved != null,
    requested: following != null && following.approved == null,
    requested_by: followedBy != null && followedBy.approved == null,
    domain_blocking: false, // TODO
    endorsed: false, // TODO
    note: "", // TODO
  };
}
