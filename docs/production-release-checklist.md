# Production Release Checklist

Checklist này dùng trước khi phát hành `golden image` cho cửa hàng.

## 1. Base Image

- dùng đúng `Raspberry Pi OS (64-bit) Desktop`
- ghi lại version base image
- SSH đã bật
- user kiosk đã xác nhận
- timezone mặc định đúng

## 2. Pi Mẫu

- Pi 5 boot ổn định
- auto-login desktop hoạt động
- Chromium kiosk tự mở
- không cần bàn phím hoặc chuột để vận hành bình thường

## 3. App Và Kiosk

- `pnpm install` chạy thành công
- `pnpm run build:kiosk` thành công
- `scripts/pi/install-kiosk.sh` chạy thành công
- `sony-showcase-provision.service` đã enable
- local fallback server chạy được
- cloud URL mở được
- local fallback URL mở được

## 4. Camera Và Media

- `v4l2-ctl --list-devices` nhìn thấy Sony USB Livestream
- app tự nhận camera Sony
- rút/cắm lại camera vẫn tự reconnect
- tutorial carousel 11-15 autoplay ổn
- kiosk audio behavior đã xác nhận

## 5. Hiệu Năng

- boot vào kiosk trong ngưỡng chấp nhận
- không có hiện tượng drop frame nghiêm trọng
- Chromium flags / GPU mode đã xác nhận
- log Chromium không có lỗi blocker

## 6. Config Và Fleet

- `config/device.template.json` đã cập nhật
- `showcase-device.json` mẫu đã kiểm tra
- store config cho từng cửa hàng đã tạo nếu cần
- endpoint đăng ký thiết bị đã cấu hình nếu dùng

## 7. Golden Image

- shutdown Pi mẫu sạch trước khi clone image
- image đã version hóa
- có checksum nếu cần
- có bản rollback image gần nhất

## 8. Bộ File Phát Hành

- golden image
- Raspberry Pi Imager
- quick start cho nhân viên cửa hàng
- release notes
- file config theo cửa hàng

## 9. Kiểm Tra Trước Khi Ship

- có mạng
- mất mạng
- reboot
- rút/cắm lại camera
- mở kiosk sau boot đầu tiên

## 10. Ký Nhận

- người xác nhận kỹ thuật:
- ngày giờ xác nhận:
- version phát hành:
