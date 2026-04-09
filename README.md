# Sony Livestream Showcase

Standalone Vite + React app cho chế độ Livestream Showcase được tách khỏi `sony-wiki-dev-main`.

## Raspberry Pi Quick Start

Phần này là flow ngắn nhất để deploy từ máy dev của bạn sang Raspberry Pi mới reset.

Tài liệu đầy đủ cho triển khai hàng loạt nằm tại [docs/pi-mass-deployment.md](/home/thaikpham/Documents/sony-live-showcase/docs/pi-mass-deployment.md).
Tài liệu handoff cho cửa hàng nằm tại [docs/quick-start-store-staff.md](/home/thaikpham/Documents/sony-live-showcase/docs/quick-start-store-staff.md).
Checklist phát hành nằm tại [docs/production-release-checklist.md](/home/thaikpham/Documents/sony-live-showcase/docs/production-release-checklist.md).
Mẫu release notes nằm tại [docs/release-notes-template.md](/home/thaikpham/Documents/sony-live-showcase/docs/release-notes-template.md).
Tài liệu bundle phát hành nằm tại [docs/production-release-bundle.md](/home/thaikpham/Documents/sony-live-showcase/docs/production-release-bundle.md).

### OS chuẩn cho kiosk

Chọn duy nhất một bản OS chuẩn cho toàn bộ hệ thống:

- `Raspberry Pi OS (64-bit) Desktop`
- không dùng `Lite`
- không dùng `Full`

Lý do:

- `Lite` không có desktop/browser sẵn nên không hợp kiosk Chromium
- `Full` nặng hơn cần thiết cho booth
- `Desktop 64-bit` là điểm cân bằng tốt nhất cho Pi 5: đủ desktop + Chromium, nhưng vẫn gọn hơn Full

Quy tắc vận hành:

1. tất cả thẻ mới tinh phải được flash `Raspberry Pi OS (64-bit) Desktop` trước
2. sau khi đã có base image này, mới chèn kiosk provisioning hoặc tạo `golden image`
3. không đổi major OS lung tung giữa các đợt rollout

### Chuẩn bị

Giả định:

- máy dev hiện tại có repo tại `/home/thaikpham/Documents/sony-live-showcase`
- Raspberry Pi có IP `192.168.1.234`
- user SSH trên Pi là `vdk`
- Pi đã bật SSH và có quyền `sudo`
- Pi đang dùng `Raspberry Pi OS (64-bit) Desktop`

### Bước 0: flash base image lên thẻ trắng

Nếu thẻ microSD hoàn toàn mới hoặc vừa format xong:

1. mở `Raspberry Pi Imager`
2. chọn `Raspberry Pi OS (64-bit) Desktop`
3. ghi image đó lên thẻ
4. bật các tùy chọn trước khi ghi nếu có:
   - username: `vdk`
   - SSH: bật
   - Wi-Fi: điền sẵn nếu cần
   - timezone: `Asia/Ho_Chi_Minh`
5. cắm thẻ vào Pi và boot lần đầu
6. sau khi Pi lên mạng, tiếp tục từ Bước 1 bên dưới

Nếu bạn đã có một Pi chạy từ thẻ đó rồi thì bỏ qua bước này.

### Bước 1: kiểm tra SSH từ máy dev

Chạy trên máy dev:

```bash
ssh -v vdk@192.168.1.234
```

Nếu vào được Pi thì thoát ra bằng `exit` rồi làm bước tiếp.

### Bước 2: copy repo sang Pi

Chạy trên máy dev:

```bash
rsync -av --progress /home/thaikpham/Documents/sony-live-showcase/ vdk@192.168.1.234:~/sony-live-showcase/
```

### Bước 3: cài toàn bộ dependency hệ thống trên Pi

Chạy trên máy dev:

```bash
ssh -tt vdk@192.168.1.234 'set -eux; sudo apt-get update; sudo apt-get install -y curl ca-certificates git chromium-browser v4l-utils x11-xserver-utils mesa-utils'
```

### Bước 4: cài Node.js LTS và pnpm trên Pi

Chạy trên máy dev:

```bash
ssh -tt vdk@192.168.1.234 'set -eux; command -v node >/dev/null 2>&1 || (curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs); export PATH="$HOME/.local/share/pnpm:$PATH"; command -v pnpm >/dev/null 2>&1 || curl -fsSL https://get.pnpm.io/install.sh | sh -'
```

### Bước 5: build app và cài kiosk service

Chạy trên máy dev:

```bash
ssh -tt vdk@192.168.1.234 'set -eux; export PATH="$HOME/.local/share/pnpm:$PATH"; cd ~/sony-live-showcase && pnpm install && pnpm run build:kiosk && SHOWCASE_INSTALL_USER=vdk SHOWCASE_POLICY_DIR=/etc/chromium/policies/managed sudo bash scripts/pi/install-kiosk.sh && pnpm run kiosk:audit:pi'
```

### Bước 6: reboot Pi

Chạy trên máy dev:

```bash
ssh -tt vdk@192.168.1.234 'sudo reboot'
```

### Bước 7: kiểm tra kiosk sau reboot

Chạy trên máy dev:

```bash
ssh vdk@192.168.1.234 'echo "== session =="; echo "XDG_SESSION_TYPE=${XDG_SESSION_TYPE:-unset}"; echo "DISPLAY=${DISPLAY:-unset}"; echo "WAYLAND_DISPLAY=${WAYLAND_DISPLAY:-unset}"; echo; echo "== kiosk service =="; systemctl --user --no-pager --full status sony-showcase-local.service || true; echo; echo "== camera =="; command -v v4l2-ctl >/dev/null 2>&1 && v4l2-ctl --list-devices || echo "v4l2-ctl missing"; echo; echo "== chromium log =="; tail -n 80 ~/.cache/sony-showcase/chromium-kiosk.log 2>/dev/null || echo "no kiosk log yet"'
```

### Kết quả mong đợi

- Pi tự mở Chromium kiosk sau khi vào desktop
- kiosk ưu tiên mở `https://sony-livestream-showcase.vercel.app/?kiosk=1`
- nếu cloud lỗi, kiosk fallback sang `http://127.0.0.1:4174/?kiosk=1`
- `v4l2-ctl --list-devices` thấy Sony USB Livestream nếu camera đã cắm
- về sau có thể dùng chính thẻ/Pi mẫu này để tạo `golden image`

## Local

```bash
pnpm install
pnpm dev
pnpm run typecheck
pnpm build
pnpm preview --host 127.0.0.1 --port 4174
```

## Runtime Flags

- `?kiosk=1`: bật booth zero-touch cho Raspberry Pi.
- `?debug=1`: mở control/debug mode cho kỹ thuật viên mà không tắt kiosk flow.

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
- verify `?kiosk=1` tự ẩn source picker và auto-connect Sony USB camera mock
- verify `Escape` không thoát khi booth đang chạy kiosk mode
- verify `?debug=1` bật control panel trong kiosk

## Raspberry Pi Kiosk

### App behavior

- kiosk mode tự boot vào `?kiosk=1`, tự quét camera Sony USB Livestream, tự reconnect khi source bị rút/cắm lại.
- app lưu `preferred camera fingerprint`, `last boot`, `last camera live`, và `tutorial audio degraded to muted` trong local storage của profile kiosk.
- khi YouTube autoplay audio không lên được trong kiosk, player sẽ tự reload một lần rồi persist fallback sang muted để carousel vẫn tiếp tục chạy.
- launcher và installer có thể đọc config theo thiết bị từ `config/device.json`.

### Repo scripts

```bash
pnpm run build:kiosk
pnpm run kiosk:local
pnpm run kiosk:audit:pi
pnpm run kiosk:install
pnpm run kiosk:prepare-config -- <store-id> [kiosk-number]
pnpm run kiosk:prepare-release -- <release-id>
pnpm run kiosk:provision:pi
pnpm run kiosk:register:pi
pnpm run kiosk:update:pi
```

- `scripts/pi/check-pi-baseline.sh`: thu thập OS/Chromium/session/camera baseline trên Pi.
- `scripts/pi/start-local-showcase.sh`: serve bản `dist/` tại `http://127.0.0.1:4174`.
- `scripts/pi/kiosk-launcher.sh`: probe Vercel trước, fallback local nếu cloud timeout, rồi chạy Chromium kiosk trong vòng lặp watchdog.
- `scripts/pi/prepare-kiosk-session.sh`: best-effort tắt blanking/DPMS cho session hiện tại.
- `scripts/pi/install-kiosk.sh`: best-effort cài `v4l-utils`, local fallback service, và autostart entry cho desktop user trên Pi.
- `scripts/pi/prepare-store-config.sh`: sinh nhanh `showcase-device.json` theo từng cửa hàng từ template.
- `scripts/pi/prepare-release-bundle.sh`: dựng sẵn bộ thư mục production release để upload lên Google Drive hoặc chia sẻ nội bộ.
- `scripts/pi/provision-first-boot.sh`: áp config cửa hàng, set hostname/timezone, repair kiosk files, và đăng ký thiết bị.
- `scripts/pi/register-device.sh`: tạo metadata cục bộ của kiosk và có thể POST lên endpoint quản trị nếu được cấu hình.
- `scripts/pi/update-kiosk.sh`: update repo, build lại kiosk, và restart local fallback service.
- `scripts/pi/showcase-config.sh`: helper đọc config từ `config/device.json`.

### Suggested Pi setup flow

Flow chuẩn khi làm việc với thẻ trắng:

1. flash `Raspberry Pi OS (64-bit) Desktop`
2. boot Pi lần đầu
3. dùng Quick Start ở đầu README để cài kiosk vào Pi mẫu
4. test boot / camera / fallback
5. clone thẻ đó thành `golden image` cho rollout hàng loạt

```bash
pnpm install
pnpm run build:kiosk
pnpm run kiosk:audit:pi
SHOWCASE_POLICY_DIR=/etc/chromium/policies/managed sudo bash scripts/pi/install-kiosk.sh
```

Sau đó:

1. reboot Pi.
2. xác nhận Chromium tự mở `https://sony-livestream-showcase.vercel.app/?kiosk=1`.
3. rút mạng và reboot lại để xác nhận fallback sang `http://127.0.0.1:4174/?kiosk=1`.
4. cắm/rút lại Sony USB Livestream để xác nhận app tự reconnect.

### Device config

- file mẫu nằm tại [config/device.template.json](/home/thaikpham/Documents/sony-live-showcase/config/device.template.json)
- để áp config cố định cho một máy, copy file mẫu thành `config/device.json`
- để mass deployment dễ hơn, có thể chép `showcase-device.json` vào boot partition; script provisioning sẽ tự copy nó vào `config/device.json`

Ví dụ:

```bash
cp config/device.template.json config/device.json
pnpm run kiosk:prepare-config -- hcm-q1 03
pnpm run kiosk:prepare-release -- 2026-04-09-kiosk-release
```

Các key quan trọng:

- `device_id`
- `store_id`
- `hostname`
- `install_user`
- `timezone`
- `kiosk.cloud_url`
- `kiosk.local_url`
- `kiosk.graphics_mode`
- `kiosk.enable_pi_gpu_flags`
- `update.git_remote`
- `update.git_branch`
- `registration.endpoint_url`

Ghi chú cho `install-kiosk.sh`:

- trên Raspberry Pi OS / Debian, script sẽ best-effort cài:
  - `v4l-utils`
  - `x11-xserver-utils`
  - `mesa-utils`
  - `curl`
- khi chạy bằng `sudo`, script sẽ cố gắng cài kiosk vào desktop user từ `SUDO_USER`
- nếu cần chỉ định user rõ ràng:

```bash
SHOWCASE_INSTALL_USER=pi SHOWCASE_POLICY_DIR=/etc/chromium/policies/managed sudo bash scripts/pi/install-kiosk.sh
```

- nếu không muốn script tự cài apt dependencies:

```bash
SHOWCASE_INSTALL_APT_DEPS=0 bash scripts/pi/install-kiosk.sh
```

### Mass deployment

Nếu bạn triển khai nhiều kiosk ở nhiều cửa hàng:

1. dựng một Pi mẫu và cài kiosk đầy đủ
2. dùng [docs/pi-mass-deployment.md](/home/thaikpham/Documents/sony-live-showcase/docs/pi-mass-deployment.md) để tạo `golden image`
3. mỗi máy chỉ cần khác file `showcase-device.json` hoặc `config/device.json`
4. khi boot, `sony-showcase-provision.service` sẽ tự áp cấu hình và đăng ký metadata thiết bị
5. về sau update từ xa bằng `pnpm run kiosk:update:pi`

### Chromium kiosk flags / GPU setup

- launcher mặc định đã bật các flag kiosk/media cần thiết:
  - `--autoplay-policy=no-user-gesture-required`
  - `--use-fake-ui-for-media-stream`
  - `--ignore-gpu-blocklist`
  - `--enable-gpu-rasterization`
  - `--enable-zero-copy`
  - `--enable-native-gpu-memory-buffers`
- launcher cũng tự chọn nền hiển thị theo session:
  - Wayland: `--ozone-platform=wayland --enable-features=UseOzonePlatform`
  - X11: `--ozone-platform=x11`
- log Chromium kiosk được ghi tại `~/.cache/sony-showcase/chromium-kiosk.log`

Nếu cần ép mode thủ công trên Pi:

```bash
SHOWCASE_GRAPHICS_MODE=x11 bash scripts/pi/kiosk-launcher.sh
SHOWCASE_GRAPHICS_MODE=wayland bash scripts/pi/kiosk-launcher.sh
SHOWCASE_ENABLE_PI_GPU_FLAGS=0 bash scripts/pi/kiosk-launcher.sh
SHOWCASE_EXTRA_FLAGS="--disable-gpu-vsync" bash scripts/pi/kiosk-launcher.sh
```

Khuyến nghị khi debug lag trên Raspberry Pi 5:

1. chạy `pnpm run kiosk:audit:pi`
2. thử `SHOWCASE_GRAPHICS_MODE=x11` nếu session Wayland bị drop frame
3. nếu Chromium crash hoặc đen màn hình, thử `SHOWCASE_ENABLE_PI_GPU_FLAGS=0`
4. xem log tại `~/.cache/sony-showcase/chromium-kiosk.log`

### Chromium policy

- file mẫu nằm tại [scripts/pi/sony-showcase.policy.json](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/sony-showcase.policy.json)
- policy này whitelist quyền camera cho cả cloud URL và local fallback URL
