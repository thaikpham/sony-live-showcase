# Raspberry Pi Mass Deployment

Tài liệu này dành cho mô hình triển khai nhiều kiosk Sony Showcase ở nhiều cửa hàng.

## Mục tiêu

- tránh cài tay từng Raspberry Pi bằng bàn phím và chuột
- dùng một `golden image` duy nhất cho nhiều thiết bị
- cho phép mỗi Pi tự nhận `hostname`, `device_id`, `store_id`, URL kiosk, và tùy chọn update khác nhau
- hỗ trợ update từ xa sau khi máy đã được giao tới cửa hàng

## OS chuẩn cho toàn bộ fleet

Chuẩn hoá trên một bản duy nhất:

- `Raspberry Pi OS (64-bit) Desktop`
- không dùng `Lite`
- không dùng `Full`

Lý do:

- kiosk cần desktop và Chromium, nên `Lite` không phù hợp
- `Full` tăng tải và thêm package không cần thiết
- `Desktop 64-bit` là mức cân bằng tốt nhất cho Pi 5 kiosk

Quy tắc triển khai:

1. mọi thẻ mới phải được flash base image này trước
2. chỉ sau đó mới thêm kiosk provisioning hoặc dùng thẻ đó làm Pi mẫu để tạo `golden image`
3. toàn bộ cửa hàng nên giữ cùng một major OS để dễ support

## Mô hình đề xuất

1. flash `Raspberry Pi OS (64-bit) Desktop` lên một thẻ mẫu
2. dựng một Raspberry Pi mẫu từ thẻ đó
3. clone repo và cài kiosk đầy đủ trên Pi mẫu
4. bật auto-login desktop, SSH, và xác nhận kiosk boot ổn
5. chép file config cửa hàng vào `config/device.json` hoặc `showcase-device.json` trên boot partition
6. tạo `golden image`
7. flash hàng loạt từ image đó

## File config thiết bị

Mẫu file nằm tại [config/device.template.json](/home/thaikpham/Documents/sony-live-showcase/config/device.template.json).
Script tạo config nhanh nằm tại [scripts/pi/prepare-store-config.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/prepare-store-config.sh).
Script tạo bundle phát hành nằm tại [scripts/pi/prepare-release-bundle.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/prepare-release-bundle.sh).

Các key chính:

- `device_id`: mã kiosk duy nhất
- `store_id`: mã cửa hàng
- `hostname`: hostname của Pi
- `install_user`: user desktop chạy Chromium kiosk
- `timezone`: timezone của thiết bị
- `kiosk.cloud_url`: URL cloud ưu tiên
- `kiosk.local_url`: URL local fallback
- `kiosk.graphics_mode`: `auto`, `x11`, `wayland`, hoặc `none`
- `kiosk.enable_pi_gpu_flags`: bật/tắt bộ GPU flags tối ưu cho Pi
- `update.mode`: hiện hỗ trợ `git`
- `update.git_remote`: remote Git để update
- `update.git_branch`: branch dùng cho kiosk
- `registration.endpoint_url`: endpoint tùy chọn để đăng ký thiết bị

## Boot override config

`provision-first-boot.sh` sẽ tự tìm override config tại một trong các path:

- `/boot/firmware/showcase-device.json`
- `/boot/showcase-device.json`
- `/boot/firmware/sony-showcase-device.json`
- `/boot/sony-showcase-device.json`

Nếu tìm thấy, script sẽ copy file đó vào `config/device.json` trong repo rồi áp dụng cấu hình.

Điều này rất hữu ích cho mass deployment:

1. flash cùng một image cho mọi Pi
2. trước khi giao hàng, chép file `showcase-device.json` khác nhau cho từng cửa hàng vào boot partition
3. khi Pi boot, service provisioning sẽ tự áp cấu hình đúng cho máy đó
4. nhân viên chỉ cần cắm thẻ và cấp nguồn

## Các script chính

- [provision-first-boot.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/provision-first-boot.sh)
  - áp boot override config
  - set hostname / timezone
  - bật SSH nếu cấu hình cho phép
  - tự repair kiosk user files nếu bị thiếu
  - chạy đăng ký thiết bị
- [register-device.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/register-device.sh)
  - thu thập `device_id`, `store_id`, serial, model, hostname, IP, MAC
  - ghi ra state JSON cục bộ
  - có thể POST tới endpoint nếu cấu hình
- [update-kiosk.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/update-kiosk.sh)
  - `git fetch/pull`
  - `pnpm install`
  - `pnpm run build:kiosk`
  - restart local fallback service
- [prepare-store-config.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/prepare-store-config.sh)
  - tạo `showcase-device.json` theo từng cửa hàng
  - giúp đóng gói nhanh bộ file production
- [prepare-release-bundle.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/prepare-release-bundle.sh)
  - dựng sẵn cấu trúc thư mục production release
  - copy các tài liệu cần thiết vào đúng chỗ

## Quy trình dựng golden image

### 1. Flash base image lên thẻ trắng

Trên máy chuẩn bị thẻ:

1. mở `Raspberry Pi Imager`
2. chọn `Raspberry Pi OS (64-bit) Desktop`
3. cấu hình trước khi ghi:
   - username: user vận hành kiosk, ví dụ `vdk`
   - SSH: bật
   - Wi-Fi: điền sẵn nếu cửa hàng dùng Wi-Fi
   - timezone: `Asia/Ho_Chi_Minh`
4. ghi image lên thẻ

### 2. Chuẩn bị Pi mẫu

Trên Pi mẫu:

```bash
git clone <your-repo-url> ~/sony-livestream-showcase
cd ~/sony-livestream-showcase
cp config/device.template.json config/device.json
```

Sửa `config/device.json` thành một bản template chung cho hệ thống.

### 3. Cài kiosk

```bash
pnpm install
pnpm run build:kiosk
SHOWCASE_INSTALL_USER=vdk SHOWCASE_POLICY_DIR=/etc/chromium/policies/managed sudo bash scripts/pi/install-kiosk.sh
```

### 4. Kiểm tra boot

```bash
pnpm run kiosk:audit:pi
```

Xác nhận:

- Chromium kiosk tự mở
- local fallback chạy được
- camera Sony USB Livestream được nhìn thấy bởi `v4l2-ctl --list-devices`

### 5. Tạo image

Sau khi Pi mẫu đã ổn định, tắt máy và clone thẻ SD/SSD thành `golden image`.

## Provision mỗi cửa hàng

Có 2 cách.

### Cách 1: boot override file

Tạo file `showcase-device.json` cho từng cửa hàng, ví dụ:

```json
{
  "device_id": "hcm-q1-kiosk-03",
  "store_id": "hcm-q1",
  "hostname": "sony-hcm-q1-03",
  "install_user": "vdk",
  "timezone": "Asia/Ho_Chi_Minh",
  "kiosk": {
    "cloud_url": "https://sony-livestream-showcase.vercel.app/?kiosk=1",
    "local_url": "http://127.0.0.1:4174/?kiosk=1",
    "graphics_mode": "auto",
    "enable_pi_gpu_flags": true,
    "extra_flags": ""
  },
  "update": {
    "mode": "git",
    "git_remote": "origin",
    "git_branch": "main"
  }
}
```

Chép file đó vào boot partition trước khi giao máy.

Hoặc tạo nhanh bằng lệnh:

```bash
pnpm run kiosk:prepare-config -- hcm-q1 03
```

Lệnh này sẽ sinh file trong `dist/store-configs/`.

### Cách 2: provision qua SSH

Từ máy dev:

```bash
rsync -av config/device.template.json vdk@192.168.1.234:~/sony-live-showcase/config/device.json
ssh -tt vdk@192.168.1.234 'cd ~/sony-live-showcase && sudo SHOWCASE_INSTALL_USER=vdk bash scripts/pi/provision-first-boot.sh'
```

## Update từ xa

Trên Pi:

```bash
cd ~/sony-live-showcase
pnpm run kiosk:update:pi
```

Qua SSH từ máy dev:

```bash
ssh -tt vdk@192.168.1.234 'cd ~/sony-live-showcase && pnpm run kiosk:update:pi'
```

Nếu muốn browser relaunch sau update:

```bash
ssh -tt vdk@192.168.1.234 'cd ~/sony-live-showcase && SHOWCASE_RESTART_BROWSER=1 pnpm run kiosk:update:pi'
```

## Trạng thái lưu cục bộ

- `config/device.json`: config hiện hành của kiosk
- `~/.cache/sony-showcase/chromium-kiosk.log`: log Chromium kiosk
- `~/.config/systemd/user/sony-showcase-local.service`: local fallback service
- `/var/lib/sony-showcase/device-registration.json` hoặc `~/.local/state/sony-showcase/device-registration.json`: thông tin đăng ký thiết bị

## Khuyến nghị vận hành

- dùng một branch ổn định riêng cho cửa hàng, ví dụ `release/kiosk`
- ghi rõ version base image Pi OS đang dùng trong checklist vận hành
- image hàng loạt chỉ nên chứa `dist/`, scripts, config template, và service đã kiểm tra kỹ
- giữ SSH bật sẵn để hỗ trợ từ xa
- phát hành kèm:
  - [docs/quick-start-store-staff.md](/home/thaikpham/Documents/sony-live-showcase/docs/quick-start-store-staff.md)
  - [docs/production-release-checklist.md](/home/thaikpham/Documents/sony-live-showcase/docs/production-release-checklist.md)
  - [docs/release-notes-template.md](/home/thaikpham/Documents/sony-live-showcase/docs/release-notes-template.md)
  - [docs/production-release-bundle.md](/home/thaikpham/Documents/sony-live-showcase/docs/production-release-bundle.md)
- trước khi ship, test 3 tình huống:
  - có mạng
  - mất mạng
  - cắm/rút lại camera Sony USB Livestream
