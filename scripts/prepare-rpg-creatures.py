from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-source/rpg-creatures"
OUTPUT = ROOT / "public/assets/rpg/creatures"


def clear_cell_backgrounds(image: Image.Image, frame_size: int) -> Image.Image:
    cleaned = image.convert("RGBA")
    pixels = cleaned.load()
    for cell_y in range(cleaned.height // frame_size):
        for cell_x in range(cleaned.width // frame_size):
            origin_x = cell_x * frame_size
            origin_y = cell_y * frame_size
            background = pixels[origin_x, origin_y][:3]
            for y in range(origin_y, origin_y + frame_size):
                for x in range(origin_x, origin_x + frame_size):
                    if pixels[x, y][:3] == background:
                        pixels[x, y] = (*background, 0)
    return cleaned


def gif_frames(path: Path) -> list[Image.Image]:
    image = Image.open(path)
    frames: list[Image.Image] = []
    for frame_index in range(getattr(image, "n_frames", 1)):
        image.seek(frame_index)
        frames.append(image.convert("RGBA").copy())
    return frames


def build_horizontal_sheet(frames: list[Image.Image]) -> Image.Image:
    if not frames:
        raise ValueError("Cannot build an empty creature sheet")
    width, height = frames[0].size
    if any(frame.size != (width, height) for frame in frames):
        raise ValueError("Creature animation frames must share one canvas size")
    sheet = Image.new("RGBA", (width * len(frames), height))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * width, 0))
    return sheet


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    wolf = Image.open(SOURCE / "wolfpack.png")
    clear_cell_backgrounds(wolf, 32).save(OUTPUT / "wolfpack.png")
    Image.open(SOURCE / "slime-sheet.png").convert("RGBA").save(OUTPUT / "slime.png")
    rat_frames = gif_frames(SOURCE / "rat-idle.gif") + gif_frames(SOURCE / "rat-walk.gif")
    build_horizontal_sheet(rat_frames).save(OUTPUT / "field-rat.png")
    print(f"Prepared creature sheets in {OUTPUT}")


if __name__ == "__main__":
    main()
