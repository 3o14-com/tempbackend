ALTER TABLE "poll_options" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "poll_votes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "polls" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "poll_options" CASCADE;--> statement-breakpoint
DROP TABLE "poll_votes" CASCADE;--> statement-breakpoint
DROP TABLE "polls" CASCADE;--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_poll_id_unique";--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_poll_id_polls_id_fk";
--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "poll_id";--> statement-breakpoint
ALTER TABLE "public"."posts" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."post_type";--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('Article', 'Note');--> statement-breakpoint
ALTER TABLE "public"."posts" ALTER COLUMN "type" SET DATA TYPE "public"."post_type" USING "type"::"public"."post_type";