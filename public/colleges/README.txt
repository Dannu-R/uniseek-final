Drop college photos in this folder. The Stats showcase (app/components/Stats.js)
looks for these exact filenames — until a file exists, that slide shows a
gradient placeholder with the college name.

  stanford.jpg      — Stanford
  mit.jpg           — MIT
  harvard.jpg       — Harvard
  berkeley.jpg      — UC Berkeley
  princeton.jpg     — Princeton
  columbia.jpg      — Columbia
  cornell.jpg       — Cornell
  duke.jpg          — Duke
  georgia-tech.jpg  — Georgia Tech
  michigan.jpg      — University of Michigan
  nyu.jpg           — NYU
  ucla.jpg          — UCLA

Notes:
- Landscape images work best (the tile is wide and ~260–420px tall, object-fit: cover).
- To add/rename/remove colleges, edit the COLLEGES array in app/components/Stats.js.
- .jpg is expected; if you use .png/.webp, update the `src` paths in that array.
