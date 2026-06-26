# Ore Acres Audio Drop-ins

## Tutorial voiceover

Place the final voiceover file here:

```text
public/audio/tutorial-voiceover.mp3
```

The game already points to `/audio/tutorial-voiceover.mp3`. If the file is missing, the tutorial still works and shows the scripted voiceover line for each step.

## Suggested cue timing

Use `tutorial-script.txt` as the recording script. The current tutorial expects one combined voiceover file with these cue starts:

- Step 1: `0s`
- Step 2: `8s`
- Step 3: `18s`
- Step 4: `30s`
- Step 5: `42s`
- Step 6: `54s`
- Step 7: `66s`
- Step 8: `78s`

Small timing differences are fine. If the final recording uses different cue starts, update `TUTORIAL_STEPS` in `src/App.tsx`.

## Music

The current game uses a tiny WebAudio chiptune loop so there is no licensing dependency. If you later want a real music file, place it in this folder and swap the `Music` button to play that file instead of the synth.
