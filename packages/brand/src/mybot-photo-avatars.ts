// MyBot: the photo avatars that new agents get by default, in place of the generated plush.
// A photo is stored as the agent's avatar seed ("mybot-photo:<id>"), so no schema change is needed
// and agents made before keep their plush. The images are in packages/ui/src/assets/mybot-avatars.

export const MYBOT_PHOTO_AVATAR_IDS = [
  "nam1",
  "nu1",
  "nam2",
  "nu2",
  "nam3",
  "nu3",
  "nam4",
  "nu4",
  "nam5",
  "nu5",
  "nam6",
  "nu6",
  "nam7",
  "nu7",
  "nam8",
  "nu8",
  "nam9",
  "nu9",
  "nam10",
  "nu10",
  "nu11",
] as const;

export type MybotPhotoAvatarId = (typeof MYBOT_PHOTO_AVATAR_IDS)[number];

const SEED_PREFIX = "mybot-photo:";
export function mybotPhotoSeed(id: MybotPhotoAvatarId): string {
  return `${SEED_PREFIX}${id}`;
}

export function mybotPhotoIdFromSeed(seed: string | null | undefined): MybotPhotoAvatarId | null {
  if (!seed?.startsWith(SEED_PREFIX)) return null;
  const id = seed.slice(SEED_PREFIX.length);
  return MYBOT_PHOTO_AVATAR_IDS.find((photo) => photo === id) ?? null;
}

export function randomMybotPhotoSeed(random: () => number = Math.random, except?: string): string {
  const choices = MYBOT_PHOTO_AVATAR_IDS.filter((id) => mybotPhotoSeed(id) !== except);
  const index = Math.min(choices.length - 1, Math.floor(random() * choices.length));
  return mybotPhotoSeed(choices[index] ?? "nam1");
}

// The photo that a key (such as an agent ID) always maps to.
export function mybotPhotoSeedForKey(key: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index++) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return mybotPhotoSeed(MYBOT_PHOTO_AVATAR_IDS[(hash >>> 0) % MYBOT_PHOTO_AVATAR_IDS.length] ?? "nam1");
}
