# Prove di Weekly Menu

Servono a controllare il salvataggio e la sincronizzazione (`archivio.js`) senza toccare il vero GitHub.
Non fanno parte dell'app: il telefono non le scarica.

## Test automatici

Dalla cartella del repository, con Node 18 o più recente:

```
node prove/test-archivio.js
```

Provano l'unione delle modifiche e la sincronizzazione con un finto GitHub in memoria: primo collegamento, telefono nuovo,
modifiche da due dispositivi, conflitti, invii incrociati, token rifiutato, troppe richieste, ripristino, repository vuoto,
file rovinato. Alla fine scrivono quante prove sono riuscite.

## Prova nel browser

```
node prove/finto-github.js 8767
```

Apre l'app su http://127.0.0.1:8767 insieme a un finto GitHub. Per collegarla, nella console del browser:

```
localStorage.setItem('wm1:api-prova', location.origin + '/finto-github')
```

poi ricarica e, nelle Impostazioni, usa il token di prova `token-di-prova`. L'app usa il finto GitHub solo su localhost
o 127.0.0.1: sul sito pubblicato parla sempre con il vero GitHub.

Comandi del finto GitHub (POST), utili durante le prove:

- `/finto-github/_prova/reset`: repository con il solo README
- `/finto-github/_prova/token?ok=0`: rifiuta il token (`ok=1` per riaccettarlo)
- `/finto-github/_prova/limite?n=1`: risponde "troppe richieste"
- `/finto-github/_prova/scrivi`: modifica dei file come da un altro dispositivo, con corpo `{"files": {"percorso": "testo"}, "message": "..."}`
- `/finto-github/_prova/stato` (GET): file e commit attuali
