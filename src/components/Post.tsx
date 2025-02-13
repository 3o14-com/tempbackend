import type {
  Account,
  Medium as DbMedium,
  Post as DbPost,
} from "../schema";

export interface PostProps {
  readonly post: DbPost & {
    account: Account;
    media: DbMedium[];
    sharing:
    | (DbPost & {
      account: Account;
      media: DbMedium[];
      replyTarget: (DbPost & { account: Account }) | null;
      quoteTarget:
      | (DbPost & {
        account: Account;
        media: DbMedium[];
        replyTarget: (DbPost & { account: Account }) | null;
      })
      | null;
    })
    | null;
    replyTarget: (DbPost & { account: Account }) | null;
    quoteTarget:
    | (DbPost & {
      account: Account;
      media: DbMedium[];
      replyTarget: (DbPost & { account: Account }) | null;
    })
    | null;
  };
  readonly quoted?: boolean;
}

export function Post({ post, quoted }: PostProps) {
  if (post.sharing != null)
    return <Post post={{ ...post.sharing, sharing: null }} />;
  const account = post.account;
  const authorNameHtml = account.name;
  const authorUrl = account.url ?? account.iri;
  const authorName = (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: xss protected
    <a dangerouslySetInnerHTML={{ __html: authorNameHtml }} href={authorUrl} />
  );
  return (
    <article
      style={
        quoted
          ? "border: calc(var(--pico-border-width)*4) solid var(--pico-background-color);"
          : ""
      }
    >
      <header>
        <hgroup>
          {account.avatarUrl && (
            <img
              src={account.avatarUrl}
              alt={`${account.name}'s avatar`}
              width={quoted ? 40 : 48}
              height={quoted ? 40 : 48}
              style="float: left; margin-right: .5em;"
            />
          )}
          {quoted ? (
            <h6 style="font-size: smaller;">{authorName}</h6>
          ) : (
            <h5>{authorName}</h5>
          )}
          <p>
            <small style="user-select: all;">{account.handle}</small>
            {post.replyTarget != null && (
              <>
                {" "}
                &middot;{" "}
                <small>
                  Reply to{" "}
                  <a href={post.replyTarget.url ?? post.replyTarget.iri}>
                    {post.replyTarget.account.name}'s post
                  </a>
                </small>{" "}
              </>
            )}
          </p>
        </hgroup>
      </header>
      {post.summary == null || post.summary.trim() === "" ? (
        <PostContent post={post} />
      ) : (
        <details>
          <summary lang={post.language ?? undefined}>{post.summary}</summary>
          <PostContent post={post} />
        </details>
      )}
      <footer>
        <p>
          <a href={post.url ?? post.iri}>
            <small>
              <time dateTime={(post.published ?? post.updated).toISOString()}>
                {(post.published ?? post.updated).toLocaleString()}
              </time>
            </small>
          </a>
          {post.likesCount != null && post.likesCount > 0 && (
            <small>
              {" "}
              &middot;{" "}
              {`${post.likesCount} ${post.likesCount === null || post.likesCount < 2
                ? "like"
                : "likes"
                }`}
            </small>
          )}
          {post.sharesCount != null && post.sharesCount > 0 && (
            <small>
              {" "}
              &middot;{" "}
              {`${post.sharesCount} ${post.sharesCount === null || post.sharesCount < 2
                ? "share"
                : "shares"
                }`}
            </small>
          )}
        </p>
      </footer>
    </article>
  );
}

interface PostContentProps {
  readonly post: DbPost & {
    media: DbMedium[];
    quoteTarget:
    | (DbPost & {
      account: Account;
      media: DbMedium[];
      replyTarget: (DbPost & { account: Account }) | null;
    })
    | null;
  };
}

function PostContent({ post }: PostContentProps) {
  const contentHtml = post.contentHtml;
  return (
    <>
      {post.contentHtml && (
        <div
          // biome-ignore lint/security/noDangerouslySetInnerHtml: xss
          dangerouslySetInnerHTML={{ __html: contentHtml ?? "" }}
          lang={post.language ?? undefined}
        />
      )}
      {post.media.length > 0 && (
        <div>
          {post.media.map((medium) => (
            <Medium medium={medium} />
          ))}
        </div>
      )}
      {post.quoteTarget != null && (
        <Post
          post={{ ...post.quoteTarget, sharing: null, quoteTarget: null }}
          quoted={true}
        />
      )}
    </>
  );
}


interface MediumProps {
  readonly medium: DbMedium;
}

function Medium({ medium }: MediumProps) {
  return (
    <a href={medium.url}>
      <img
        key={medium.id}
        src={medium.thumbnailUrl}
        alt={medium.description ?? ""}
        width={medium.thumbnailWidth}
        height={medium.thumbnailHeight}
      />
    </a>
  );
}
