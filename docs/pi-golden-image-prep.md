# Raspberry Pi OS Prep For Golden Image

Tài liệu này bắt đầu từ trạng thái:

- thẻ microSD 64GB đã format xong
- chưa có OS
- mục tiêu là dựng một Pi mẫu ổn định để chụp `golden image`

## 1. Flash Raspberry Pi OS lên thẻ

Trên máy chuẩn bị thẻ:

1. mở `Raspberry Pi Imager`
2. chọn `Raspberry Pi 5`
3. chọn OS: `Raspberry Pi OS (64-bit) Desktop`
4. chọn đúng thẻ microSD 64GB
5. bấm `Next` rồi vào phần custom settings trước khi ghi

Thiết lập khuyến nghị:

- hostname: `sony-golden-template`
- username: `vdk`
- password: đặt theo chuẩn nội bộ
- timezone: `Asia/Ho_Chi_Minh`
- keyboard layout: `us`
- SSH: bật
- Wi-Fi: điền sẵn nếu Pi mẫu sẽ dùng Wi-Fi

Không chọn:

- `Lite`
- `Full`

Sau đó bấm `Write` để ghi OS vào thẻ.

## 2. Boot Pi mẫu lần đầu

Sau khi flash xong:

1. cắm thẻ vào Raspberry Pi
2. cắm màn hình, mạng, nguồn
3. chờ Pi boot vào desktop
4. xác nhận SSH dùng được

Nếu cần kiểm tra từ máy dev:

```bash
ssh vdk@<pi-ip>
```

## 3. Copy repo và cài kiosk

Chạy từ máy dev:

```bash
rsync -av --progress /home/thaikpham/Documents/sony-live-showcase/ vdk@<pi-ip>:~/sony-live-showcase/
```

Sau đó chạy trên Pi qua SSH:

```bash
ssh -tt vdk@<pi-ip> 'set -eux; sudo apt-get update; sudo apt-get install -y curl ca-certificates git chromium-browser v4l-utils x11-xserver-utils mesa-utils'
```

```bash
ssh -tt vdk@<pi-ip> 'set -eux; command -v node >/dev/null 2>&1 || (curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs); export PATH="$HOME/.local/share/pnpm:$PATH"; command -v pnpm >/dev/null 2>&1 || curl -fsSL https://get.pnpm.io/install.sh | sh -'
```

```bash
ssh -tt vdk@<pi-ip> 'set -eux; export PATH="$HOME/.local/share/pnpm:$PATH"; cd ~/sony-live-showcase && cp -n config/device.template.json config/device.json && pnpm install && pnpm run build:kiosk && SHOWCASE_INSTALL_USER=vdk SHOWCASE_POLICY_DIR=/etc/chromium/policies/managed sudo bash scripts/pi/install-kiosk.sh && pnpm run kiosk:audit:pi'
```

## 4. Chuẩn hoá Pi mẫu trước khi chụp image

Mục tiêu ở bước này là tạo ra một máy mẫu đủ generic để nhân bản.

Nên giữ trong `config/device.json`:

- `hostname`: `sony-golden-template`
- `device_id`: giá trị template, ví dụ `store-001-kiosk-01`
- `store_id`: giá trị template
- `timezone`: `Asia/Ho_Chi_Minh`

Không hard-code thông tin riêng từng cửa hàng vào image mẫu nếu bạn định rollout hàng loạt.

Thay vào đó, sau này hãy tạo file riêng cho từng cửa hàng bằng:

```bash
pnpm run kiosk:prepare-config -- <store-id> [kiosk-number]
```

và chép file sinh ra vào boot partition với tên:

- `showcase-device.json`

`provision-first-boot.sh` sẽ tự copy file này vào `config/device.json` khi máy boot lần đầu.

## 5. Kiểm tra trước khi tạo golden image

Trên Pi mẫu, xác nhận các điều sau:

- boot vào desktop bình thường
- Chromium kiosk tự mở
- app ưu tiên cloud URL
- khi mất mạng, app fallback sang `http://127.0.0.1:4174/?kiosk=1`
- `v4l2-ctl --list-devices` nhìn thấy Sony USB Livestream nếu camera đã cắm
- SSH vẫn truy cập được

Lệnh kiểm tra nhanh:

```bash
ssh vdk@<pi-ip> 'echo "== session =="; echo "XDG_SESSION_TYPE=${XDG_SESSION_TYPE:-unset}"; echo "DISPLAY=${DISPLAY:-unset}"; echo "WAYLAND_DISPLAY=${WAYLAND_DISPLAY:-unset}"; echo; echo "== kiosk service =="; systemctl --user --no-pager --full status sony-showcase-local.service || true; echo; echo "== camera =="; command -v v4l2-ctl >/dev/null 2>&1 && v4l2-ctl --list-devices || echo "v4l2-ctl missing"; echo; echo "== chromium log =="; tail -n 80 ~/.cache/sony-showcase/chromium-kiosk.log 2>/dev/null || echo "no kiosk log yet"'
```

## 6. Tắt máy và chụp golden image

Khi Pi mẫu đã ổn định:

1. shutdown Pi sạch sẽ
2. tháo thẻ microSD
3. dùng máy imaging để clone thẻ thành file `golden image`

Tên file gợi ý:

- `sony-showcase-golden-image-YYYY-MM-DD.img.xz`

## 7. Provision từng cửa hàng từ image chung

Sau khi đã có `golden image`:

1. flash image đó ra thẻ mới
2. mount boot partition
3. chép file `showcase-device.json` riêng cho từng kiosk vào boot partition
4. giao máy cho cửa hàng

Kiosk sẽ tự:

- áp `hostname`
- áp `device_id`
- áp `store_id`
- bật SSH nếu config cho phép
- đăng ký thiết bị nếu có endpoint

## Ghi chú quan trọng

- Với thẻ 65GB, dung lượng là ổn cho `Desktop 64-bit` và local fallback build.
- Nếu muốn image clone nhanh hơn, chỉ cài đúng những gì kiosk cần trên Pi mẫu.
- Đừng chụp `golden image` trước khi test ít nhất 1 lần cả online lẫn offline fallback.
