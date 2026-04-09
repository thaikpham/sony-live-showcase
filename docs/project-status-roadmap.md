# Project Status And Roadmap

Tài liệu này tóm tắt những gì đã hoàn thành trong repo và những hạng mục còn lại trước khi hệ thống kiosk được coi là production-ready ở quy mô nhiều cửa hàng.

## Đã Hoàn Thành

### 1. App kiosk runtime

- thêm `?kiosk=1` để bật zero-touch booth mode
- thêm `?debug=1` để mở debug/control mode cho kỹ thuật viên
- khoá hành vi `Escape` khi chạy kiosk để tránh thoát ngoài ý muốn
- lưu trạng thái kiosk vào local storage:
  - preferred camera
  - last boot
  - last camera live
  - YouTube audio fallback state

### 2. Camera auto-connect

- tự enumerate camera khi vào kiosk
- ưu tiên Sony USB Livestream / Sony UVC theo label
- tự ghi nhớ source Sony đã live thành công
- tự reconnect khi `devicechange`
- giảm phụ thuộc vào picker thủ công trong booth mode

### 3. YouTube tutorial carousel

- sửa autoplay cho các slide tutorial 11-15
- tránh bị chuyển slide sớm bằng duration riêng theo clip
- thêm nhánh xử lý audio autoplay trong kiosk
- fallback về muted khi browser policy không cho autoplay có tiếng

### 4. Hiệu năng kiosk trên app

- hạ budget cho background/ambient effects ở kiosk mode
- giảm animation/particle churn cho Pi
- giữ layout showroom nhưng cắt bớt tải runtime khi video/camera chạy

### 5. Bộ script Raspberry Pi

- audit baseline Pi:
  - [scripts/pi/check-pi-baseline.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/check-pi-baseline.sh)
- Chromium kiosk launcher:
  - [scripts/pi/kiosk-launcher.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/kiosk-launcher.sh)
- session prep:
  - [scripts/pi/prepare-kiosk-session.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/prepare-kiosk-session.sh)
- local fallback server:
  - [scripts/pi/start-local-showcase.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/start-local-showcase.sh)
- installer:
  - [scripts/pi/install-kiosk.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/install-kiosk.sh)

### 6. Fleet / mass deployment foundation

- config template theo thiết bị:
  - [config/device.template.json](/home/thaikpham/Documents/sony-live-showcase/config/device.template.json)
- helper đọc config:
  - [scripts/pi/showcase-config.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/showcase-config.sh)
- first-boot provisioning:
  - [scripts/pi/provision-first-boot.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/provision-first-boot.sh)
- device registration metadata:
  - [scripts/pi/register-device.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/register-device.sh)
- remote update flow:
  - [scripts/pi/update-kiosk.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/update-kiosk.sh)
- generate store config:
  - [scripts/pi/prepare-store-config.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/prepare-store-config.sh)
- generate production release bundle:
  - [scripts/pi/prepare-release-bundle.sh](/home/thaikpham/Documents/sony-live-showcase/scripts/pi/prepare-release-bundle.sh)

### 7. Documentation

- quick start cho Pi:
  - [README.md](/home/thaikpham/Documents/sony-live-showcase/README.md)
- mass deployment:
  - [docs/pi-mass-deployment.md](/home/thaikpham/Documents/sony-live-showcase/docs/pi-mass-deployment.md)
- staff guide:
  - [docs/quick-start-store-staff.md](/home/thaikpham/Documents/sony-live-showcase/docs/quick-start-store-staff.md)
- production checklist:
  - [docs/production-release-checklist.md](/home/thaikpham/Documents/sony-live-showcase/docs/production-release-checklist.md)
- release notes template:
  - [docs/release-notes-template.md](/home/thaikpham/Documents/sony-live-showcase/docs/release-notes-template.md)
- release bundle guide:
  - [docs/production-release-bundle.md](/home/thaikpham/Documents/sony-live-showcase/docs/production-release-bundle.md)

## Chưa Hoàn Thành

### 1. Golden image thực tế

Repo đã sẵn sàng để hỗ trợ quy trình golden image, nhưng vẫn chưa có:

- một Pi mẫu đã cài và test thật
- một `golden image` chính thức đã clone ra từ Pi mẫu
- một release package production thực tế đã upload

### 2. Xác thực trên phần cứng Pi 5 thật

Chưa chốt bằng test thực địa:

- boot time thực tế trên Raspberry Pi 5
- behavior của Chromium sau reboot thật
- độ ổn định của camera Sony USB Livestream trên phần cứng cửa hàng
- GPU mode tối ưu cuối cùng giữa `auto`, `x11`, và `wayland`

### 3. Audio autoplay production validation

Code đã có logic xử lý, nhưng vẫn cần test thực tế trên kiosk hardware:

- audible autoplay có hoạt động ổn định với policy/flags hiện tại không
- nếu không, quyết định chuẩn production có phải luôn chấp nhận muted fallback hay không

### 4. Fleet backend tuỳ chọn

Đã có chỗ để gắn `registration.endpoint_url`, nhưng chưa có:

- dashboard quản lý kiosk
- backend nhận đăng ký thiết bị
- health check / heartbeat tập trung
- job cập nhật hàng loạt có điều phối

### 5. Factory / imaging workflow

Hiện đã có tài liệu và script hỗ trợ, nhưng chưa có một quy trình factory hoàn chỉnh như:

- checklist cụ thể cho người tạo image
- nơi lưu checksum chính thức của image
- convention đặt tên version release cố định
- quy trình rollback image chuẩn hoá

## Roadmap Đề Xuất

### Phase 1: Pi mẫu production

Mục tiêu:

- dựng một Pi 5 mẫu hoàn chỉnh
- cài kiosk theo quick start
- xác nhận camera Sony, autoplay, fallback local, reboot

Đầu ra:

- một Pi mẫu đã test xong
- một `config/device.json` chuẩn
- log baseline thực tế từ `pnpm run kiosk:audit:pi`

### Phase 2: Golden image v1

Mục tiêu:

- clone `golden image` đầu tiên từ Pi mẫu
- tạo bộ release folder hoàn chỉnh bằng `pnpm run kiosk:prepare-release`
- thêm `showcase-device.json` cho 1-2 cửa hàng pilot

Đầu ra:

- `golden image v1`
- release notes v1
- quick start cho nhân viên cửa hàng

### Phase 3: Pilot store rollout

Mục tiêu:

- triển khai thử ở một vài cửa hàng
- ghi nhận lỗi boot, mạng, camera, audio, nhiệt độ, và hiệu năng

Đầu ra:

- danh sách lỗi thực địa
- tune lại kiosk flags nếu cần
- chốt chính sách muted/audible autoplay production

### Phase 4: Fleet operations

Mục tiêu:

- chuẩn hoá update từ xa
- chuẩn hoá naming của image và config
- nếu cần, thêm backend quản lý kiosk

Đầu ra:

- release process ổn định
- rollback process rõ ràng
- tài liệu vận hành cho đội kỹ thuật và đội cửa hàng

## Việc Nên Làm Ngay

1. Flash `Raspberry Pi OS (64-bit) Desktop` lên thẻ mới.
2. Dựng một Pi 5 mẫu.
3. Chạy quick start trong [README.md](/home/thaikpham/Documents/sony-live-showcase/README.md).
4. Test thật camera Sony USB Livestream.
5. Tạo `golden image v1`.
