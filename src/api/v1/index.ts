import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, lt } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db";
import { getPostRelations, serializePost } from "../../entities/status";
import { type Variables, scopeRequired, tokenRequired } from "../../oauth";
import {
  likes,
} from "../../schema";
import accounts from "./accounts";
import apps from "./apps";
import follow_requests from "./follow_requests";
import instance from "./instance";
import lists from "./lists";
import media from "./media";
import notifications from "./notifications";
import statuses from "./statuses";
import timelines from "./timelines";

const app = new Hono<{ Variables: Variables }>();

app.route("/apps", apps);
app.route("/accounts", accounts);
app.route("/follow_requests", follow_requests);
app.route("/instance", instance);
app.route("/lists", lists);
app.route("/media", media);
app.route("/notifications", notifications);
app.route("/statuses", statuses);
app.route("/timelines", timelines);

app.get(
  "/preferences",
  tokenRequired,
  scopeRequired(["read:accounts"]),
  (c) => {
    return c.json({
      // TODO
      "posting:default:visibility": "public",
      "posting:default:sensitive": false,
      "posting:default:language": null,
      "reading:expand:media": "default",
      "reading:expand:spoilers": false,
    });
  },
);

app.get("/announcements", (c) => {
  return c.json([]);
});

app.get(
  "/favourites",
  tokenRequired,
  scopeRequired(["read:favourites"]),
  zValidator(
    "query",
    z.object({
      before: z.string().datetime().optional(),
      limit: z
        .string()
        .default("20")
        .transform((v) => Number.parseInt(v)),
    }),
  ),
  async (c) => {
    const owner = c.get("token").accountOwner;
    if (owner == null) {
      return c.json(
        { error: "This method requires an authenticated user" },
        422,
      );
    }
    const query = c.req.valid("query");
    const favourites = await db.query.likes.findMany({
      where: and(
        eq(likes.accountId, owner.id),
        query.before == null
          ? undefined
          : lt(likes.created, new Date(query.before)),
      ),
      with: {
        post: { with: getPostRelations(owner.id) },
      },
      orderBy: [desc(likes.created)],
      limit: query.limit,
    });
    return c.json(
      favourites.map((like) => serializePost(like.post, owner, c.req.url)),
      200,
      favourites.length < query.limit
        ? {}
        : {
          Link: `<${new URL(
            `?before=${encodeURIComponent(
              favourites[favourites.length - 1].created.toISOString(),
            )}&limit=${query.limit}`,
            c.req.url,
          ).href
            }>; rel="next"`,
        },
    );
  },
);



export default app;
