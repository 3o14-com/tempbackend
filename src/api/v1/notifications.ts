import { getLogger } from "@logtape/logtape";
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { alias, union } from "drizzle-orm/pg-core";
import { Hono } from "hono";
import { db } from "../../db";
import {
  serializeAccount,
  serializeAccountOwner,
} from "../../entities/account";
import { getPostRelations, serializePost } from "../../entities/status";
import { type Variables, scopeRequired, tokenRequired } from "../../oauth";
import {
  accounts,
  follows,
  likes,
  mentions,
  posts,
} from "../../schema";
import type { Uuid } from "../../uuid";

const logger = getLogger(["3o14", "notifications"]);

const app = new Hono<{ Variables: Variables }>();

export type NotificationType =
  | "mention"
  | "status"
  | "reblog"
  | "follow"
  | "follow_request"
  | "favourite"
  | "update"
  | "admin.sign_up"
  | "admin.report";

app.get(
  "/",
  tokenRequired,
  scopeRequired(["read:notifications"]),
  async (c) => {
    const owner = c.get("token").accountOwner;
    if (owner == null) {
      return c.json(
        { error: "This method requires an authenticated user" },
        422,
      );
    }
    let types = c.req.queries("types[]") as NotificationType[];
    const excludeTypes = c.req.queries("exclude_types[]") as NotificationType[];
    const olderThanStr = c.req.query("older_than");
    const olderThan = olderThanStr == null ? null : new Date(olderThanStr);
    const limit = Number.parseInt(c.req.query("limit") ?? "40");
    if (types == null || types.length < 1) {
      types = [
        "mention",
        "status",
        "reblog",
        "follow",
        "follow_request",
        "favourite",
        "update",
        "admin.sign_up",
        "admin.report",
      ];
    }
    types = types.filter((t) => !excludeTypes?.includes(t));
    const sharingPosts = alias(posts, "sharingPosts");
    const queries = {
      mention: db
        .select({
          id: sql`${posts.id}::text`,
          type: sql<NotificationType>`'mention'`,
          created: sql<Date>`coalesce(${posts.published}, ${posts.updated})`,
          accountId: posts.accountId,
          postId: sql<string | null>`${posts.id}`,
        })
        .from(posts)
        .where(
          and(
            or(
              inArray(
                posts.replyTargetId,
                db
                  .select({ postId: posts.id })
                  .from(posts)
                  .where(eq(posts.accountId, owner.id)),
              ),
              inArray(
                posts.id,
                db
                  .select({ postId: mentions.postId })
                  .from(mentions)
                  .where(eq(mentions.accountId, owner.id)),
              ),
            ),
            olderThan == null ? undefined : lt(posts.published, olderThan),
            ne(posts.accountId, owner.id),
          ),
        )
        .orderBy(desc(posts.published))
        .limit(limit),
      reblog: db
        .select({
          id: sql`${posts.id}::text`,
          type: sql<NotificationType>`'reblog'`,
          created: sql<Date>`coalesce(${posts.published}, ${posts.updated})`,
          accountId: posts.accountId,
          postId: sql<string | null>`${sharingPosts.id}`,
          emoji: sql<string | null>`null`,
          customEmoji: sql<string | null>`null`,
        })
        .from(posts)
        .leftJoin(sharingPosts, eq(posts.sharingId, sharingPosts.id))
        .where(
          and(
            eq(sharingPosts.accountId, owner.id),
            olderThan == null ? undefined : lt(posts.published, olderThan),
            ne(posts.accountId, owner.id),
          ),
        )
        .orderBy(desc(posts.published))
        .limit(limit),
      follow: db
        .select({
          id: sql<string>`${follows.followerId}::text`,
          type: sql<NotificationType>`'follow'`,
          created: sql<Date>`${follows.approved}`,
          accountId: follows.followerId,
          postId: sql<string | null>`null`,
          emoji: sql<string | null>`null`,
          customEmoji: sql<string | null>`null`,
        })
        .from(follows)
        .where(
          and(
            eq(follows.followingId, owner.id),
            isNotNull(follows.approved),
            olderThan == null ? undefined : lt(follows.approved, olderThan),
          ),
        )
        .orderBy(desc(follows.approved))
        .limit(limit),
      follow_request: db
        .select({
          id: sql<string>`${follows.followerId}::text`,
          type: sql<NotificationType>`'follow_request'`,
          created: follows.created,
          accountId: follows.followerId,
          postId: sql<string | null>`null`,
        })
        .from(follows)
        .where(
          and(
            eq(follows.followingId, owner.id),
            isNull(follows.approved),
            olderThan == null ? undefined : lt(follows.created, olderThan),
          ),
        )
        .orderBy(desc(follows.created))
        .limit(limit),
      favourite: db
        .select({
          id: sql<string>`${likes.postId} || ':' || ${likes.accountId}`,
          type: sql<NotificationType>`'favourite'`,
          created: likes.created,
          accountId: likes.accountId,
          postId: sql<string | null>`${likes.postId}`,
          emoji: sql<string | null>`null`,
          customEmoji: sql<string | null>`null`,
        })
        .from(likes)
        .leftJoin(posts, eq(likes.postId, posts.id))
        .where(
          and(
            eq(posts.accountId, owner.id),
            olderThan == null ? undefined : lt(likes.created, olderThan),
            ne(likes.accountId, owner.id),
          ),
        )
        .orderBy(desc(likes.created))
        .limit(limit),
    };
    const qs = Object.entries(queries)
      .filter(([t]) => types.includes(t as NotificationType))
      .map(([, q]) => q);
    if (qs.length < 1) return c.json([]);
    // biome-ignore lint/suspicious/noExplicitAny: ...
    let q: any = qs[0];
    for (let i = 1; i < qs.length; i++) {
      // biome-ignore lint/suspicious/noExplicitAny: ...
      q = union(q, qs[i] as any);
    }
    const notifications = (await db
      .select({
        id: sql<string>`q.id`,
        type: sql<NotificationType>`q."type"`,
        created: sql<Date>`q.created`,
        accountId: sql<string>`q.accountId`,
        postId: sql<string | null>`q.postId`,
      })
      .from(
        sql`${q} AS q (id, "type", created, accountId, postId, emoji, customEmoji)`,
      )
      .orderBy(desc(sql`q.created`))
      .limit(limit)) as {
        id: Uuid;
        type: NotificationType;
        created: Date | string;
        accountId: Uuid;
        postId: Uuid | null;
      }[];
    let nextLink: URL | null = null;
    if (notifications.length >= limit) {
      const oldest = notifications[notifications.length - 1].created;
      nextLink = new URL(c.req.url);
      nextLink.searchParams.set(
        "older_than",
        oldest instanceof Date ? oldest.toISOString() : oldest,
      );
    }
    const accountIds = notifications.map((n) => n.accountId);
    const postIds = notifications
      .filter((n) => n.postId != null)
      .map((n) => n.postId!);
    const accountMap = Object.fromEntries(
      (accountIds.length > 0
        ? await db.query.accounts.findMany({
          where: inArray(accounts.id, accountIds),
          with: { owner: true, successor: true },
        })
        : []
      ).map((a) => [a.id, a]),
    );
    const postMap = Object.fromEntries(
      (postIds.length > 0
        ? await db.query.posts.findMany({
          where: inArray(posts.id, postIds),
          with: getPostRelations(owner.id),
        })
        : []
      ).map((p) => [p.id, p]),
    );
    return c.json(
      notifications
        .map((n) => {
          const created_at =
            n.created instanceof Date
              ? n.created.toISOString()
              : new Date(n.created).toISOString();
          const account = accountMap[n.accountId];
          if (account == null) {
            logger.error(
              "Notification {id} references non-existent account {accountId}; " +
              "available accounts: {accountIds}",
              { ...n, accountIds: Object.keys(accountMap) },
            );
            return null;
          }
          return {
            id: `${created_at}/${n.type}/${n.id}`,
            type: n.type,
            created_at,
            account:
              account.owner == null
                ? serializeAccount(account, c.req.url)
                : serializeAccountOwner(
                  {
                    ...account.owner,
                    account: account,
                  },
                  c.req.url,
                ),
            status:
              n.postId == null
                ? null
                : serializePost(postMap[n.postId], owner, c.req.url),
          };
        })
        .filter((n) => n != null),
      {
        headers:
          nextLink == null ? {} : { Link: `<${nextLink.href}>; rel="next"` },
      },
    );
  },
);

export default app;
