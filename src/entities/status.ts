import { eq } from "drizzle-orm";
import type { PreviewCard } from "../previewcard";
import {
  type Account,
  type AccountOwner,
  type Application,
  type Like,
  type Medium,
  type Mention,
  type Post,
  likes,
  posts,
} from "../schema";
import type { Uuid } from "../uuid";
import { serializeAccount } from "./account";
import { serializeMedium } from "./medium";

export function getPostRelations(ownerId: Uuid) {
  return {
    account: { with: { owner: true, successor: true } },
    application: true,
    replyTarget: true,
    sharing: {
      with: {
        account: { with: { successor: true } },
        application: true,
        replyTarget: true,
        quoteTarget: {
          with: {
            account: { with: { successor: true } },
            application: true,
            replyTarget: true,
            media: true,
            mentions: {
              with: { account: { with: { owner: true, successor: true } } },
            },
            likes: { where: eq(likes.accountId, ownerId) },
            shares: { where: eq(posts.accountId, ownerId) },
          },
        },
        media: true,
        mentions: {
          with: { account: { with: { owner: true, successor: true } } },
        },
        likes: { where: eq(likes.accountId, ownerId) },
        shares: { where: eq(posts.accountId, ownerId) },
      },
    },
    quoteTarget: {
      with: {
        account: { with: { successor: true } },
        application: true,
        replyTarget: true,
        media: true,
        mentions: {
          with: { account: { with: { owner: true, successor: true } } },
        },
        likes: { where: eq(likes.accountId, ownerId) },
        shares: { where: eq(posts.accountId, ownerId) },
      },
    },
    media: true,
    mentions: { with: { account: { with: { owner: true, successor: true } } } },
    likes: { where: eq(likes.accountId, ownerId) },
    shares: { where: eq(posts.accountId, ownerId) },
    replies: true,
  } as const;
}

export function serializePost(
  post: Post & {
    account: Account & { successor: Account | null };
    application: Application | null;
    replyTarget: Post | null;
    sharing:
    | (Post & {
      account: Account & { successor: Account | null };
      application: Application | null;
      replyTarget: Post | null;
      quoteTarget:
      | (Post & {
        account: Account & { successor: Account | null };
        application: Application | null;
        replyTarget: Post | null;
        media: Medium[];
        mentions: (Mention & {
          account: Account & {
            owner: AccountOwner | null;
            successor: Account | null;
          };
        })[];
        likes: Like[];
        shares: Post[];
      })
      | null;
      media: Medium[];
      mentions: (Mention & {
        account: Account & {
          owner: AccountOwner | null;
          successor: Account | null;
        };
      })[];
      likes: Like[];
      shares: Post[];
    })
    | null;
    quoteTarget:
    | (Post & {
      account: Account & { successor: Account | null };
      application: Application | null;
      replyTarget: Post | null;
      media: Medium[];
      mentions: (Mention & {
        account: Account & {
          owner: AccountOwner | null;
          successor: Account | null;
        };
      })[];
      likes: Like[];
      shares: Post[];
    })
    | null;
    media: Medium[];
    mentions: (Mention & {
      account: Account & {
        owner: AccountOwner | null;
        successor: Account | null;
      };
    })[];
    likes: Like[];
    shares: Post[];
  },
  currentAccountOwner: { id: string },
  baseUrl: URL | string,
  // biome-ignore lint/suspicious/noExplicitAny: JSON
): Record<string, any> {
  return {
    id: post.id,
    created_at: post.published ?? post.updated,
    in_reply_to_id: post.replyTargetId,
    in_reply_to_account_id: post.replyTarget?.accountId,
    sensitive: post.sensitive,
    spoiler_text: post.summary ?? "",
    visibility: post.visibility,
    language: post.language,
    uri: post.iri,
    url: post.url ?? post.iri,
    replies_count: post.repliesCount ?? 0,
    reblogs_count: post.sharesCount ?? 0,
    favourites_count: post.likesCount ?? 0,
    favourited: post.likes.some(
      (like) => like.accountId === currentAccountOwner.id,
    ),
    reblogged: post.shares.some(
      (share) => share.accountId === currentAccountOwner.id,
    ),
    content: post.content ?? "",
    reblog:
      post.sharing == null
        ? null
        : serializePost(
          { ...post.sharing, sharing: null },
          currentAccountOwner,
          baseUrl,
        ),
    quote_id: post.quoteTargetId,
    quote:
      post.quoteTarget == null
        ? null
        : serializePost(
          { ...post.quoteTarget, quoteTarget: null, sharing: null },
          currentAccountOwner,
          baseUrl,
        ),
    application:
      post.application == null
        ? null
        : {
          name: post.application.name,
          website: post.application.website,
        },
    account: serializeAccount(post.account, baseUrl),
    media_attachments: post.media.map(serializeMedium),
    mentions: post.mentions.map((mention) => ({
      id: mention.accountId,
      username: mention.account.handle.replaceAll(/(?:^@)|(?:@[^@]+$)/g, ""),
      url: mention.account.url,
      acct:
        mention.account.owner == null
          ? mention.account.handle.replace(/^@/, "")
          : mention.account.handle.replaceAll(/(?:^@)|(?:@[^@]+$)/g, ""),
    })),
    tags: Object.entries(post.tags).map(([name, url]) => ({
      name: name.toLowerCase().replace(/^#/, ""),
      url,
    })),
    card:
      post.previewCard == null ? null : serializePreviewCard(post.previewCard),
    filtered: null,
  };
}

export function serializePreviewCard(
  card: PreviewCard,
): Record<string, unknown> {
  return {
    url: card.url,
    title: card.title,
    description: card.description ?? "",
    type: "link",
    author_name: "",
    author_url: "",
    provider_name: "",
    provider_url: "",
    html: "",
    width:
      card.image?.width == null
        ? 0
        : typeof card.image.width === "string"
          ? Number.parseInt(card.image.width)
          : card.image.width,
    height:
      card.image?.height == null
        ? 0
        : typeof card.image.height === "string"
          ? Number.parseInt(card.image.height)
          : card.image.height,
    image: card.image == null ? null : card.image.url,
    embed_url: "",
    blurhash: null,
  };
}
