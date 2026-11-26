// MyBot: URLs of the photo avatars (see @openbot/brand/mybot-photo-avatars).
import {
  MYBOT_PHOTO_AVATAR_IDS,
  type MybotPhotoAvatarId,
  mybotPhotoIdFromSeed,
} from "@openbot/brand/mybot-photo-avatars";

const files = import.meta.glob<string>("../../assets/mybot-avatars/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const URLS = new Map<string, string>(
  Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, -".webp".length), url]),
);

export function mybotPhotoUrl(id: MybotPhotoAvatarId): string | null {
  return URLS.get(id) ?? null;
}

export function mybotPhotoUrlForSeed(seed: string | null | undefined): string | null {
  const id = mybotPhotoIdFromSeed(seed);
  return id ? mybotPhotoUrl(id) : null;
}

export { MYBOT_PHOTO_AVATAR_IDS };
