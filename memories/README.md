# memories/

Drop your photos here and update the MEMORIES array in script.js.

Supported formats: .jpg  .jpeg  .png  .webp

Each entry in the array looks like:

  {
    src:         'memories/photo1.jpg',   // path relative to index.html
    alt:         'Short image description for screen readers',
    caption:     'Caption on the front of the polaroid',
    note:        'The handwritten note shown when you flip the card over.',
    rot:         -3,                      // rotation in degrees (-8 to +8 works well)
    tapeColor:   '#e8a020',              // washi tape colour: use --marigold or --tomato
    placeholderColor: '#f0dfc0',         // shown while/if the photo is missing
  },

Add or remove entries freely. The grid reflows automatically.
