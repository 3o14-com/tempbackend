import {
  Accept,
  Activity,
  Announce,
  Create,
  Delete,
  Follow,
  Like,
  Move,
  Reject,
  Undo,
  Update,
  isActor,
} from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import { db } from "../db";
import "./actor";
import { federation } from "./federation";
export { federation } from "./federation";
import {
  onAccountDeleted,
  onAccountMoved,
  onAccountUpdated,
  onFollowAccepted,
  onFollowRejected,
  onFollowed,
  onLiked,
  onPostCreated,
  onPostDeleted,
  onPostShared,
  onPostUnshared,
  onPostUpdated,
  onUnfollowed,
  onUnliked,
} from "./inbox";
import "./nodeinfo";
import "./objects";
import { isPost } from "./post";

const inboxLogger = getLogger(["3o14", "federation", "inbox"]);

federation
  .setInboxListeners("/@{identifier}/inbox", "/inbox")
  .setSharedKeyDispatcher(async (_) => {
    const anyOwner = await db.query.accountOwners.findFirst();
    return anyOwner ?? null;
  })
  .on(Follow, onFollowed)
  .on(Accept, onFollowAccepted)
  .on(Reject, onFollowRejected)
  .on(Create, async (ctx, create) => {
    const object = await create.getObject();
    if (isPost(object)) {
      await onPostCreated(ctx, create);
    } else {
      inboxLogger.debug("Unsupported object on Create: {object}", { object });
    }
  })
  .on(Like, onLiked)
  .on(Announce, async (ctx, announce) => {
    const object = await announce.getObject();
    if (isPost(object)) {
      await onPostShared(ctx, announce);
    } else {
      inboxLogger.debug("Unsupported object on Announce: {object}", { object });
    }
  })
  .on(Update, async (ctx, update) => {
    const object = await update.getObject();
    if (isActor(object)) {
      await onAccountUpdated(ctx, update);
    } else if (isPost(object)) {
      await onPostUpdated(ctx, update);
    } else {
      inboxLogger.debug("Unsupported object on Update: {object}", { object });
    }
  })
  .on(Delete, async (ctx, del) => {
    const actorId = del.actorId;
    const objectId = del.objectId;
    if (actorId == null || objectId == null) return;
    if (objectId.href === actorId.href) {
      await onAccountDeleted(ctx, del);
    } else {
      await onPostDeleted(ctx, del);
    }
  })
  .on(Move, onAccountMoved)
  .on(Undo, async (ctx, undo) => {
    const object = await undo.getObject();
    if (
      object instanceof Activity &&
      object.actorId?.href !== undo.actorId?.href
    ) {
      return;
    }
    if (object instanceof Follow) {
      await onUnfollowed(ctx, undo);
    } else if (object instanceof Like) {
      await onUnliked(ctx, undo);
    } else if (object instanceof Announce) {
      await onPostUnshared(ctx, undo);
    } else {
      inboxLogger.debug("Unsupported object on Undo: {object}", { object });
    }
  });

export default federation;
