# Contribuire

Apri issue o pull request sul repository. Descrivi il comportamento atteso e quello osservato senza email, JWT o foto di persone. Installa con pnpm e verifica `pnpm check`, `pnpm test`, `pnpm build`.

Aggiungi traduzioni in entrambe le lingue. Non cambiare gli identificativi dei piatti o riutilizzarli per nuove pietanze; proponi alias e migrazioni additive. Le modifiche alle regole devono avere test sul SQL e non solo sul frontend. Non usare l'orologio del browser come autorità e non allargare policy RLS/storage.

I test SQL usano PostgreSQL WASM locale PGlite, senza account o chiavi. Non includere dati reali nel seed. Per nuove migrazioni verificare anche un'istanza Supabase locale/staging prima di applicarle alla produzione. Non eseguire reset di un database reale.

Licenza MIT; inviando contributi accetti che il codice sia distribuito con questa licenza.
