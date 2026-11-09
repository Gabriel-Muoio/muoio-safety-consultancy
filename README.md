# Muoio Safety Consultancy website

This is the maintainable source for the Muoio Safety Consultancy website.

## Adding an article

1. Duplicate `content/articles/_article-template.md`.
2. Change the details between the two `---` lines.
3. Replace the article text beneath them.
4. Set `draft: false` when the article is ready to appear publicly.
5. Commit the file to GitHub. GitHub Pages rebuilds the website automatically.

Article cards are ordered by `date`, newest first. The page URL comes from the file name.

The normal article text uses Markdown:

- Leave a blank line between paragraphs.
- Start a section heading with `## `.
- Use `*italic*` and `**bold**` when needed.
- Start a quotation with `> `.

The files in `base/` hold the established homepage, resource pages, Faith section, images and styles. `templates/article.html` holds the article design. They generally do not need to be touched when adding an article.

Faith articles work the same way through `content/faith/`. The foundational article remains permanently featured; newer Faith articles appear beneath it in their own catalogue.

## Previewing locally

Run:

```sh
npm install
npm run build
npm run serve
```

Then open <http://127.0.0.1:4174>.

## Publishing

Changes committed to the `main` branch are checked, built and published by the workflow in `.github/workflows/pages.yml`.
