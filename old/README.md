# old

`1621543152/`: an earlier version of the site, kept as it was. Its scripts
(`js/`), background photos (`images/`), and the icon sizes only it linked
(`fav/`) now live inside it; its absolute `/images/` and root icon paths are
as it wrote them.

`macroquad/`: a small WebAssembly toy (a word on a receding grid) that the
earlier index showed and the current index does not.

`cards.less`: the card stylesheet the index used to load as LESS and compile in
the browser with less.js from a CDN. Every visit fetched a compiler and showed
unstyled markup until it finished. `css/site.css` holds the same styles as
plain CSS plus the responsive fixes, and the built pages link it directly.
