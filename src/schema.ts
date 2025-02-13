import { isNotNull, relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { PreviewCard } from "./previewcard";
import type { Uuid } from "./uuid";

const currentTimestamp = sql`CURRENT_TIMESTAMP`;

export const credentials = pgTable("credentials", {
  email: varchar("email", { length: 254 }).primaryKey(),
  passwordHash: text("password_hash").notNull(),
  created: timestamp("created", { withTimezone: true })
    .notNull()
    .default(currentTimestamp),
});

export type Credential = typeof credentials.$inferSelect;
export type NewCredential = typeof credentials.$inferInsert;

export const totps = pgTable("totps", {
  issuer: text("issuer").notNull(),
  label: text("label").notNull(),
  algorithm: text("algorithm").notNull(),
  digits: smallint("digits").notNull(),
  period: smallint("period").notNull(),
  secret: text("secret").notNull(),
  created: timestamp("created", { withTimezone: true })
    .notNull()
    .default(currentTimestamp),
});

export type Totp = typeof totps.$inferSelect;
export type NewTotp = typeof totps.$inferInsert;

export const accountTypeEnum = pgEnum("account_type", [
  "Application",
  "Group",
  "Organization",
  "Person",
  "Service",
]);

export type AccountType = (typeof accountTypeEnum.enumValues)[number];

export const accounts = pgTable("accounts", {
  id: uuid("id").$type<Uuid>().primaryKey(),
  iri: text("iri").notNull().unique(),
  type: accountTypeEnum("type").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  handle: text("handle").notNull().unique(),
  bioHtml: text("bio_html"),
  url: text("url"),
  protected: boolean("protected").notNull().default(false),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  inboxUrl: text("inbox_url").notNull(),
  followersUrl: text("followers_url"),
  sharedInboxUrl: text("shared_inbox_url"),
  featuredUrl: text("featured_url"),
  followingCount: bigint("following_count", { mode: "number" }).default(0),
  followersCount: bigint("followers_count", { mode: "number" }).default(0),
  postsCount: bigint("posts_count", { mode: "number" }).default(0),
  fieldHtmls: json("field_htmls")
    .notNull()
    .default({})
    .$type<Record<string, string>>(),
  sensitive: boolean("sensitive").notNull().default(false),
  successorId: uuid("successor_id")
    .$type<Uuid>()
    .references((): AnyPgColumn => accounts.id, { onDelete: "cascade" }),
  aliases: text("aliases").array().notNull().default(sql`(ARRAY[]::text[])`),
  instanceHost: text("instance_host")
    .notNull()
    .references(() => instances.host),
  published: timestamp("published", { withTimezone: true }),
  updated: timestamp("updated", { withTimezone: true })
    .notNull()
    .default(currentTimestamp),
});

export const accountRelations = relations(accounts, ({ one, many }) => ({
  owner: one(accountOwners, {
    fields: [accounts.id],
    references: [accountOwners.id],
  }),
  successor: one(accounts, {
    fields: [accounts.successorId],
    references: [accounts.id],
    relationName: "successor",
  }),
  predecessors: many(accounts, { relationName: "successor" }),
  following: many(follows, { relationName: "following" }),
  followers: many(follows, { relationName: "follower" }),
  posts: many(posts),
  mentions: many(mentions),
  likes: many(likes),
  instance: one(instances),
}));

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export const postVisibilityEnum = pgEnum("post_visibility", [
  "public",
  "unlisted",
  "private",
  "direct",
]);

export type PostVisibility = (typeof postVisibilityEnum.enumValues)[number];

export const accountOwners = pgTable("account_owners", {
  id: uuid("id")
    .$type<Uuid>()
    .primaryKey()
    .references(() => accounts.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  rsaPrivateKeyJwk: jsonb("rsa_private_key_jwk").$type<JsonWebKey>().notNull(),
  rsaPublicKeyJwk: jsonb("rsa_public_key_jwk").$type<JsonWebKey>().notNull(),
  ed25519PrivateKeyJwk: jsonb("ed25519_private_key_jwk")
    .$type<JsonWebKey>()
    .notNull(),
  ed25519PublicKeyJwk: jsonb("ed25519_public_key_jwk")
    .$type<JsonWebKey>()
    .notNull(),
  fields: json("fields").notNull().default({}).$type<Record<string, string>>(),
  bio: text("bio"),
  followedTags: text("followed_tags").array().notNull().default([]),
  visibility: postVisibilityEnum("visibility").notNull().default("public"),
  language: text("language").notNull().default("en"),
  discoverable: boolean().notNull().default(false),
});

export type AccountOwner = typeof accountOwners.$inferSelect;
export type NewAccountOwner = typeof accountOwners.$inferInsert;

export const accountOwnerRelations = relations(
  accountOwners,
  ({ one, many }) => ({
    account: one(accounts, {
      fields: [accountOwners.id],
      references: [accounts.id],
    }),
    accessTokens: many(accessTokens),
    lists: many(lists),
  }),
);

export const instances = pgTable("instances", {
  host: text("host").notNull().primaryKey(),
  software: text("software"),
  softwareVersion: text("software_version"),
  created: timestamp("created", { withTimezone: true })
    .notNull()
    .default(currentTimestamp),
});

export type Instance = typeof instances.$inferSelect;
export type NewInstance = typeof instances.$inferInsert;

export const instanceRelations = relations(instances, ({ many }) => ({
  accounts: many(accounts),
}));

export const follows = pgTable(
  "follows",
  {
    iri: text("iri").notNull().unique(),
    followingId: uuid("following_id")
      .$type<Uuid>()
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    followerId: uuid("follower_id")
      .$type<Uuid>()
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    shares: boolean("shares").notNull().default(true),
    notify: boolean("notify").notNull().default(false),
    languages: text("languages").array(),
    created: timestamp("created", { withTimezone: true })
      .notNull()
      .default(currentTimestamp),
    approved: timestamp("approved", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.followingId, table.followerId] }),
    check("ck_follows_self", sql`${table.followingId} != ${table.followerId}`),
  ],
);

export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;

export const followRelations = relations(follows, ({ one }) => ({
  following: one(accounts, {
    fields: [follows.followingId],
    references: [accounts.id],
    relationName: "follower",
  }),
  follower: one(accounts, {
    fields: [follows.followerId],
    references: [accounts.id],
    relationName: "following",
  }),
}));

export const scopeEnum = pgEnum("scope", [
  "read",
  "read:accounts",
  "read:favourites",
  "read:filters",
  "read:follows",
  "read:lists",
  "read:notifications",
  "read:search",
  "read:statuses",
  "write",
  "write:accounts",
  "write:conversations",
  "write:favourites",
  "write:filters",
  "write:follows",
  "write:lists",
  "write:media",
  "write:notifications",
  "write:statuses",
  "follow",
  "push",
]);

export type Scope = (typeof scopeEnum.enumValues)[number];

export const applications = pgTable("applications", {
  id: uuid("id").$type<Uuid>().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  redirectUris: text("redirect_uris").array().notNull(),
  scopes: scopeEnum("scopes").array().notNull(),
  website: text("website"),
  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret").notNull(),
  created: timestamp("created", { withTimezone: true })
    .notNull()
    .default(currentTimestamp),
});

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;

export const applicationRelations = relations(applications, ({ many }) => ({
  accessTokens: many(accessTokens),
}));

export const grantTypeEnum = pgEnum("grant_type", [
  "authorization_code",
  "client_credentials",
]);

export type GrantType = (typeof grantTypeEnum.enumValues)[number];

export const accessTokens = pgTable("access_tokens", {
  code: text("code").primaryKey(),
  applicationId: uuid("application_id")
    .$type<Uuid>()
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  accountOwnerId: uuid("account_owner_id")
    .$type<Uuid>()
    .references(() => accountOwners.id, { onDelete: "cascade" }),
  grant_type: grantTypeEnum("grant_type")
    .notNull()
    .default("authorization_code"),
  scopes: scopeEnum("scopes").array().notNull(),
  created: timestamp("created", { withTimezone: true })
    .notNull()
    .default(currentTimestamp),
});

export type AccessToken = typeof accessTokens.$inferSelect;
export type NewAccessToken = typeof accessTokens.$inferInsert;

export const accessTokenRelations = relations(accessTokens, ({ one }) => ({
  application: one(applications, {
    fields: [accessTokens.applicationId],
    references: [applications.id],
  }),
  accountOwner: one(accountOwners, {
    fields: [accessTokens.accountOwnerId],
    references: [accountOwners.id],
  }),
}));

export const postTypeEnum = pgEnum("post_type", [
  "Article",
  "Note",
]);

export type PostType = (typeof postTypeEnum.enumValues)[number];

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").$type<Uuid>().primaryKey(),
    iri: text("iri").notNull().unique(),
    type: postTypeEnum("type").notNull(),
    accountId: uuid("actor_id")
      .$type<Uuid>()
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .$type<Uuid>()
      .references(() => applications.id, { onDelete: "set null" }),
    replyTargetId: uuid("reply_target_id")
      .$type<Uuid>()
      .references((): AnyPgColumn => posts.id, { onDelete: "set null" }),
    sharingId: uuid("sharing_id")
      .$type<Uuid>()
      .references((): AnyPgColumn => posts.id, { onDelete: "cascade" }),
    quoteTargetId: uuid("quote_target_id")
      .$type<Uuid>()
      .references((): AnyPgColumn => posts.id, { onDelete: "set null" }),
    visibility: postVisibilityEnum("visibility").notNull(),
    summary: text("summary"),
    contentHtml: text("content_html"),
    content: text("content"),
    language: text("language"),
    tags: jsonb("tags").notNull().default({}).$type<Record<string, string>>(),
    sensitive: boolean("sensitive").notNull().default(false),
    url: text("url"),
    previewCard: jsonb("preview_card").$type<PreviewCard>(),
    repliesCount: bigint("replies_count", { mode: "number" }).default(0),
    sharesCount: bigint("shares_count", { mode: "number" }).default(0),
    likesCount: bigint("likes_count", { mode: "number" }).default(0),
    idempotenceKey: text("idempotence_key"),
    published: timestamp("published", { withTimezone: true }),
    updated: timestamp("updated", { withTimezone: true })
      .notNull()
      .default(currentTimestamp),
  },
  (table) => [
    unique("posts_id_actor_id_unique").on(table.id, table.accountId),
    unique().on(table.accountId, table.sharingId),
    index().on(table.sharingId),
    index().on(table.accountId),
    index().on(table.accountId, table.sharingId),
    index().on(table.replyTargetId),
    index().on(table.visibility, table.accountId),
    index()
      .on(table.visibility, table.accountId, table.sharingId)
      .where(isNotNull(table.sharingId)),
    index()
      .on(table.visibility, table.accountId, table.replyTargetId)
      .where(isNotNull(table.replyTargetId)),
  ],
);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export const postRelations = relations(posts, ({ one, many }) => ({
  account: one(accounts, {
    fields: [posts.accountId],
    references: [accounts.id],
  }),
  application: one(applications, {
    fields: [posts.applicationId],
    references: [applications.id],
  }),
  replyTarget: one(posts, {
    fields: [posts.replyTargetId],
    references: [posts.id],
    relationName: "reply",
  }),
  replies: many(posts, { relationName: "reply" }),
  likes: many(likes),
  sharing: one(posts, {
    fields: [posts.sharingId],
    references: [posts.id],
    relationName: "share",
  }),
  shares: many(posts, { relationName: "share" }),
  quoteTarget: one(posts, {
    fields: [posts.quoteTargetId],
    references: [posts.id],
    relationName: "quote",
  }),
  quotes: many(posts, { relationName: "quote" }),
  media: many(media),
  mentions: many(mentions),
}));

export const media = pgTable(
  "media",
  {
    id: uuid("id").$type<Uuid>().primaryKey(),
    postId: uuid("post_id")
      .$type<Uuid>()
      .references(() => posts.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    url: text("url").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    description: text("description"),
    thumbnailType: text("thumbnail_type").notNull(),
    thumbnailUrl: text("thumbnail_url").notNull(),
    thumbnailWidth: integer("thumbnail_width").notNull(),
    thumbnailHeight: integer("thumbnail_height").notNull(),
    created: timestamp("created", { withTimezone: true })
      .notNull()
      .default(currentTimestamp),
  },
  (table) => [index().on(table.postId)],
);

export type Medium = typeof media.$inferSelect;
export type NewMedium = typeof media.$inferInsert;

export const mediumRelations = relations(media, ({ one }) => ({
  post: one(posts, {
    fields: [media.postId],
    references: [posts.id],
  }),
}));


export const mentions = pgTable(
  "mentions",
  {
    postId: uuid("post_id")
      .$type<Uuid>()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .$type<Uuid>()
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.accountId] }),
    index().on(table.postId, table.accountId),
  ],
);

export type Mention = typeof mentions.$inferSelect;
export type NewMention = typeof mentions.$inferInsert;

export const mentionRelations = relations(mentions, ({ one }) => ({
  post: one(posts, {
    fields: [mentions.postId],
    references: [posts.id],
  }),
  account: one(accounts, {
    fields: [mentions.accountId],
    references: [accounts.id],
  }),
}));


export const likes = pgTable(
  "likes",
  {
    postId: uuid("post_id")
      .$type<Uuid>()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .$type<Uuid>()
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    created: timestamp("created", { withTimezone: true })
      .notNull()
      .default(currentTimestamp),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.accountId] }),
    index().on(table.accountId, table.postId),
  ],
);

export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;

export const likeRelations = relations(likes, ({ one }) => ({
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
  account: one(accounts, {
    fields: [likes.accountId],
    references: [accounts.id],
  }),
}));


export const listRepliesPolicyEnum = pgEnum("list_replies_policy", [
  "followed",
  "list",
  "none",
]);

export type ListRepliesPolicy =
  (typeof listRepliesPolicyEnum.enumValues)[number];

export const lists = pgTable("lists", {
  id: uuid("id").$type<Uuid>().primaryKey(),
  accountOwnerId: uuid("account_owner_id")
    .$type<Uuid>()
    .notNull()
    .references(() => accountOwners.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  repliesPolicy: listRepliesPolicyEnum("replies_policy")
    .notNull()
    .default("list"),
  exclusive: boolean("exclusive").notNull().default(false),
  created: timestamp("created", { withTimezone: true })
    .notNull()
    .default(currentTimestamp),
});

export type List = typeof lists.$inferSelect;
export type NewList = typeof lists.$inferInsert;

export const listRelations = relations(lists, ({ one, many }) => ({
  accountOwner: one(accountOwners, {
    fields: [lists.accountOwnerId],
    references: [accountOwners.id],
  }),
  members: many(listMembers),
}));

export const listMembers = pgTable(
  "list_members",
  {
    listId: uuid("list_id")
      .$type<Uuid>()
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .$type<Uuid>()
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    created: timestamp("created", { withTimezone: true })
      .notNull()
      .default(currentTimestamp),
  },
  (table) => [primaryKey({ columns: [table.listId, table.accountId] })],
);

export type ListMember = typeof listMembers.$inferSelect;
export type NewListMember = typeof listMembers.$inferInsert;

export const listMemberRelations = relations(listMembers, ({ one }) => ({
  list: one(lists, {
    fields: [listMembers.listId],
    references: [lists.id],
  }),
  account: one(accounts, {
    fields: [listMembers.accountId],
    references: [accounts.id],
  }),
}));


export const timelinePosts = pgTable(
  "timeline_posts",
  {
    accountId: uuid("account_id")
      .$type<Uuid>()
      .notNull()
      .references(() => accountOwners.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .$type<Uuid>()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.accountId, table.postId] }),
    index().on(table.accountId, table.postId),
  ],
);

export type TimelinePost = typeof timelinePosts.$inferSelect;
export type NewTimelinePost = typeof timelinePosts.$inferInsert;

export const timelinePostRelations = relations(timelinePosts, ({ one }) => ({
  account: one(accountOwners, {
    fields: [timelinePosts.accountId],
    references: [accountOwners.id],
  }),
  post: one(posts, {
    fields: [timelinePosts.postId],
    references: [posts.id],
  }),
}));

export const listPosts = pgTable(
  "list_posts",
  {
    listId: uuid("list_id")
      .$type<Uuid>()
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .$type<Uuid>()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.listId, table.postId] }),
    index().on(table.listId, table.postId),
  ],
);

export type ListPost = typeof listPosts.$inferSelect;
export type NewListPost = typeof listPosts.$inferInsert;

export const listPostRelations = relations(listPosts, ({ one }) => ({
  list: one(lists, {
    fields: [listPosts.listId],
    references: [lists.id],
  }),
  post: one(posts, {
    fields: [listPosts.postId],
    references: [posts.id],
  }),
}));
