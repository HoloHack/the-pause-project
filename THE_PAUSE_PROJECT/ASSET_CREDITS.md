# Visual asset credits and media provenance

## Locally generated editorial artwork

- `public/images/hold-the-moment.webp` — Original generated artwork: luminous pause symbol suspended in a glass device between reaching hands; produced specifically for this project (compressed WebP).
- `public/images/human-connection.webp` — Original generated artwork: a transparent smartphone, floating threads and two gestures of human connection; produced specifically for this project (compressed WebP).

These artworks are illustrative metaphors. They are not photographs of real bullying incidents.

## Real-world photography (remote, with local fallback)

1. **Bastian Ragas** — *A person sits alone, looking at their phone* — [Unsplash source](https://unsplash.com/photos/a-person-sits-alone-looking-at-their-phone-kuO_zfsWJHs). Used in Recognise. Image served from `images.unsplash.com/photo-1741847356184-b2f9ee5267a8`.
2. **Vitaly Gariev** — *Friends share and enjoy a smartphone together* — [Unsplash source](https://unsplash.com/photos/friends-share-and-enjoy-a-smartphone-together-paOdk3T1-gI). Used in Intervene. Image served from `images.unsplash.com/photo-1753351056802-24fd2345dc2b`.
3. **Kristijan Arsov** — *Two friends share a warm, friendly hug* — [Unsplash source](https://unsplash.com/photos/two-friends-share-a-warm-friendly-hug-n96gnRav4Ww). Used in Support. Image served from `images.unsplash.com/photo-1743442682054-6b44279e8527`.

Source pages label these free images as usable under the [Unsplash License](https://unsplash.com/license), which allows re-use. Credits are displayed in the site despite the license not requiring them. Real photo subjects are illustrative, not case studies or alleged victims/perpetrators.

Only `images.unsplash.com` is allowed externally by `img-src`. If external photographs fail to load, the JS image error handler swaps each one for local original artwork. Because this environment blocks external image requests, live image delivery was not verified here.
