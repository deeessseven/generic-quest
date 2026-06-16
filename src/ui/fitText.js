// Shrink one or more Phaser Text objects to a UNIFORM font size so the widest one fits maxWidth.
//
// Hero names, weapon names and save-slot lines all come from user-editable gametext, so a fixed
// font size can overflow its column and overlap the neighbouring text. This scales the text down
// (never up) — stepping every supplied object to the same size — until the widest fits, or minSize
// is reached. Pass a single Text or an array; falsy entries are ignored.
//
// Same idiom already used inline for the dungeon floor title (DungeonScene), generalised here.
export function fitTextWidth(texts, maxWidth, baseSize, minSize = 12) {
  const arr = (Array.isArray(texts) ? texts : [texts]).filter(Boolean);
  if (!arr.length || maxWidth <= 0) return;
  let size = baseSize;
  while (size > minSize && arr.some((t) => t.width > maxWidth)) {
    size -= 1;
    arr.forEach((t) => t.setFontSize(size));
  }
}
