import { useEffect, useMemo, useState } from "react";

type AvatarFacing = "down" | "up" | "left" | "right";

const DEFAULT_HINT = "Drop a sprite strip, then hold WASD to preview the exact in-game walk animation.";

function loadImage(file: File) {
  return new Promise<{ url: string; width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.src = url;

    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
    };

    image.onload = () => {
      cleanup();
      resolve({ url, width: image.width, height: image.height });
    };
    image.onerror = () => {
      cleanup();
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image."));
    };
  });
}

function SheetPreviewSprite({
  src,
  facing,
  moving,
}: {
  src: string;
  facing: AvatarFacing;
  moving: boolean;
}) {
  const frameClass =
    facing === "left" || facing === "right"
      ? "avatar__astronaut--side"
      : facing === "up"
        ? "avatar__astronaut--up"
        : "avatar__astronaut--down";
  const flipClass = facing === "left" ? "avatar__astronaut--flip" : "";
  const animationName = !moving
    ? "none"
    : facing === "up"
      ? "astronautWalkUp"
      : facing === "left"
        ? "astronautWalkSideLeft"
        : facing === "right"
          ? "astronautWalkSide"
          : "astronautWalkDown";

  return (
    <div
      className={["avatar__astronaut", frameClass, flipClass, moving ? "avatar__astronaut--moving" : ""]
        .filter(Boolean)
        .join(" ")}
      style={{
        ["--astronaut-frame-start" as string]: 0,
        backgroundImage: `url(${src})`,
        backgroundSize: "768px 64px",
        animationName,
        animationDuration: moving ? "0.68s" : undefined,
        animationTimingFunction: moving ? "steps(4)" : undefined,
        animationIterationCount: moving ? "infinite" : undefined,
      }}
      aria-hidden="true"
    />
  );
}

export default function SkinPreview() {
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("Nothing loaded yet");
  const [message, setMessage] = useState("Drop a sprite strip to begin.");
  const [hint, setHint] = useState(DEFAULT_HINT);
  const [facing, setFacing] = useState<AvatarFacing>("down");
  const [moving, setMoving] = useState(false);
  const [sheetSize, setSheetSize] = useState<{ width: number; height: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!["w", "a", "s", "d"].includes(key)) return;
      event.preventDefault();
      setMoving(true);
      if (key === "w") setFacing("up");
      if (key === "a") setFacing("left");
      if (key === "s") setFacing("down");
      if (key === "d") setFacing("right");
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!["w", "a", "s", "d"].includes(key)) return;
      setMoving(false);
    };

    const onBlur = () => setMoving(false);

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (sheetUrl) {
        URL.revokeObjectURL(sheetUrl);
      }
    };
  }, [sheetUrl]);

  const loadSheet = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage("That file is not an image.");
      setHint("Use a PNG, WebP, or JPG sprite strip.");
      return;
    }

    try {
      const loaded = await loadImage(file);
      if (sheetUrl) {
        URL.revokeObjectURL(sheetUrl);
      }
      setSheetUrl(loaded.url);
      setFileName(file.name);
      setSheetSize({ width: loaded.width, height: loaded.height });
      setMessage(`${file.name} loaded.`);
      setHint("Hold WASD to switch direction. The sprite stays centered just like the game.");
    } catch {
      setMessage("Could not load that image.");
      setHint("Try another sprite strip.");
    }
  };

  const stats = useMemo(() => {
    if (!sheetSize) return null;
    return `${sheetSize.width} x ${sheetSize.height}`;
  }, [sheetSize]);

  return (
    <main className="skin-preview skin-preview--simple">
      <section className="skin-preview__hero">
        <div className="skin-preview__copy">
          <p className="eyebrow">Sprite strip previewer</p>
          <h1>Drop a skin strip, press WASD, and inspect the exact in-game animation.</h1>
          <p>
            This uses the same sheet-driven animation pattern as the game: the sprite stays centered,
            WASD only changes facing, and the walk loop plays in place.
          </p>
        </div>
        <div className="skin-preview__meta">
          <div>
            <span>Status</span>
            <strong>{message}</strong>
          </div>
          <div>
            <span>Hint</span>
            <strong>{hint}</strong>
          </div>
          <div>
            <span>File</span>
            <strong>{fileName}</strong>
          </div>
          <div>
            <span>Sheet size</span>
            <strong>{stats ?? "-"}</strong>
          </div>
        </div>
      </section>

      <section
        className="skin-preview__workspace skin-preview__workspace--simple"
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={async (event) => {
          event.preventDefault();
          setDragActive(false);
          const file = event.dataTransfer.files?.[0];
          if (file) {
            await loadSheet(file);
          }
        }}
      >
        <div className={`skin-preview__stage ${dragActive ? "drag-active" : ""}`}>
          <div className="skin-preview__character">
            <div className={`avatar skin-preview__avatar ${moving ? "avatar--moving" : ""}`}>
              <div className="avatar__shadow" />
              {sheetUrl ? (
                <SheetPreviewSprite src={sheetUrl} facing={facing} moving={moving} />
              ) : (
                <div className="avatar__astronaut avatar__astronaut--down skin-preview__placeholder" />
              )}
              <div className="avatar__aura" />
            </div>
          </div>
          <div className="skin-preview__overlay">
            <strong>{moving ? `${facing.toUpperCase()} walking` : `${facing.toUpperCase()} idle`}</strong>
            <span>WASD changes direction. Release keys to stop moving.</span>
          </div>
        </div>

        <aside className="skin-preview__panel">
          <label className="skin-preview__dropzone">
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) {
                  await loadSheet(file);
                }
              }}
            />
            <strong>Drop or choose a sprite strip</strong>
            <span>PNG, WebP, JPG. Use the same sheet format you use in game.</span>
          </label>
          <div className="skin-preview__controls skin-preview__controls--simple">
            <div className="skin-preview__control-chip">Facing: {facing.toUpperCase()}</div>
            <div className="skin-preview__control-chip">Moving: {moving ? "Yes" : "No"}</div>
            <div className="skin-preview__control-chip">Centered preview</div>
            <div className="skin-preview__control-chip">Same animation classes as game</div>
          </div>
          <p className="skin-preview__footnote">
            If the strip still looks wrong, it usually means the frame order or spacing in the sheet does not match the game layout.
          </p>
        </aside>
      </section>
    </main>
  );
}
