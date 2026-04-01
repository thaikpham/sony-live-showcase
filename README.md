# Sony Livestream Showcase

Standalone Vite + React app cho chế độ Livestream Showcase được tách khỏi `sony-wiki-dev-main`.

## Local

```bash
pnpm install
pnpm dev
pnpm run typecheck
pnpm build
pnpm preview --host 127.0.0.1 --port 4174
```

## Env

- `VITE_MAIN_APP_URL`: base URL của web chính để flow thoát Showcase quay về `.../livestream`

Ví dụ local:

```bash
VITE_MAIN_APP_URL=http://127.0.0.1:5173
```

## E2E

```bash
pnpm run e2e:install
pnpm run e2e
```

Smoke test bao gồm:

- load app standalone ở `/`
- verify carousel video tutorial 11-15 dùng một YouTube player host duy nhất
- verify phím `Escape` quay về `/livestream` của main app
