# Life Sanctuary Church Three.js Slideshow

## Run

Start a static server from this folder, then open the local URL:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Add Slides

Add a new `.html` file inside `slides/`.

Use a numeric prefix to control order:

```text
slides/04-new-announcement.html
```

The app auto-discovers `.html` files in `slides/` when the static server exposes directory listings. If your host does not expose directory listings, add the new path to `fallbackSlides` in `app.js`.

Most slides can be simple:

```html
<div>
  <p class="eyebrow mb-3">Announcement</p>
  <h2>Your slide title</h2>
  <p>Your slide message.</p>
  <div class="accent-bar"></div>
</div>
```

The app loads each HTML fragment, extracts headings, paragraphs, `.time-pill`, and `.bank-table` rows, then renders them as Three.js `CanvasTexture` panels in a 3D carousel.

Use:

- `h1` for a centered hero slide.
- `.eyebrow` for small uppercase section text.
- `h2` for a normal slide title.
- `p` for body text.
- `.time-pill` for short highlighted details.
- `.bank-table`, `.bank-row`, and `.bank-cell` for table slides.

`styles.css` now mainly controls the page shell and navigation controls; the slides themselves are drawn in Three.js.
