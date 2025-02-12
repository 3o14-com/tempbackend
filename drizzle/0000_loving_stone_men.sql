CREATE TYPE "public"."account_type" AS ENUM('Application', 'Group', 'Organization', 'Person', 'Service');--> statement-breakpoint
CREATE TYPE "public"."grant_type" AS ENUM('authorization_code', 'client_credentials');--> statement-breakpoint
CREATE TYPE "public"."list_replies_policy" AS ENUM('followed', 'list', 'none');--> statement-breakpoint
CREATE TYPE "public"."marker_type" AS ENUM('notifications', 'home');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('Article', 'Note', 'Question');--> statement-breakpoint
CREATE TYPE "public"."post_visibility" AS ENUM('public', 'unlisted', 'private', 'direct');--> statement-breakpoint
CREATE TYPE "public"."scope" AS ENUM('read', 'read:accounts', 'read:blocks', 'read:bookmarks', 'read:favourites', 'read:filters', 'read:follows', 'read:lists', 'read:mutes', 'read:notifications', 'read:search', 'read:statuses', 'write', 'write:accounts', 'write:blocks', 'write:bookmarks', 'write:conversations', 'write:favourites', 'write:filters', 'write:follows', 'write:lists', 'write:media', 'write:mutes', 'write:notifications', 'write:reports', 'write:statuses', 'follow', 'push');--> statement-breakpoint
CREATE TABLE "access_tokens" (
	"code" text PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"account_owner_id" uuid,
	"grant_type" "grant_type" DEFAULT 'authorization_code' NOT NULL,
	"scopes" "scope"[] NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_owners" (
	"id" uuid PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"rsa_private_key_jwk" jsonb NOT NULL,
	"rsa_public_key_jwk" jsonb NOT NULL,
	"ed25519_private_key_jwk" jsonb NOT NULL,
	"ed25519_public_key_jwk" jsonb NOT NULL,
	"fields" json DEFAULT '{}'::json NOT NULL,
	"bio" text,
	"followed_tags" text[] DEFAULT '{}' NOT NULL,
	"visibility" "post_visibility" DEFAULT 'public' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"discoverable" boolean DEFAULT false NOT NULL,
	CONSTRAINT "account_owners_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"iri" text NOT NULL,
	"type" "account_type" NOT NULL,
	"name" varchar(100) NOT NULL,
	"handle" text NOT NULL,
	"bio_html" text,
	"url" text,
	"protected" boolean DEFAULT false NOT NULL,
	"avatar_url" text,
	"cover_url" text,
	"inbox_url" text NOT NULL,
	"followers_url" text,
	"shared_inbox_url" text,
	"featured_url" text,
	"following_count" bigint DEFAULT 0,
	"followers_count" bigint DEFAULT 0,
	"posts_count" bigint DEFAULT 0,
	"field_htmls" json DEFAULT '{}'::json NOT NULL,
	"emojis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sensitive" boolean DEFAULT false NOT NULL,
	"successor_id" uuid,
	"aliases" text[] DEFAULT (ARRAY[]::text[]) NOT NULL,
	"instance_host" text NOT NULL,
	"published" timestamp with time zone,
	"updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "accounts_iri_unique" UNIQUE("iri"),
	CONSTRAINT "accounts_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"redirect_uris" text[] NOT NULL,
	"scopes" "scope"[] NOT NULL,
	"website" text,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "applications_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"account_id" uuid NOT NULL,
	"blocked_account_id" uuid NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "blocks_account_id_blocked_account_id_pk" PRIMARY KEY("account_id","blocked_account_id")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"post_id" uuid NOT NULL,
	"account_owner_id" uuid NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "bookmarks_post_id_account_owner_id_pk" PRIMARY KEY("post_id","account_owner_id")
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"email" varchar(254) PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_emojis" (
	"shortcode" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"category" text,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "featured_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created" timestamp with time zone,
	CONSTRAINT "featured_tags_account_owner_id_name_unique" UNIQUE("account_owner_id","name")
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"iri" text NOT NULL,
	"following_id" uuid NOT NULL,
	"follower_id" uuid NOT NULL,
	"shares" boolean DEFAULT true NOT NULL,
	"notify" boolean DEFAULT false NOT NULL,
	"languages" text[],
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"approved" timestamp with time zone,
	CONSTRAINT "follows_following_id_follower_id_pk" PRIMARY KEY("following_id","follower_id"),
	CONSTRAINT "follows_iri_unique" UNIQUE("iri"),
	CONSTRAINT "ck_follows_self" CHECK ("follows"."following_id" != "follows"."follower_id")
);
--> statement-breakpoint
CREATE TABLE "instances" (
	"host" text PRIMARY KEY NOT NULL,
	"software" text,
	"software_version" text,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"post_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "likes_post_id_account_id_pk" PRIMARY KEY("post_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "list_members" (
	"list_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "list_members_list_id_account_id_pk" PRIMARY KEY("list_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "list_posts" (
	"list_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	CONSTRAINT "list_posts_list_id_post_id_pk" PRIMARY KEY("list_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"replies_policy" "list_replies_policy" DEFAULT 'list' NOT NULL,
	"exclusive" boolean DEFAULT false NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "markers" (
	"account_owner_id" uuid NOT NULL,
	"type" "marker_type" NOT NULL,
	"last_read_id" text NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "markers_account_owner_id_type_pk" PRIMARY KEY("account_owner_id","type")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"description" text,
	"thumbnail_type" text NOT NULL,
	"thumbnail_url" text NOT NULL,
	"thumbnail_width" integer NOT NULL,
	"thumbnail_height" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentions" (
	"post_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	CONSTRAINT "mentions_post_id_account_id_pk" PRIMARY KEY("post_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "mutes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"muted_account_id" uuid NOT NULL,
	"notifications" boolean DEFAULT true NOT NULL,
	"duration" interval,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "mutes_account_id_muted_account_id_unique" UNIQUE("account_id","muted_account_id")
);
--> statement-breakpoint
CREATE TABLE "pinned_posts" (
	"index" bigserial PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "pinned_posts_post_id_account_id_unique" UNIQUE("post_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "poll_options" (
	"poll_id" uuid,
	"index" integer NOT NULL,
	"title" text NOT NULL,
	"votes_count" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "poll_options_poll_id_index_pk" PRIMARY KEY("poll_id","index"),
	CONSTRAINT "poll_options_poll_id_title_unique" UNIQUE("poll_id","title")
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"poll_id" uuid NOT NULL,
	"option_index" integer NOT NULL,
	"account_id" uuid NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "poll_votes_poll_id_option_index_account_id_pk" PRIMARY KEY("poll_id","option_index","account_id")
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY NOT NULL,
	"multiple" boolean DEFAULT false NOT NULL,
	"voters_count" bigint DEFAULT 0 NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"iri" text NOT NULL,
	"type" "post_type" NOT NULL,
	"actor_id" uuid NOT NULL,
	"application_id" uuid,
	"reply_target_id" uuid,
	"sharing_id" uuid,
	"quote_target_id" uuid,
	"visibility" "post_visibility" NOT NULL,
	"summary" text,
	"content_html" text,
	"content" text,
	"poll_id" uuid,
	"language" text,
	"tags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"emojis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sensitive" boolean DEFAULT false NOT NULL,
	"url" text,
	"preview_card" jsonb,
	"replies_count" bigint DEFAULT 0,
	"shares_count" bigint DEFAULT 0,
	"likes_count" bigint DEFAULT 0,
	"idempotence_key" text,
	"published" timestamp with time zone,
	"updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "posts_iri_unique" UNIQUE("iri"),
	CONSTRAINT "posts_id_actor_id_unique" UNIQUE("id","actor_id"),
	CONSTRAINT "posts_poll_id_unique" UNIQUE("poll_id"),
	CONSTRAINT "posts_actor_id_sharing_id_unique" UNIQUE("actor_id","sharing_id")
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"post_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"custom_emoji" text,
	"emoji_iri" text,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "reactions_post_id_account_id_emoji_pk" PRIMARY KEY("post_id","account_id","emoji")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"iri" text NOT NULL,
	"account_id" uuid NOT NULL,
	"target_account_id" uuid NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"comment" text NOT NULL,
	"posts" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	CONSTRAINT "reports_iri_unique" UNIQUE("iri")
);
--> statement-breakpoint
CREATE TABLE "timeline_posts" (
	"account_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	CONSTRAINT "timeline_posts_account_id_post_id_pk" PRIMARY KEY("account_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "totps" (
	"issuer" text NOT NULL,
	"label" text NOT NULL,
	"algorithm" text NOT NULL,
	"digits" smallint NOT NULL,
	"period" smallint NOT NULL,
	"secret" text NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_account_owner_id_account_owners_id_fk" FOREIGN KEY ("account_owner_id") REFERENCES "public"."account_owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_owners" ADD CONSTRAINT "account_owners_id_accounts_id_fk" FOREIGN KEY ("id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_successor_id_accounts_id_fk" FOREIGN KEY ("successor_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_instance_host_instances_host_fk" FOREIGN KEY ("instance_host") REFERENCES "public"."instances"("host") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_account_id_accounts_id_fk" FOREIGN KEY ("blocked_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_account_owner_id_account_owners_id_fk" FOREIGN KEY ("account_owner_id") REFERENCES "public"."account_owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_tags" ADD CONSTRAINT "featured_tags_account_owner_id_account_owners_id_fk" FOREIGN KEY ("account_owner_id") REFERENCES "public"."account_owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_accounts_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_accounts_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_members" ADD CONSTRAINT "list_members_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_members" ADD CONSTRAINT "list_members_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_posts" ADD CONSTRAINT "list_posts_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_posts" ADD CONSTRAINT "list_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_account_owner_id_account_owners_id_fk" FOREIGN KEY ("account_owner_id") REFERENCES "public"."account_owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markers" ADD CONSTRAINT "markers_account_owner_id_account_owners_id_fk" FOREIGN KEY ("account_owner_id") REFERENCES "public"."account_owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutes" ADD CONSTRAINT "mutes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutes" ADD CONSTRAINT "mutes_muted_account_id_accounts_id_fk" FOREIGN KEY ("muted_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_posts" ADD CONSTRAINT "pinned_posts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_posts" ADD CONSTRAINT "pinned_posts_post_id_account_id_posts_id_actor_id_fk" FOREIGN KEY ("post_id","account_id") REFERENCES "public"."posts"("id","actor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_option_index_poll_options_poll_id_index_fk" FOREIGN KEY ("poll_id","option_index") REFERENCES "public"."poll_options"("poll_id","index") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_actor_id_accounts_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_reply_target_id_posts_id_fk" FOREIGN KEY ("reply_target_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_sharing_id_posts_id_fk" FOREIGN KEY ("sharing_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_quote_target_id_posts_id_fk" FOREIGN KEY ("quote_target_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_account_id_accounts_id_fk" FOREIGN KEY ("target_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_posts" ADD CONSTRAINT "timeline_posts_account_id_account_owners_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account_owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_posts" ADD CONSTRAINT "timeline_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blocks_account_id_index" ON "blocks" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "blocks_blocked_account_id_index" ON "blocks" USING btree ("blocked_account_id");--> statement-breakpoint
CREATE INDEX "bookmarks_post_id_account_owner_id_index" ON "bookmarks" USING btree ("post_id","account_owner_id");--> statement-breakpoint
CREATE INDEX "likes_account_id_post_id_index" ON "likes" USING btree ("account_id","post_id");--> statement-breakpoint
CREATE INDEX "list_posts_list_id_post_id_index" ON "list_posts" USING btree ("list_id","post_id");--> statement-breakpoint
CREATE INDEX "media_post_id_index" ON "media" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "mentions_post_id_account_id_index" ON "mentions" USING btree ("post_id","account_id");--> statement-breakpoint
CREATE INDEX "pinned_posts_account_id_post_id_index" ON "pinned_posts" USING btree ("account_id","post_id");--> statement-breakpoint
CREATE INDEX "poll_options_poll_id_index_index" ON "poll_options" USING btree ("poll_id","index");--> statement-breakpoint
CREATE INDEX "poll_votes_poll_id_account_id_index" ON "poll_votes" USING btree ("poll_id","account_id");--> statement-breakpoint
CREATE INDEX "posts_sharing_id_index" ON "posts" USING btree ("sharing_id");--> statement-breakpoint
CREATE INDEX "posts_actor_id_index" ON "posts" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "posts_actor_id_sharing_id_index" ON "posts" USING btree ("actor_id","sharing_id");--> statement-breakpoint
CREATE INDEX "posts_reply_target_id_index" ON "posts" USING btree ("reply_target_id");--> statement-breakpoint
CREATE INDEX "posts_visibility_actor_id_index" ON "posts" USING btree ("visibility","actor_id");--> statement-breakpoint
CREATE INDEX "posts_visibility_actor_id_sharing_id_index" ON "posts" USING btree ("visibility","actor_id","sharing_id") WHERE "posts"."sharing_id" is not null;--> statement-breakpoint
CREATE INDEX "posts_visibility_actor_id_reply_target_id_index" ON "posts" USING btree ("visibility","actor_id","reply_target_id") WHERE "posts"."reply_target_id" is not null;--> statement-breakpoint
CREATE INDEX "reactions_post_id_index" ON "reactions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "reactions_post_id_account_id_index" ON "reactions" USING btree ("post_id","account_id");--> statement-breakpoint
CREATE INDEX "timeline_posts_account_id_post_id_index" ON "timeline_posts" USING btree ("account_id","post_id");